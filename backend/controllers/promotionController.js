const crypto = require('crypto');
const { pool, parseJson, withTransaction } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const { sanitizeText, validateEnum } = require('../middleware/validationMiddleware');
const {
  generatePaymentReference,
  isStripeConfigured,
  createProviderCheckoutSession
} = require('../services/paymentService');

const getAdvertisingPackages = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, code, name, placement_type, description, price, currency,
            duration_days, features_json, is_active
     FROM advertising_packages
     WHERE is_active = 1
     ORDER BY price ASC, id ASC`
  );

  res.json({
    success: true,
    payment_provider_configured: isStripeConfigured(),
    packages: rows.map((pkg) => ({
      ...pkg,
      features: parseJson(pkg.features_json, {})
    }))
  });
});

const createPromotionCampaign = asyncHandler(async (req, res) => {
  const apiId = Number(req.body.api_id);
  const packageId = Number(req.body.package_id);
  const title = sanitizeText(req.body.title, 160);
  const headline = sanitizeText(req.body.headline, 240);
  const ctaLabel = sanitizeText(req.body.cta_label, 60) || 'Explore API';
  const targetCategoryId = req.body.target_category_id ? Number(req.body.target_category_id) : null;

  if (!apiId || !packageId) {
    throw new AppError('Both api_id and package_id are required.', 400, 'MISSING_FIELDS');
  }

  const [[apiRows], [pkgRows]] = await Promise.all([
    pool.query('SELECT * FROM apis WHERE id = ? LIMIT 1', [apiId]),
    pool.query('SELECT * FROM advertising_packages WHERE id = ? AND is_active = 1 LIMIT 1', [packageId])
  ]);

  if (apiRows.length === 0) {
    throw new AppError('API listing not found.', 404, 'API_NOT_FOUND');
  }
  if (pkgRows.length === 0) {
    throw new AppError('Selected advertising package is unavailable.', 404, 'PACKAGE_NOT_FOUND');
  }

  const api = apiRows[0];
  const pkg = pkgRows[0];

  const isAuthorized =
    req.user.role === 'admin' ||
    api.owner_user_id === req.user.id ||
    api.submitted_by === req.user.id ||
    (req.user.provider_profile_id && api.provider_profile_id === req.user.provider_profile_id);

  if (!isAuthorized) {
    throw new AppError(
      'You can only promote APIs that you own or are authorized to manage.',
      403,
      'NOT_API_OWNER'
    );
  }

  if (api.status !== 'approved') {
    throw new AppError(
      'Only approved public API listings can run sponsored campaigns.',
      400,
      'API_NOT_APPROVED'
    );
  }

  const campaignTitle = title || `${api.name} — ${pkg.name}`;
  const paymentReference = generatePaymentReference('PAY-CAM');
  const provider = process.env.PAYMENT_PROVIDER || 'stripe';

  const { campaignId, paymentId } = await withTransaction(async (conn) => {
    const [campIns] = await conn.query(
      `INSERT INTO sponsored_campaigns (
        api_id, package_id, advertiser_user_id, provider_profile_id, target_category_id,
        title, headline, cta_label,
        payment_status, approval_status, campaign_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'pending', 'awaiting_payment')`,
      [
        api.id,
        pkg.id,
        req.user.id,
        req.user.provider_profile_id || api.provider_profile_id || null,
        targetCategoryId || api.category_id,
        campaignTitle,
        headline || api.short_description.slice(0, 220),
        ctaLabel
      ]
    );

    const [payIns] = await conn.query(
      `INSERT INTO payments (
        user_id, payment_for, campaign_id, payment_reference, provider,
        amount, currency, status, metadata_json
      ) VALUES (?, 'campaign', ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        req.user.id,
        campIns.insertId,
        paymentReference,
        provider,
        pkg.price,
        pkg.currency || 'USD',
        JSON.stringify({
          campaign_id: campIns.insertId,
          package_id: pkg.id,
          package_name: pkg.name,
          duration_days: pkg.duration_days,
          api_id: api.id,
          api_name: api.name
        })
      ]
    );

    return { campaignId: campIns.insertId, paymentId: payIns.insertId };
  });

  const checkout = await createProviderCheckoutSession({
    paymentReference,
    amount: pkg.price,
    currency: pkg.currency || 'USD',
    productName: `Sponsored Campaign: ${pkg.name} (${pkg.duration_days} days)`,
    productDescription: `Promote ${api.name} on API Locate`,
    customerEmail: req.user.email,
    mode: 'payment',
    successPath: '/provider/campaigns',
    cancelPath: '/provider/promote',
    metadata: {
      campaign_id: campaignId,
      payment_id: paymentId,
      user_id: req.user.id
    }
  });

  if (checkout.session_id) {
    await pool.query('UPDATE payments SET provider_session_id = ? WHERE id = ?', [
      checkout.session_id,
      paymentId
    ]);
  }

  res.status(201).json({
    success: true,
    message: checkout.provider_configured
      ? 'Campaign created. Complete payment to submit your campaign for administrator approval.'
      : 'Campaign created and awaiting verified payment. Configure Stripe keys in backend/.env for hosted checkout or verify via signed webhook.',
    campaign: {
      id: campaignId,
      api_id: api.id,
      package_id: pkg.id,
      package_name: pkg.name,
      duration_days: pkg.duration_days,
      price: pkg.price,
      currency: pkg.currency,
      payment_reference: paymentReference,
      payment_status: 'unpaid',
      approval_status: 'pending',
      campaign_status: 'awaiting_payment',
      ...checkout
    }
  });
});

