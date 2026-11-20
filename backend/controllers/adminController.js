const { pool, parseJson, withTransaction } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  sanitizeText,
  validateEnum,
  parsePagination
} = require('../middleware/validationMiddleware');
const { generateUniqueSlug, slugify } = require('../utils/slugify');
const { createNotification } = require('../services/notificationService');
const { processVerifiedWebhookEvent } = require('../services/paymentService');
const { recalculateApiRating } = require('./reviewController');

// ----------------------------------------------------------------------------
// 1. Admin Dashboard Analytics
// ----------------------------------------------------------------------------
const getDashboardAnalytics = asyncHandler(async (_req, res) => {
  const [
    [[counts]],
    [apisBySource],
    [topSearches],
    [recentModeration],
    [recentPayments]
  ] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admin_users,
        (SELECT COUNT(*) FROM provider_profiles) AS total_providers,
        (SELECT COUNT(*) FROM provider_profiles WHERE verification_status = 'pending') AS pending_providers,
        (SELECT COUNT(*) FROM apis) AS total_apis,
        (SELECT COUNT(*) FROM apis WHERE status = 'approved') AS approved_apis,
        (SELECT COUNT(*) FROM apis WHERE status = 'pending') AS pending_apis,
        (SELECT COUNT(*) FROM apis WHERE status = 'rejected') AS rejected_apis,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND (current_period_end IS NULL OR current_period_end > UTC_TIMESTAMP())) AS active_subscriptions,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded') AS total_revenue,
        (SELECT COUNT(*) FROM sponsored_campaigns WHERE campaign_status = 'active') AS active_campaigns,
        (SELECT COUNT(*) FROM sponsored_campaigns WHERE approval_status = 'pending') AS pending_campaigns,
        (SELECT COUNT(*) FROM api_reports WHERE status IN ('open', 'investigating')) AS open_reports,
        (SELECT COUNT(*) FROM api_reviews) AS total_reviews
    `),
    pool.query(`
      SELECT source_type, status, COUNT(*) AS count
      FROM apis
      GROUP BY source_type, status
    `),
    pool.query(`
      SELECT search_query, COUNT(*) AS searches, ROUND(AVG(results_count), 1) AS avg_results
      FROM api_search_logs
      WHERE search_query IS NOT NULL AND search_query != ''
      GROUP BY search_query
      ORDER BY searches DESC
      LIMIT 8
    `),
    pool.query(`
      SELECT ml.*, a.name AS api_name, a.slug AS api_slug, u.username AS moderator_username
      FROM api_moderation_logs ml
      INNER JOIN apis a ON a.id = ml.api_id
      LEFT JOIN users u ON u.id = ml.moderator_user_id
      ORDER BY ml.created_at DESC
      LIMIT 10
    `),
    pool.query(`
      SELECT p.id, p.payment_reference, p.payment_for, p.amount, p.currency, p.status, p.created_at,
             u.username, u.email
      FROM payments p
      INNER JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 8
    `)
  ]);

  res.json({
    success: true,
    overview: counts,
    apis_by_source: apisBySource,
    top_searches: topSearches,
    recent_moderation: recentModeration,
    recent_payments: recentPayments
  });
});

// ----------------------------------------------------------------------------
// 2. User Management
// ----------------------------------------------------------------------------
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const search = sanitizeText(req.query.q, 120);
  const role = sanitizeText(req.query.role, 20);

  const where = ['1=1'];
  const params = [];

  if (search) {
    where.push('(u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role && ['user', 'admin'].includes(role)) {
    where.push('u.role = ?');
    params.push(role);
  }

  const whereSql = where.join(' AND ');

  const [[[countRow]], [rows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM users u WHERE ${whereSql}`, params),
    pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.theme_preference,
              u.is_active, u.last_login_at, u.created_at,
              pp.company_name AS provider_company, pp.verification_status AS provider_status,
              (SELECT COUNT(*) FROM apis a WHERE a.submitted_by = u.id) AS submitted_apis_count,
              EXISTS(
                SELECT 1 FROM subscriptions s
                WHERE s.user_id = u.id AND s.status = 'active'
                  AND (s.current_period_end IS NULL OR s.current_period_end > UTC_TIMESTAMP())
              ) AS has_active_premium
       FROM users u
       LEFT JOIN provider_profiles pp ON pp.user_id = u.id
       WHERE ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
  ]);

  res.json({
    success: true,
    pagination: {
      page,
      limit,
      total: countRow.total,
      total_pages: Math.ceil(countRow.total / limit) || 1
    },
    users: rows.map((u) => ({
      ...u,
      is_active: Boolean(u.is_active),
      has_active_premium: Boolean(u.has_active_premium)
    }))
  });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const role = validateEnum(req.body.role, ['user', 'admin'], 'User role');

  if (targetId === req.user.id && role !== 'admin') {
    throw new AppError('You cannot remove administrator privileges from your own account.', 400, 'SELF_DEMOTE_BLOCKED');
  }

  const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);
  if (result.affectedRows === 0) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  res.json({ success: true, message: `User role updated to "${role}".` });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const isActive = Boolean(req.body.is_active);

  if (targetId === req.user.id && !isActive) {
    throw new AppError('You cannot suspend your own administrator account.', 400, 'SELF_SUSPEND_BLOCKED');
  }

  const [result] = await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [
    isActive ? 1 : 0,
    targetId
  ]);
  if (result.affectedRows === 0) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    message: isActive ? 'User account activated.' : 'User account suspended.'
  });
});

