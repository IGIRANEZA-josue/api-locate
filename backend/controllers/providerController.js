const { pool, withTransaction } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  sanitizeText,
  validateEmail,
  validateHttpUrl
} = require('../middleware/validationMiddleware');
const { generateUniqueSlug } = require('../utils/slugify');
const { attachTagsAndFavorites } = require('./apiController');

const listPublicProviders = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT pp.id, pp.company_name, pp.slug, pp.logo_url, pp.website_url,
            pp.description, pp.verification_status, pp.verified_at, pp.created_at,
            COUNT(a.id) AS published_apis_count
     FROM provider_profiles pp
     LEFT JOIN apis a ON a.provider_profile_id = pp.id AND a.status = 'approved'
     GROUP BY pp.id
     ORDER BY FIELD(pp.verification_status, 'verified', 'pending', 'unverified', 'rejected'),
              published_apis_count DESC, pp.company_name ASC`
  );

  res.json({
    success: true,
    providers: rows
  });
});

const getProviderByIdOrSlug = asyncHandler(async (req, res) => {
  const identifier = String(req.params.id || '').trim();
  const isNumeric = /^\d+$/.test(identifier);
  const userId = req.user ? req.user.id : null;

  const [rows] = await pool.query(
    `SELECT pp.id, pp.user_id, pp.company_name, pp.slug, pp.logo_url,
            pp.website_url, pp.contact_email, pp.description,
            pp.verification_status, pp.verified_at, pp.created_at,
            u.username AS owner_username
     FROM provider_profiles pp
     INNER JOIN users u ON u.id = pp.user_id
     WHERE ${isNumeric ? 'pp.id = ?' : 'pp.slug = ?'}
     LIMIT 1`,
    [isNumeric ? Number(identifier) : identifier]
  );

  if (rows.length === 0) {
    throw new AppError('Provider profile not found.', 404, 'PROVIDER_NOT_FOUND');
  }

  const provider = rows[0];
  const [apiRows] = await pool.query(
    `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
            pp.slug AS provider_slug, pp.verification_status AS provider_verification_status
     FROM apis a
     INNER JOIN categories c ON c.id = a.category_id
     LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
     WHERE (a.provider_profile_id = ? OR a.owner_user_id = ?)
       AND a.status = 'approved'
     ORDER BY a.average_rating DESC, a.views_count DESC`,
    [provider.id, provider.user_id]
  );

  const publishedApis = await attachTagsAndFavorites(apiRows, userId);

  res.json({
    success: true,
    provider,
    published_apis: publishedApis
  });
});

const getMyProviderDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [[profileRows], [managedApis], [campaigns]] = await Promise.all([
    pool.query('SELECT * FROM provider_profiles WHERE user_id = ? LIMIT 1', [userId]),
    pool.query(
      `SELECT a.*, c.name AS category_name, c.slug AS category_slug
       FROM apis a
       INNER JOIN categories c ON c.id = a.category_id
       WHERE a.owner_user_id = ?
          OR a.submitted_by = ?
          OR (a.provider_profile_id IS NOT NULL AND a.provider_profile_id = ?)
       ORDER BY a.created_at DESC`,
      [userId, userId, req.user.provider_profile_id || 0]
    ),
    pool.query(
      `SELECT sc.*, a.name AS api_name, a.slug AS api_slug,
              ap.name AS package_name, ap.placement_type, ap.duration_days, ap.price
       FROM sponsored_campaigns sc
       INNER JOIN apis a ON a.id = sc.api_id
       INNER JOIN advertising_packages ap ON ap.id = sc.package_id
       WHERE sc.advertiser_user_id = ?
       ORDER BY sc.created_at DESC
       LIMIT 10`,
      [userId]
    )
  ]);

  const profile = profileRows[0] || null;
  const totalViews = managedApis.reduce((acc, a) => acc + Number(a.views_count || 0), 0);
  const totalFavorites = managedApis.reduce((acc, a) => acc + Number(a.favorites_count || 0), 0);
  const totalReviews = managedApis.reduce((acc, a) => acc + Number(a.reviews_count || 0), 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + Number(c.impressions_count || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + Number(c.clicks_count || 0), 0);

  res.json({
    success: true,
    has_profile: Boolean(profile),
    profile,
    metrics: {
      managed_apis_count: managedApis.length,
      approved_apis_count: managedApis.filter((a) => a.status === 'approved').length,
      total_views: totalViews,
      total_favorites: totalFavorites,
      total_reviews: totalReviews,
      active_campaigns_count: campaigns.filter((c) => c.campaign_status === 'active').length,
      total_impressions: totalImpressions,
      total_clicks: totalClicks
    },
    managed_apis: managedApis,
    recent_campaigns: campaigns
  });
});

const createProviderProfile = asyncHandler(async (req, res) => {
  const [existing] = await pool.query(
    'SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1',
    [req.user.id]
  );

  if (existing.length > 0) {
    throw new AppError(
      'You already have a provider profile. Use PUT /api/providers/profile to update it.',
      409,
      'PROVIDER_PROFILE_EXISTS'
    );
  }

  const companyName = sanitizeText(req.body.company_name, 150);
  if (!companyName) {
    throw new AppError('Provider or company name is required.', 400, 'COMPANY_NAME_REQUIRED');
  }

  const logoUrl = validateHttpUrl(req.body.logo_url, 'Logo URL', false);
  const websiteUrl = validateHttpUrl(req.body.website_url, 'Website URL', false);
  const contactEmail = req.body.contact_email
    ? validateEmail(req.body.contact_email)
    : req.user.email;
  const description = sanitizeText(req.body.description, 3000);
  const requestVerification = req.body.request_verification !== false;

  const profileId = await withTransaction(async (conn) => {
    const slug = await generateUniqueSlug(conn, 'provider_profiles', companyName);
    const [ins] = await conn.query(
      `INSERT INTO provider_profiles
       (user_id, company_name, slug, logo_url, website_url, contact_email, description, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        companyName,
        slug,
        logoUrl,
        websiteUrl,
        contactEmail,
        description,
        requestVerification ? 'pending' : 'unverified'
      ]
    );

    // Link existing user-owned APIs to this provider profile
    await conn.query(
      `UPDATE apis
       SET provider_profile_id = ?, provider_name = ?
       WHERE owner_user_id = ? AND provider_profile_id IS NULL`,
      [ins.insertId, companyName, req.user.id]
    );

    return ins.insertId;
  });

  const [created] = await pool.query('SELECT * FROM provider_profiles WHERE id = ?', [profileId]);

  res.status(201).json({
    success: true,
    message: 'Provider profile created successfully.',
    profile: created[0]
  });
});