const getMyCampaigns = asyncHandler(async (req, res) => {
  // Automatically expire any ended campaigns
  await pool.query(
    `UPDATE sponsored_campaigns
     SET campaign_status = 'expired'
     WHERE advertiser_user_id = ?
       AND campaign_status IN ('active', 'scheduled')
       AND ends_at IS NOT NULL
       AND ends_at <= UTC_TIMESTAMP()`,
    [req.user.id]
  );

  const [rows] = await pool.query(
    `SELECT sc.*,
            a.name AS api_name, a.slug AS api_slug, a.logo_url AS api_logo_url,
            ap.name AS package_name, ap.placement_type, ap.price AS package_price,
            ap.currency AS package_currency, ap.duration_days,
            pay.payment_reference, pay.status AS latest_payment_status
     FROM sponsored_campaigns sc
     INNER JOIN apis a ON a.id = sc.api_id
     INNER JOIN advertising_packages ap ON ap.id = sc.package_id
     LEFT JOIN payments pay ON pay.campaign_id = sc.id
     WHERE sc.advertiser_user_id = ?
     ORDER BY sc.created_at DESC`,
    [req.user.id]
  );

  res.json({
    success: true,
    campaigns: rows.map((row) => ({
      ...row,
      ctr_percent:
        row.impressions_count > 0
          ? Number(((row.clicks_count / row.impressions_count) * 100).toFixed(2))
          : 0
    }))
  });
});