// ----------------------------------------------------------------------------
// 3. API Management & Community Moderation
// ----------------------------------------------------------------------------
const listAllApis = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const status = sanitizeText(req.query.status, 30);
  const sourceType = sanitizeText(req.query.source_type, 30);
  const search = sanitizeText(req.query.q, 150);

  const where = ['1=1'];
  const params = [];

  if (status && ['pending', 'approved', 'rejected', 'archived'].includes(status)) {
    where.push('a.status = ?');
    params.push(status);
  }
  if (sourceType && ['admin', 'community', 'imported'].includes(sourceType)) {
    where.push('a.source_type = ?');
    params.push(sourceType);
  }
  if (search) {
    where.push('(a.name LIKE ? OR a.provider_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.join(' AND ');
  const [[[countRow]], [rows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM apis a WHERE ${whereSql}`, params),
    pool.query(
      `SELECT a.*, c.name AS category_name, u.username AS submitter_username,
              s.name AS import_source_name
       FROM apis a
       INNER JOIN categories c ON c.id = a.category_id
       LEFT JOIN users u ON u.id = a.submitted_by
       LEFT JOIN api_sources s ON s.id = a.source_id
       WHERE ${whereSql}
       ORDER BY FIELD(a.status, 'pending', 'approved', 'rejected', 'archived'), a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
  ]);

  res.json({
    success: true,
    pagination: {
      page,
      limit,
      total: countRow.total,
      total_pages: Math.ceil(countRow.total / limit) || 1
    },
    apis: rows.map((a) => ({
      ...a,
      is_featured: Boolean(a.is_featured),
      is_seed_data: Boolean(a.is_seed_data)
    }))
  });
});