const updateProviderProfile = asyncHandler(async (req, res) => {
  const [existingRows] = await pool.query(
    'SELECT * FROM provider_profiles WHERE user_id = ? LIMIT 1',
    [req.user.id]
  );

  if (existingRows.length === 0) {
    throw new AppError(
      'Provider profile not found. Create one first with POST /api/providers/profile.',
      404,
      'PROVIDER_PROFILE_NOT_FOUND'
    );
  }

  const current = existingRows[0];
  const companyName = sanitizeText(req.body.company_name, 150) || current.company_name;
  const logoUrl =
    req.body.logo_url !== undefined
      ? validateHttpUrl(req.body.logo_url, 'Logo URL', false)
      : current.logo_url;
  const websiteUrl =
    req.body.website_url !== undefined
      ? validateHttpUrl(req.body.website_url, 'Website URL', false)
      : current.website_url;
  const contactEmail =
    req.body.contact_email !== undefined
      ? req.body.contact_email
        ? validateEmail(req.body.contact_email)
        : null
      : current.contact_email;
  const description =
    req.body.description !== undefined
      ? sanitizeText(req.body.description, 3000)
      : current.description;

  const slug =
    companyName !== current.company_name
      ? await generateUniqueSlug(pool, 'provider_profiles', companyName, current.id)
      : current.slug;

  let nextVerStatus = current.verification_status;
  if (req.body.request_verification && ['unverified', 'rejected'].includes(current.verification_status)) {
    nextVerStatus = 'pending';
  }

  await pool.query(
    `UPDATE provider_profiles
     SET company_name = ?, slug = ?, logo_url = ?, website_url = ?,
         contact_email = ?, description = ?, verification_status = ?
     WHERE id = ?`,
    [companyName, slug, logoUrl, websiteUrl, contactEmail, description, nextVerStatus, current.id]
  );

  const [updated] = await pool.query('SELECT * FROM provider_profiles WHERE id = ?', [current.id]);
  res.json({
    success: true,
    message: 'Provider profile updated successfully.',
    profile: updated[0]
  });
});

module.exports = {
  listPublicProviders,
  getProviderByIdOrSlug,
  getMyProviderDashboard,
  createProviderProfile,
  updateProviderProfile
};