const getCampaignById = asyncHandler(async (req, res) => {
  const campaignId = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT sc.*,
            a.name AS api_name, a.slug AS api_slug, a.logo_url AS api_logo_url,
            ap.name AS package_name, ap.placement_type, ap.price AS package_price,
            ap.currency AS package_currency, ap.duration_days,
            pay.payment_reference, pay.status AS payment_record_status, pay.paid_at
     FROM sponsored_campaigns sc
     INNER JOIN apis a ON a.id = sc.api_id
     INNER JOIN advertising_packages ap ON ap.id = sc.package_id
     LEFT JOIN payments pay ON pay.campaign_id = sc.id
     WHERE sc.id = ?
     LIMIT 1`,
    [campaignId]
  );

  if (rows.length === 0) {
    throw new AppError('Sponsored campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');
  }

  const campaign = rows[0];
  if (campaign.advertiser_user_id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('You do not have permission to view this campaign.', 403, 'FORBIDDEN');
  }

  const [dailyMetrics] = await pool.query(
    `SELECT DATE(created_at) AS event_date,
            SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) AS impressions,
            SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks
     FROM sponsored_campaign_events
     WHERE campaign_id = ?
     GROUP BY DATE(created_at)
     ORDER BY event_date DESC
     LIMIT 30`,
    [campaignId]
  );

  res.json({
    success: true,
    campaign: {
      ...campaign,
      ctr_percent:
        campaign.impressions_count > 0
          ? Number(((campaign.clicks_count / campaign.impressions_count) * 100).toFixed(2))
          : 0,
      daily_metrics: dailyMetrics
    }
  });
});

const getActiveSponsoredCampaigns = asyncHandler(async (req, res) => {
  await pool.query(
    `UPDATE sponsored_campaigns
     SET campaign_status = 'expired'
     WHERE campaign_status IN ('active', 'scheduled')
       AND ends_at IS NOT NULL
       AND ends_at <= UTC_TIMESTAMP()`
  );

  const placement = sanitizeText(req.query.placement, 40);
  const params = [];
  let placementFilter = '';

  if (placement && ['featured', 'spotlight', 'homepage'].includes(placement)) {
    placementFilter = 'AND ap.placement_type = ?';
    params.push(placement);
  }

  const [rows] = await pool.query(
    `SELECT sc.id AS campaign_id, sc.title AS campaign_title, sc.headline AS campaign_headline,
            sc.cta_label, sc.starts_at, sc.ends_at,
            ap.placement_type, ap.name AS package_name,
            a.id AS api_id, a.name, a.slug, a.logo_url, a.short_description,
            a.pricing_model, a.auth_type, a.verification_level, a.provider_name,
            c.name AS category_name, c.slug AS category_slug
     FROM sponsored_campaigns sc
     INNER JOIN advertising_packages ap ON ap.id = sc.package_id
     INNER JOIN apis a ON a.id = sc.api_id
     INNER JOIN categories c ON c.id = a.category_id
     WHERE sc.campaign_status = 'active'
       AND sc.approval_status = 'approved'
       AND sc.payment_status = 'paid'
       AND a.status = 'approved'
       AND (sc.starts_at IS NULL OR sc.starts_at <= UTC_TIMESTAMP())
       AND (sc.ends_at IS NULL OR sc.ends_at > UTC_TIMESTAMP())
       ${placementFilter}
     ORDER BY FIELD(ap.placement_type, 'homepage', 'spotlight', 'featured'), sc.starts_at DESC
     LIMIT 6`,
    params
  );

  res.json({
    success: true,
    sponsored_campaigns: rows.map((r) => ({
      ...r,
      is_sponsored: true,
      sponsored_label: 'Sponsored'
    }))
  });
});

const trackCampaignEvent = asyncHandler(async (req, res) => {
  const campaignId = Number(req.params.id);
  const eventType = validateEnum(req.body.event_type, ['impression', 'click'], 'Event type');
  const placement = sanitizeText(req.body.placement, 60) || 'directory';

  const [rows] = await pool.query(
    `SELECT id FROM sponsored_campaigns
     WHERE id = ? AND campaign_status = 'active' AND approval_status = 'approved'
     LIMIT 1`,
    [campaignId]
  );

  if (rows.length === 0) {
    return res.status(200).json({ success: true, recorded: false });
  }

  const rawVisitor = `${req.ip || '0.0.0.0'}:${req.headers['user-agent'] || ''}`;
  const visitorHash = crypto.createHash('sha256').update(rawVisitor).digest('hex').slice(0, 32);
  const userId = req.user ? req.user.id : null;

  await withTransaction(async (conn) => {
    await conn.query(
      `INSERT INTO sponsored_campaign_events (campaign_id, user_id, event_type, placement, visitor_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [campaignId, userId, eventType, placement, visitorHash]
    );

    if (eventType === 'click') {
      await conn.query(
        'UPDATE sponsored_campaigns SET clicks_count = clicks_count + 1 WHERE id = ?',
        [campaignId]
      );
    } else {
      await conn.query(
        'UPDATE sponsored_campaigns SET impressions_count = impressions_count + 1 WHERE id = ?',
        [campaignId]
      );
    }
  });

  res.json({ success: true, recorded: true });
});

module.exports = {
  getAdvertisingPackages,
  createPromotionCampaign,
  getMyCampaigns,
  getCampaignById,
  getActiveSponsoredCampaigns,
  trackCampaignEvent
};