const listPendingApis = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT a.*, c.name AS category_name, u.username AS submitter_username, u.email AS submitter_email,
            s.name AS import_source_name
     FROM apis a
     INNER JOIN categories c ON c.id = a.category_id
     LEFT JOIN users u ON u.id = a.submitted_by
     LEFT JOIN api_sources s ON s.id = a.source_id
     WHERE a.status = 'pending'
     ORDER BY a.created_at ASC`
  );

  res.json({
    success: true,
    pending_apis: rows
  });
});

const approveApi = asyncHandler(async (req, res) => {
  const apiId = Number(req.params.id);
  const verificationLevel = validateEnum(
    req.body?.verification_level,
    ['verified', 'community_reviewed', 'unverified', 'incomplete'],
    'Verification level',
    'community_reviewed'
  );
  const notes = sanitizeText(req.body?.notes, 1000) || 'Approved by administrator.';

  await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM apis WHERE id = ? LIMIT 1 FOR UPDATE', [apiId]);
    if (rows.length === 0) {
      throw new AppError('API listing not found.', 404, 'API_NOT_FOUND');
    }
    const api = rows[0];

    await conn.query(
      `UPDATE apis
       SET status = 'approved',
           verification_level = ?,
           rejection_reason = NULL,
           published_at = COALESCE(published_at, UTC_TIMESTAMP())
       WHERE id = ?`,
      [verificationLevel, apiId]
    );

    await conn.query(
      `INSERT INTO api_moderation_logs (api_id, moderator_user_id, action, previous_status, new_status, notes)
       VALUES (?, ?, 'approved', ?, 'approved', ?)`,
      [apiId, req.user.id, api.status, notes]
    );

    if (api.submitted_by) {
      await createNotification(conn, {
        userId: api.submitted_by,
        type: 'api_approved',
        title: `API Approved: ${api.name}`,
        message: `Great news! Your API submission "${api.name}" has been approved and is now live in the directory.`,
        linkUrl: `/apis/${api.slug}`
      });
    }
  });

  res.json({ success: true, message: 'API submission approved and published.' });
});

const rejectApi = asyncHandler(async (req, res) => {
  const apiId = Number(req.params.id);
  const reason = sanitizeText(req.body?.reason, 1000);
  if (!reason) {
    throw new AppError('Please provide a rejection reason for the submitter.', 400, 'REASON_REQUIRED');
  }

  await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM apis WHERE id = ? LIMIT 1 FOR UPDATE', [apiId]);
    if (rows.length === 0) {
      throw new AppError('API listing not found.', 404, 'API_NOT_FOUND');
    }
    const api = rows[0];

    await conn.query(
      "UPDATE apis SET status = 'rejected', rejection_reason = ? WHERE id = ?",
      [reason, apiId]
    );

    await conn.query(
      `INSERT INTO api_moderation_logs (api_id, moderator_user_id, action, previous_status, new_status, notes)
       VALUES (?, ?, 'rejected', ?, 'rejected', ?)`,
      [apiId, req.user.id, api.status, reason]
    );

    if (api.submitted_by) {
      await createNotification(conn, {
        userId: api.submitted_by,
        type: 'api_rejected',
        title: `Submission Update: ${api.name}`,
        message: `Your API submission "${api.name}" was not approved: ${reason}`,
        linkUrl: '/dashboard'
      });
    }
  });

  res.json({ success: true, message: 'API submission rejected.' });
});

// ----------------------------------------------------------------------------
// 4. Category & Tag CRUD
// ----------------------------------------------------------------------------
const listAdminCategories = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*, COUNT(a.id) AS total_apis
     FROM categories c
     LEFT JOIN apis a ON a.category_id = c.id
     GROUP BY c.id
     ORDER BY c.display_order ASC, c.name ASC`
  );
  res.json({
    success: true,
    categories: rows.map((c) => ({ ...c, is_active: Boolean(c.is_active) }))
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const name = sanitizeText(req.body.name, 100);
  if (!name) throw new AppError('Category name is required.', 400, 'NAME_REQUIRED');

  const slug = await generateUniqueSlug(pool, 'categories', name);
  const description = sanitizeText(req.body.description, 1000);
  const icon = sanitizeText(req.body.icon, 80) || 'folder';
  const displayOrder = Number(req.body.display_order || 0);
  const isActive = req.body.is_active !== false ? 1 : 0;

  const [ins] = await pool.query(
    `INSERT INTO categories (name, slug, description, icon, display_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, slug, description, icon, displayOrder, isActive]
  );

  const [created] = await pool.query('SELECT * FROM categories WHERE id = ?', [ins.insertId]);
  res.status(201).json({ success: true, message: 'Category created.', category: created[0] });
});

const updateCategory = asyncHandler(async (req, res) => {
  const catId = Number(req.params.id);
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ? LIMIT 1', [catId]);
  if (rows.length === 0) throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');

  const cur = rows[0];
  const name = sanitizeText(req.body.name, 100) || cur.name;
  const slug =
    name !== cur.name ? await generateUniqueSlug(pool, 'categories', name, catId) : cur.slug;
  const description =
    req.body.description !== undefined ? sanitizeText(req.body.description, 1000) : cur.description;
  const icon = req.body.icon !== undefined ? sanitizeText(req.body.icon, 80) : cur.icon;
  const displayOrder =
    req.body.display_order !== undefined ? Number(req.body.display_order) : cur.display_order;
  const isActive =
    req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : cur.is_active;

  await pool.query(
    `UPDATE categories
     SET name = ?, slug = ?, description = ?, icon = ?, display_order = ?, is_active = ?
     WHERE id = ?`,
    [name, slug, description, icon, displayOrder, isActive, catId]
  );

  const [updated] = await pool.query('SELECT * FROM categories WHERE id = ?', [catId]);
  res.json({ success: true, message: 'Category updated.', category: updated[0] });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const catId = Number(req.params.id);
  const [[usage]] = await pool.query('SELECT COUNT(*) AS count FROM apis WHERE category_id = ?', [catId]);
  if (usage.count > 0) {
    throw new AppError(
      `Cannot delete category while ${usage.count} API(s) reference it. Reassign those APIs or deactivate the category instead.`,
      400,
      'CATEGORY_IN_USE'
    );
  }
  await pool.query('DELETE FROM categories WHERE id = ?', [catId]);
  res.json({ success: true, message: 'Category deleted.' });
});

const listAdminTags = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT t.*, COUNT(at.api_id) AS usage_count
     FROM tags t
     LEFT JOIN api_tags at ON at.tag_id = t.id
     GROUP BY t.id
     ORDER BY usage_count DESC, t.name ASC`
  );
  res.json({ success: true, tags: rows });
});

const createTag = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim().toLowerCase().slice(0, 80);
  if (!name) throw new AppError('Tag name is required.', 400, 'NAME_REQUIRED');
  const slug = slugify(name);

  const [ins] = await pool.query('INSERT INTO tags (name, slug) VALUES (?, ?)', [name, slug]);
  const [created] = await pool.query('SELECT * FROM tags WHERE id = ?', [ins.insertId]);
  res.status(201).json({ success: true, message: 'Tag created.', tag: created[0] });
});

const updateTag = asyncHandler(async (req, res) => {
  const tagId = Number(req.params.id);
  const name = String(req.body.name || '').trim().toLowerCase().slice(0, 80);
  if (!name) throw new AppError('Tag name is required.', 400, 'NAME_REQUIRED');
  const slug = slugify(name);

  await pool.query('UPDATE tags SET name = ?, slug = ? WHERE id = ?', [name, slug, tagId]);
  const [updated] = await pool.query('SELECT * FROM tags WHERE id = ?', [tagId]);
  res.json({ success: true, message: 'Tag updated.', tag: updated[0] });
});

const deleteTag = asyncHandler(async (req, res) => {
  const tagId = Number(req.params.id);
  await pool.query('DELETE FROM tags WHERE id = ?', [tagId]);
  res.json({ success: true, message: 'Tag deleted.' });
});

// ----------------------------------------------------------------------------
// 5. Provider Management
// ----------------------------------------------------------------------------
const listAdminProviders = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT pp.*, u.username, u.email,
            (SELECT COUNT(*) FROM apis a WHERE a.provider_profile_id = pp.id) AS apis_count
     FROM provider_profiles pp
     INNER JOIN users u ON u.id = pp.user_id
     ORDER BY FIELD(pp.verification_status, 'pending', 'verified', 'unverified', 'rejected'), pp.created_at DESC`
  );
  res.json({ success: true, providers: rows });
});

const verifyProviderProfile = asyncHandler(async (req, res) => {
  const providerId = Number(req.params.id);
  const status = validateEnum(
    req.body.verification_status,
    ['verified', 'rejected', 'unverified', 'pending'],
    'Verification status'
  );

  const [rows] = await pool.query('SELECT * FROM provider_profiles WHERE id = ? LIMIT 1', [providerId]);
  if (rows.length === 0) throw new AppError('Provider profile not found.', 404, 'PROVIDER_NOT_FOUND');

  await pool.query(
    `UPDATE provider_profiles
     SET verification_status = ?,
         verified_at = CASE WHEN ? = 'verified' THEN UTC_TIMESTAMP() ELSE NULL END,
         verified_by = CASE WHEN ? = 'verified' THEN ? ELSE NULL END
     WHERE id = ?`,
    [status, status, status, req.user.id, providerId]
  );

  await createNotification(pool, {
    userId: rows[0].user_id,
    type: 'provider_verification',
    title: `Provider Profile Status: ${status.toUpperCase()}`,
    message:
      status === 'verified'
        ? `Congratulations! "${rows[0].company_name}" is now a Verified API Provider on API Locate.`
        : `Your provider profile verification status was updated to "${status}".`,
    linkUrl: '/provider/dashboard'
  });

  res.json({ success: true, message: `Provider verification set to "${status}".` });
});

// ----------------------------------------------------------------------------
// 6. Plans, Subscriptions & Payments Management
// ----------------------------------------------------------------------------
const listAdminPlans = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM plans ORDER BY price_monthly ASC');
  res.json({
    success: true,
    plans: rows.map((p) => ({
      ...p,
      is_active: Boolean(p.is_active),
      features: parseJson(p.features_json, {})
    }))
  });
});

const updatePlan = asyncHandler(async (req, res) => {
  const planId = Number(req.params.id);
  const [rows] = await pool.query('SELECT * FROM plans WHERE id = ? LIMIT 1', [planId]);
  if (rows.length === 0) throw new AppError('Plan not found.', 404, 'PLAN_NOT_FOUND');

  const cur = rows[0];
  const name = sanitizeText(req.body.name, 100) || cur.name;
  const description =
    req.body.description !== undefined ? sanitizeText(req.body.description, 1000) : cur.description;
  const priceMonthly =
    req.body.price_monthly !== undefined
      ? Math.max(0, Number(req.body.price_monthly))
      : cur.price_monthly;
  const maxFavorites =
    req.body.max_favorites !== undefined
      ? req.body.max_favorites === null || req.body.max_favorites === ''
        ? null
        : Math.max(0, Number(req.body.max_favorites))
      : cur.max_favorites;
  const isActive =
    req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : cur.is_active;
  const featuresJson =
    req.body.features !== undefined
      ? JSON.stringify(req.body.features)
      : typeof cur.features_json === 'string'
      ? cur.features_json
      : JSON.stringify(cur.features_json || {});

  await pool.query(
    `UPDATE plans
     SET name = ?, description = ?, price_monthly = ?, max_favorites = ?, features_json = ?, is_active = ?
     WHERE id = ?`,
    [name, description, priceMonthly, maxFavorites, featuresJson, isActive, planId]
  );

  const [updated] = await pool.query('SELECT * FROM plans WHERE id = ?', [planId]);
  res.json({
    success: true,
    message: 'Plan configuration updated.',
    plan: {
      ...updated[0],
      is_active: Boolean(updated[0].is_active),
      features: parseJson(updated[0].features_json, {})
    }
  });
});

const listAdminSubscriptions = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, u.username, u.email, p.name AS plan_name, p.code AS plan_code, p.price_monthly
     FROM subscriptions s
     INNER JOIN users u ON u.id = s.user_id
     INNER JOIN plans p ON p.id = s.plan_id
     ORDER BY s.created_at DESC
     LIMIT 100`
  );
  res.json({
    success: true,
    subscriptions: rows.map((s) => ({
      ...s,
      auto_renew: Boolean(s.auto_renew),
      cancel_at_period_end: Boolean(s.cancel_at_period_end)
    }))
  });
});

const listAdminPayments = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.username, u.email,
            pl.name AS plan_name,
            sc.title AS campaign_title
     FROM payments p
     INNER JOIN users u ON u.id = p.user_id
     LEFT JOIN subscriptions s ON s.id = p.subscription_id
     LEFT JOIN plans pl ON pl.id = s.plan_id
     LEFT JOIN sponsored_campaigns sc ON sc.id = p.campaign_id
     ORDER BY p.created_at DESC
     LIMIT 100`
  );
  res.json({
    success: true,
    payments: rows.map((p) => ({
      ...p,
      metadata: parseJson(p.metadata_json, {})
    }))
  });
});

const verifyManualPayment = asyncHandler(async (req, res) => {
  const paymentId = Number(req.params.id);
  const [rows] = await pool.query('SELECT * FROM payments WHERE id = ? LIMIT 1', [paymentId]);
  if (rows.length === 0) {
    throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
  }
  const payment = rows[0];
  if (payment.status === 'succeeded') {
    throw new AppError('This payment has already been verified.', 400, 'ALREADY_VERIFIED');
  }

  const outcome = await processVerifiedWebhookEvent({
    provider: 'admin_manual_audit',
    signatureVerified: true,
    eventPayload: {
      id: `admin_verify_${payment.id}_${Date.now()}`,
      type: 'payment.succeeded',
      data: {
        object: {
          payment_reference: payment.payment_reference,
          transaction_id: `MANUAL-ADMIN-${req.user.id}-${Date.now()}`
        }
      }
    }
  });

  res.json({
    success: true,
    message: `Payment ${payment.payment_reference} verified by administrator.`,
    outcome
  });
});

// ----------------------------------------------------------------------------
// 7. Advertising Packages & Campaign Moderation
// ----------------------------------------------------------------------------
const listAdminPackages = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM advertising_packages ORDER BY price ASC');
  res.json({
    success: true,
    packages: rows.map((pkg) => ({
      ...pkg,
      is_active: Boolean(pkg.is_active),
      features: parseJson(pkg.features_json, {})
    }))
  });
});

const createAdvertisingPackage = asyncHandler(async (req, res) => {
  const name = sanitizeText(req.body.name, 120);
  if (!name) throw new AppError('Package name is required.', 400, 'NAME_REQUIRED');

  const code = slugify(req.body.code || name).replace(/-/g, '_').slice(0, 60);
  const placementType = validateEnum(
    req.body.placement_type,
    ['featured', 'spotlight', 'homepage'],
    'Placement type'
  );
  const price = Math.max(0.5, Number(req.body.price || 5));
  const durationDays = Math.max(1, Number(req.body.duration_days || 7));
  const description = sanitizeText(req.body.description, 1000);
  const isActive = req.body.is_active !== false ? 1 : 0;

  const [ins] = await pool.query(
    `INSERT INTO advertising_packages
     (code, name, placement_type, description, price, currency, duration_days, features_json, is_active)
     VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, ?)`,
    [
      code,
      name,
      placementType,
      description,
      price,
      durationDays,
      JSON.stringify(req.body.features || {}),
      isActive
    ]
  );

  const [created] = await pool.query('SELECT * FROM advertising_packages WHERE id = ?', [ins.insertId]);
  res.status(201).json({ success: true, message: 'Advertising package created.', package: created[0] });
});

const updateAdvertisingPackage = asyncHandler(async (req, res) => {
  const pkgId = Number(req.params.id);
  const [rows] = await pool.query('SELECT * FROM advertising_packages WHERE id = ? LIMIT 1', [pkgId]);
  if (rows.length === 0) throw new AppError('Advertising package not found.', 404, 'PACKAGE_NOT_FOUND');

  const cur = rows[0];
  const name = sanitizeText(req.body.name, 120) || cur.name;
  const placementType =
    req.body.placement_type !== undefined
      ? validateEnum(req.body.placement_type, ['featured', 'spotlight', 'homepage'], 'Placement type')
      : cur.placement_type;
  const description =
    req.body.description !== undefined ? sanitizeText(req.body.description, 1000) : cur.description;
  const price = req.body.price !== undefined ? Math.max(0.5, Number(req.body.price)) : cur.price;
  const durationDays =
    req.body.duration_days !== undefined
      ? Math.max(1, Number(req.body.duration_days))
      : cur.duration_days;
  const isActive =
    req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : cur.is_active;

  await pool.query(
    `UPDATE advertising_packages
     SET name = ?, placement_type = ?, description = ?, price = ?, duration_days = ?, is_active = ?
     WHERE id = ?`,
    [name, placementType, description, price, durationDays, isActive, pkgId]
  );

  const [updated] = await pool.query('SELECT * FROM advertising_packages WHERE id = ?', [pkgId]);
  res.json({ success: true, message: 'Advertising package updated.', package: updated[0] });
});

const listAllCampaigns = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT sc.*, a.name AS api_name, a.slug AS api_slug,
            ap.name AS package_name, ap.placement_type, ap.duration_days, ap.price,
            u.username AS advertiser_username, u.email AS advertiser_email,
            pay.payment_reference
     FROM sponsored_campaigns sc
     INNER JOIN apis a ON a.id = sc.api_id
     INNER JOIN advertising_packages ap ON ap.id = sc.package_id
     INNER JOIN users u ON u.id = sc.advertiser_user_id
     LEFT JOIN payments pay ON pay.campaign_id = sc.id
     ORDER BY FIELD(sc.approval_status, 'pending', 'approved', 'rejected'), sc.created_at DESC
     LIMIT 100`
  );
  res.json({ success: true, campaigns: rows });
});

const listPendingCampaigns = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT sc.*, a.name AS api_name, a.slug AS api_slug,
            ap.name AS package_name, ap.placement_type, ap.duration_days, ap.price,
            u.username AS advertiser_username, u.email AS advertiser_email,
            pay.payment_reference
     FROM sponsored_campaigns sc
     INNER JOIN apis a ON a.id = sc.api_id
     INNER JOIN advertising_packages ap ON ap.id = sc.package_id
     INNER JOIN users u ON u.id = sc.advertiser_user_id
     LEFT JOIN payments pay ON pay.campaign_id = sc.id
     WHERE sc.approval_status = 'pending'
     ORDER BY FIELD(sc.payment_status, 'paid', 'unpaid', 'failed'), sc.created_at ASC`
  );
  res.json({ success: true, pending_campaigns: rows });
});

const approveCampaign = asyncHandler(async (req, res) => {
  const campaignId = Number(req.params.id);

  await withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT sc.*, ap.duration_days, a.name AS api_name
       FROM sponsored_campaigns sc
       INNER JOIN advertising_packages ap ON ap.id = sc.package_id
       INNER JOIN apis a ON a.id = sc.api_id
       WHERE sc.id = ? LIMIT 1 FOR UPDATE`,
      [campaignId]
    );

    if (rows.length === 0) {
      throw new AppError('Sponsored campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');
    }

    const camp = rows[0];
    if (camp.payment_status !== 'paid') {
      throw new AppError(
        'Cannot activate an unpaid sponsored campaign. Payment must be verified first.',
        400,
        'CAMPAIGN_UNPAID'
      );
    }

    const durationDays = Number(camp.duration_days || 7);

    await conn.query(
      `UPDATE sponsored_campaigns
       SET approval_status = 'approved',
           campaign_status = 'active',
           rejection_reason = NULL,
           reviewed_by = ?,
           reviewed_at = UTC_TIMESTAMP(),
           starts_at = COALESCE(starts_at, UTC_TIMESTAMP()),
           ends_at = COALESCE(ends_at, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))
       WHERE id = ?`,
      [req.user.id, durationDays, campaignId]
    );

    await createNotification(conn, {
      userId: camp.advertiser_user_id,
      type: 'campaign_approved',
      title: `Sponsored Campaign Live: ${camp.title}`,
      message: `Your campaign for "${camp.api_name}" has been approved and is now active for ${durationDays} days.`,
      linkUrl: '/provider/campaigns'
    });
  });

  res.json({ success: true, message: 'Sponsored campaign approved and activated.' });
});

const rejectCampaign = asyncHandler(async (req, res) => {
  const campaignId = Number(req.params.id);
  const reason = sanitizeText(req.body?.reason, 1000) || 'Does not meet sponsored listing quality guidelines.';

  await withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT * FROM sponsored_campaigns WHERE id = ? LIMIT 1 FOR UPDATE',
      [campaignId]
    );
    if (rows.length === 0) {
      throw new AppError('Sponsored campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');
    }

    await conn.query(
      `UPDATE sponsored_campaigns
       SET approval_status = 'rejected',
           campaign_status = 'rejected',
           rejection_reason = ?,
           reviewed_by = ?,
           reviewed_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [reason, req.user.id, campaignId]
    );

    await createNotification(conn, {
      userId: rows[0].advertiser_user_id,
      type: 'campaign_rejected',
      title: `Campaign Review Update: ${rows[0].title}`,
      message: `Your sponsored campaign was rejected: ${reason}`,
      linkUrl: '/provider/campaigns'
    });
  });

  res.json({ success: true, message: 'Sponsored campaign rejected.' });
});

// ----------------------------------------------------------------------------
// 8. Reviews & Reports Moderation
// ----------------------------------------------------------------------------
const listAdminReviews = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, a.name AS api_name, a.slug AS api_slug, u.username, u.email
     FROM api_reviews r
     INNER JOIN apis a ON a.id = r.api_id
     INNER JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC
     LIMIT 100`
  );
  res.json({ success: true, reviews: rows });
});

const moderateReview = asyncHandler(async (req, res) => {
  const reviewId = Number(req.params.id);
  const status = validateEnum(req.body.status, ['visible', 'hidden', 'flagged'], 'Review status');

  await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM api_reviews WHERE id = ? LIMIT 1', [reviewId]);
    if (rows.length === 0) throw new AppError('Review not found.', 404, 'REVIEW_NOT_FOUND');

    await conn.query('UPDATE api_reviews SET status = ? WHERE id = ?', [status, reviewId]);
    await recalculateApiRating(conn, rows[0].api_id);
  });

  res.json({ success: true, message: `Review visibility updated to "${status}".` });
});

const listAdminReports = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT rp.*, a.name AS api_name, a.slug AS api_slug,
            u.username AS reporter_username,
            res.username AS resolved_by_username
     FROM api_reports rp
     INNER JOIN apis a ON a.id = rp.api_id
     INNER JOIN users u ON u.id = rp.reporter_user_id
     LEFT JOIN users res ON res.id = rp.resolved_by
     ORDER BY FIELD(rp.status, 'open', 'investigating', 'resolved', 'dismissed'), rp.created_at DESC
     LIMIT 100`
  );
  res.json({ success: true, reports: rows });
});

const resolveReport = asyncHandler(async (req, res) => {
  const reportId = Number(req.params.id);
  const status = validateEnum(
    req.body.status,
    ['open', 'investigating', 'resolved', 'dismissed'],
    'Report status'
  );
  const notes = sanitizeText(req.body.resolution_notes, 2000);

  const [rows] = await pool.query('SELECT * FROM api_reports WHERE id = ? LIMIT 1', [reportId]);
  if (rows.length === 0) throw new AppError('Report not found.', 404, 'REPORT_NOT_FOUND');

  await pool.query(
    `UPDATE api_reports
     SET status = ?,
         resolution_notes = ?,
         resolved_by = CASE WHEN ? IN ('resolved', 'dismissed') THEN ? ELSE resolved_by END,
         resolved_at = CASE WHEN ? IN ('resolved', 'dismissed') THEN UTC_TIMESTAMP() ELSE resolved_at END
     WHERE id = ?`,
    [status, notes, status, req.user.id, status, reportId]
  );

  if (['resolved', 'dismissed'].includes(status)) {
    await createNotification(pool, {
      userId: rows[0].reporter_user_id,
      type: 'report_resolved',
      title: 'Your API Report Was Reviewed',
      message: notes || `An administrator marked your report as "${status}". Thank you for helping keep API Locate accurate.`,
      linkUrl: '/dashboard'
    });
  }

  res.json({ success: true, message: `Report marked as "${status}".` });
});

module.exports = {
  getDashboardAnalytics,
  listUsers,
  updateUserRole,
  updateUserStatus,
  listAllApis,
  listPendingApis,
  approveApi,
  rejectApi,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listAdminTags,
  createTag,
  updateTag,
  deleteTag,
  listAdminProviders,
  verifyProviderProfile,
  listAdminPlans,
  updatePlan,
  listAdminSubscriptions,
  listAdminPayments,
  verifyManualPayment,
  listAdminPackages,
  createAdvertisingPackage,
  updateAdvertisingPackage,
  listAllCampaigns,
  listPendingCampaigns,
  approveCampaign,
  rejectCampaign,
  listAdminReviews,
  moderateReview,
  listAdminReports,
  resolveReport
};
