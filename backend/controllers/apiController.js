const { pool, parseJson, withTransaction } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  sanitizeText,
  validateHttpUrl,
  validateEnum,
  parsePagination
} = require('../middleware/validationMiddleware');
const { generateUniqueSlug, slugify } = require('../utils/slugify');
const { checkApiEndpointStatus } = require('../services/monitoringService');

const AUTH_TYPES = ['none', 'api_key', 'oauth2', 'basic', 'bearer', 'custom', 'unknown'];
const PRICING_MODELS = ['free', 'freemium', 'paid', 'contact', 'unknown'];
const CORS_VALUES = ['yes', 'no', 'unknown'];

function buildBooleanFulltextQuery(rawQuery) {
  const cleaned = String(rawQuery || '')
    .replace(/[+\-><()~*"@]+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const tokens = cleaned.split(/\s+/).filter((t) => t.length >= 2).slice(0, 8);
  if (tokens.length === 0) return '';
  return tokens.map((t) => `+${t}*`).join(' ');
}

async function attachTagsAndFavorites(apis, userId = null) {
  if (!apis || apis.length === 0) return [];
  const apiIds = apis.map((a) => a.id);

  const [tagRows] = await pool.query(
    `SELECT at.api_id, t.id, t.name, t.slug
     FROM api_tags at
     INNER JOIN tags t ON t.id = at.tag_id
     WHERE at.api_id IN (?)
     ORDER BY t.name ASC`,
    [apiIds]
  );

  const tagsByApi = new Map();
  for (const row of tagRows) {
    if (!tagsByApi.has(row.api_id)) tagsByApi.set(row.api_id, []);
    tagsByApi.get(row.api_id).push({ id: row.id, name: row.name, slug: row.slug });
  }

  let favSet = new Set();
  if (userId) {
    const [favRows] = await pool.query(
      'SELECT api_id FROM favorites WHERE user_id = ? AND api_id IN (?)',
      [userId, apiIds]
    );
    favSet = new Set(favRows.map((f) => f.api_id));
  }

  return apis.map((api) => ({
    ...api,
    https_supported: Boolean(api.https_supported),
    is_featured: Boolean(api.is_featured),
    is_seed_data: Boolean(api.is_seed_data),
    features_json: parseJson(api.features_json, {}),
    tags: tagsByApi.get(api.id) || [],
    is_favorited: favSet.has(api.id)
  }));
}

async function syncCampaignExpirations() {
  await pool.query(
    `UPDATE sponsored_campaigns
     SET campaign_status = 'expired'
     WHERE campaign_status IN ('active', 'scheduled')
       AND ends_at IS NOT NULL
       AND ends_at <= UTC_TIMESTAMP()`
  );
  await pool.query(
    `UPDATE sponsored_campaigns
     SET campaign_status = 'active'
     WHERE campaign_status = 'scheduled'
       AND approval_status = 'approved'
       AND payment_status = 'paid'
       AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP())
       AND (ends_at IS NULL OR ends_at > UTC_TIMESTAMP())`
  );
}

const getHomepageData = asyncHandler(async (req, res) => {
  await syncCampaignExpirations();
  const userId = req.user ? req.user.id : null;

  const [
    [categories],
    [featuredRows],
    [recentRows],
    [sponsoredRows],
    [[statsRow]]
  ] = await Promise.all([
    pool.query(
      `SELECT c.id, c.name, c.slug, c.description, c.icon, c.display_order,
              COUNT(a.id) AS api_count
       FROM categories c
       LEFT JOIN apis a ON a.category_id = c.id AND a.status = 'approved'
       WHERE c.is_active = 1
       GROUP BY c.id
       ORDER BY c.display_order ASC, c.name ASC
       LIMIT 12`
    ),
    pool.query(
      `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
              pp.slug AS provider_slug, pp.logo_url AS provider_logo_url,
              pp.website_url AS provider_website_url,
              pp.verification_status AS provider_verification_status
       FROM apis a
       INNER JOIN categories c ON c.id = a.category_id
       LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
       WHERE a.status = 'approved'
       ORDER BY a.is_featured DESC, a.average_rating DESC, a.views_count DESC
       LIMIT 6`
    ),
    pool.query(
      `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
              pp.slug AS provider_slug, pp.logo_url AS provider_logo_url,
              pp.website_url AS provider_website_url,
              pp.verification_status AS provider_verification_status
       FROM apis a
       INNER JOIN categories c ON c.id = a.category_id
       LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
       WHERE a.status = 'approved'
       ORDER BY COALESCE(a.published_at, a.created_at) DESC, a.id DESC
       LIMIT 6`
    ),
    pool.query(
      `SELECT sc.id AS campaign_id, sc.title AS campaign_title, sc.headline AS campaign_headline,
              sc.cta_label, ap.placement_type, ap.name AS package_name,
              a.*, c.name AS category_name, c.slug AS category_slug,
              pp.slug AS provider_slug, pp.logo_url AS provider_logo_url,
              pp.website_url AS provider_website_url,
              pp.verification_status AS provider_verification_status
       FROM sponsored_campaigns sc
       INNER JOIN advertising_packages ap ON ap.id = sc.package_id
       INNER JOIN apis a ON a.id = sc.api_id
       INNER JOIN categories c ON c.id = a.category_id
       LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
       WHERE sc.campaign_status = 'active'
         AND sc.approval_status = 'approved'
         AND sc.payment_status = 'paid'
         AND a.status = 'approved'
         AND (sc.starts_at IS NULL OR sc.starts_at <= UTC_TIMESTAMP())
         AND (sc.ends_at IS NULL OR sc.ends_at > UTC_TIMESTAMP())
       ORDER BY FIELD(ap.placement_type, 'homepage', 'spotlight', 'featured'), sc.starts_at DESC
       LIMIT 3`
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM apis WHERE status = 'approved') AS approved_apis,
         (SELECT COUNT(*) FROM categories WHERE is_active = 1) AS active_categories,
         (SELECT COUNT(*) FROM provider_profiles) AS total_providers,
         (SELECT COUNT(*) FROM api_reviews WHERE status = 'visible') AS total_reviews`
    )
  ]);

  const [featuredApis, recentApis, sponsoredApis] = await Promise.all([
    attachTagsAndFavorites(featuredRows, userId),
    attachTagsAndFavorites(recentRows, userId),
    attachTagsAndFavorites(sponsoredRows, userId)
  ]);

  res.json({
    success: true,
    stats: statsRow,
    categories,
    featured_apis: featuredApis,
    recent_apis: recentApis,
    sponsored_apis: sponsoredApis.map((item) => ({
      ...item,
      is_sponsored: true,
      sponsored_label: 'Sponsored'
    }))
  });
});

const listAndSearchApis = asyncHandler(async (req, res) => {
  await syncCampaignExpirations();
  const { page, limit, offset } = parsePagination(req.query, 12, 48);
  const userId = req.user ? req.user.id : null;

  const rawQuery = sanitizeText(req.query.q || req.query.search, 180) || '';
  const category = sanitizeText(req.query.category, 120);
  const pricing = sanitizeText(req.query.pricing, 60);
  const authType = sanitizeText(req.query.auth_type, 60);
  const provider = sanitizeText(req.query.provider, 150);
  const tag = sanitizeText(req.query.tag, 100);
  const sourceType = sanitizeText(req.query.source_type, 40);

  // Premium advanced filter checks (strictly enforced on backend!)
  const verifiedOnly = req.query.verified_only === 'true' || req.query.verified_only === '1';
  const httpsOnly = req.query.https_only === 'true' || req.query.https_only === '1';
  const corsOnly = req.query.cors_only === 'true' || req.query.cors_only === '1';
  const hasOpenapi = req.query.has_openapi === 'true' || req.query.has_openapi === '1';

  if ((verifiedOnly || httpsOnly || corsOnly || hasOpenapi) && (!req.user || !req.user.is_premium)) {
    throw new AppError(
      'Advanced technical filters (Verified Only, HTTPS, CORS, OpenAPI Spec) require a Premium subscription.',
      403,
      'PREMIUM_REQUIRED',
      { upgrade_url: '/pricing' }
    );
  }

  const whereClauses = ["a.status = 'approved'"];
  const whereParams = [];

  // Search: MySQL FULLTEXT + Tag/Category/Keyword fallback so both multi-word phrases and exact terms shine
  const booleanQuery = buildBooleanFulltextQuery(rawQuery);
  let selectRelevance = '0 AS relevance_score';
  const selectParams = [];

  if (rawQuery) {
    const likePattern = `%${rawQuery}%`;
    if (booleanQuery) {
      selectRelevance =
        '(MATCH(a.name, a.short_description, a.full_description, a.provider_name) AGAINST(? IN BOOLEAN MODE) * 2 + CASE WHEN a.name LIKE ? THEN 5 ELSE 0 END) AS relevance_score';
      selectParams.push(booleanQuery, likePattern);

      whereClauses.push(
        `(
          MATCH(a.name, a.short_description, a.full_description, a.provider_name) AGAINST(? IN BOOLEAN MODE)
          OR a.name LIKE ?
          OR a.short_description LIKE ?
          OR a.provider_name LIKE ?
          OR c.name LIKE ?
          OR EXISTS (
            SELECT 1 FROM api_tags at2
            INNER JOIN tags t2 ON t2.id = at2.tag_id
            WHERE at2.api_id = a.id AND (t2.name LIKE ? OR t2.slug LIKE ?)
          )
        )`
      );
      whereParams.push(
        booleanQuery,
        likePattern,
        likePattern,
        likePattern,
        likePattern,
        likePattern,
        likePattern
      );
    } else {
      whereClauses.push(
        '(a.name LIKE ? OR a.short_description LIKE ? OR a.provider_name LIKE ?)'
      );
      whereParams.push(likePattern, likePattern, likePattern);
    }
  }

  if (category) {
    if (/^\d+$/.test(category)) {
      whereClauses.push('a.category_id = ?');
      whereParams.push(Number(category));
    } else {
      whereClauses.push('c.slug = ?');
      whereParams.push(category);
    }
  }

  if (pricing) {
    if (pricing === 'free_or_freemium') {
      whereClauses.push("a.pricing_model IN ('free', 'freemium')");
    } else if (PRICING_MODELS.includes(pricing)) {
      whereClauses.push('a.pricing_model = ?');
      whereParams.push(pricing);
    }
  }

  if (authType && AUTH_TYPES.includes(authType)) {
    whereClauses.push('a.auth_type = ?');
    whereParams.push(authType);
  }

  if (provider) {
    if (/^\d+$/.test(provider)) {
      whereClauses.push('a.provider_profile_id = ?');
      whereParams.push(Number(provider));
    } else {
      whereClauses.push('(pp.slug = ? OR a.provider_name LIKE ?)');
      whereParams.push(provider, `%${provider}%`);
    }
  }

  if (tag) {
    whereClauses.push(
      `EXISTS (
        SELECT 1 FROM api_tags atf
        INNER JOIN tags tf ON tf.id = atf.tag_id
        WHERE atf.api_id = a.id AND (tf.slug = ? OR tf.name = ?)
      )`
    );
    whereParams.push(tag.toLowerCase(), tag.toLowerCase());
  }

  if (sourceType && ['admin', 'community', 'imported'].includes(sourceType)) {
    whereClauses.push('a.source_type = ?');
    whereParams.push(sourceType);
  }

  if (verifiedOnly) {
    whereClauses.push("a.verification_level = 'verified'");
  }
  if (httpsOnly) {
    whereClauses.push('a.https_supported = 1');
  }
  if (corsOnly) {
    whereClauses.push("a.cors_supported = 'yes'");
  }
  if (hasOpenapi) {
    whereClauses.push('a.openapi_spec_url IS NOT NULL');
  }

  const sortParam = String(req.query.sort || (rawQuery ? 'relevant' : 'recent')).toLowerCase();
  let orderBySql = 'COALESCE(a.published_at, a.created_at) DESC, a.id DESC';
  if (sortParam === 'relevant' && rawQuery) {
    orderBySql = 'relevance_score DESC, a.average_rating DESC, a.views_count DESC';
  } else if (sortParam === 'alphabetical' || sortParam === 'az') {
    orderBySql = 'a.name ASC';
  } else if (sortParam === 'most_reviewed') {
    orderBySql = 'a.reviews_count DESC, a.average_rating DESC, a.id DESC';
  } else if (sortParam === 'highest_rated') {
    orderBySql = 'a.average_rating DESC, a.reviews_count DESC, a.id DESC';
  } else if (sortParam === 'relevant') {
    orderBySql = "FIELD(a.verification_level, 'verified', 'community_reviewed', 'unverified', 'incomplete'), a.is_featured DESC, a.average_rating DESC, a.views_count DESC";
  }

  const whereSql = whereClauses.join(' AND ');

  const [[countRow], [rows]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total
       FROM apis a
       INNER JOIN categories c ON c.id = a.category_id
       LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
       WHERE ${whereSql}`,
      whereParams
    ),
    pool.query(
      `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
              pp.slug AS provider_slug, pp.logo_url AS provider_logo_url,
              pp.website_url AS provider_website_url,
              pp.verification_status AS provider_verification_status,
              ${selectRelevance}
       FROM apis a
       INNER JOIN categories c ON c.id = a.category_id
       LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
       WHERE ${whereSql}
       ORDER BY ${orderBySql}
       LIMIT ? OFFSET ?`,
      [...selectParams, ...whereParams, limit, offset]
    )
  ]);

  const enrichedApis = await attachTagsAndFavorites(rows, userId);

  // Fetch clearly separated sponsored placements (never blended into organic ranking)
  let sponsoredPlacements = [];
  if (page === 1) {
    const sponParams = [];
    let catFilterSql = '';
    if (category && !/^\d+$/.test(category)) {
      catFilterSql = 'AND (c.slug = ? OR sc.target_category_id IS NULL)';
      sponParams.push(category);
    }
    const [sponRows] = await pool.query(
      `SELECT sc.id AS campaign_id, sc.title AS campaign_title, sc.headline AS campaign_headline,
              sc.cta_label, ap.placement_type, ap.name AS package_name,
              a.*, c.name AS category_name, c.slug AS category_slug,
              pp.slug AS provider_slug, pp.logo_url AS provider_logo_url,
              pp.website_url AS provider_website_url,
              pp.verification_status AS provider_verification_status
       FROM sponsored_campaigns sc
       INNER JOIN advertising_packages ap ON ap.id = sc.package_id
       INNER JOIN apis a ON a.id = sc.api_id
       INNER JOIN categories c ON c.id = a.category_id
       LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
       WHERE sc.campaign_status = 'active'
         AND sc.approval_status = 'approved'
         AND sc.payment_status = 'paid'
         AND a.status = 'approved'
         AND (sc.starts_at IS NULL OR sc.starts_at <= UTC_TIMESTAMP())
         AND (sc.ends_at IS NULL OR sc.ends_at > UTC_TIMESTAMP())
         ${catFilterSql}
       ORDER BY FIELD(ap.placement_type, 'homepage', 'spotlight', 'featured'), RAND()
       LIMIT 2`,
      sponParams
    );
    const enrichedSpon = await attachTagsAndFavorites(sponRows, userId);
    sponsoredPlacements = enrichedSpon.map((s) => ({
      ...s,
      is_sponsored: true,
      sponsored_label: 'Sponsored'
    }));
  }

  // Record search telemetry asynchronously if query or filters were used
  if (rawQuery || category || pricing || authType || tag || provider) {
    const activeFilters = {
      category: category || null,
      pricing: pricing || null,
      auth_type: authType || null,
      provider: provider || null,
      tag: tag || null,
      verified_only: verifiedOnly,
      https_only: httpsOnly,
      cors_only: corsOnly,
      has_openapi: hasOpenapi
    };
    pool
      .query(
        `INSERT INTO api_search_logs (user_id, search_query, filters_json, sort_by, results_count)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, rawQuery || null, JSON.stringify(activeFilters), sortParam, countRow.total]
      )
      .catch(() => {});
  }

  res.json({
    success: true,
    pagination: {
      page,
      limit,
      total: countRow.total,
      total_pages: Math.ceil(countRow.total / limit) || 1
    },
    sort: sortParam,
    query: rawQuery,
    sponsored: sponsoredPlacements,
    apis: enrichedApis
  });
});

const getApiByIdOrSlug = asyncHandler(async (req, res) => {
  const identifier = String(req.params.id || '').trim();
  const isNumeric = /^\d+$/.test(identifier);
  const userId = req.user ? req.user.id : null;

  const [rows] = await pool.query(
    `SELECT a.*,
            c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
            pp.id AS provider_id, pp.company_name AS provider_company_name,
            pp.slug AS provider_slug, pp.logo_url AS provider_logo_url,
            pp.website_url AS provider_website_url, pp.description AS provider_description,
            pp.verification_status AS provider_verification_status,
            s.name AS source_name, s.base_url AS source_origin_url
     FROM apis a
     INNER JOIN categories c ON c.id = a.category_id
     LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
     LEFT JOIN api_sources s ON s.id = a.source_id
     WHERE ${isNumeric ? 'a.id = ?' : 'a.slug = ?'}
     LIMIT 1`,
    [isNumeric ? Number(identifier) : identifier]
  );

  if (rows.length === 0) {
    throw new AppError('API listing not found.', 404, 'API_NOT_FOUND');
  }

  const apiRow = rows[0];

  // Non-approved APIs are only visible to their submitter/owner or an administrator
  const isOwnerOrSubmitter =
    userId && (apiRow.submitted_by === userId || apiRow.owner_user_id === userId);
  const isAdmin = req.user && req.user.role === 'admin';

  if (apiRow.status !== 'approved' && !isOwnerOrSubmitter && !isAdmin) {
    throw new AppError('This API listing is pending moderation or unavailable.', 404, 'API_NOT_PUBLIC');
  }

  if (apiRow.status === 'approved') {
    await pool.query('UPDATE apis SET views_count = views_count + 1 WHERE id = ?', [apiRow.id]);
    apiRow.views_count += 1;
  }

  const [[enriched], [endpoints], [reviews]] = await Promise.all([
    attachTagsAndFavorites([apiRow], userId),
    pool.query(
      `SELECT id, http_method, path, summary, description, auth_required,
              sample_request, sample_response, query_params_json
       FROM api_endpoints
       WHERE api_id = ?
       ORDER BY id ASC`,
      [apiRow.id]
    ),
    pool.query(
      `SELECT r.id, r.rating, r.title, r.comment, r.created_at, r.updated_at,
              u.id AS user_id, u.username, u.full_name, u.avatar_url
       FROM api_reviews r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.api_id = ? AND r.status = 'visible'
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [apiRow.id]
    )
  ]);

  // Identify missing/incomplete metadata fields for transparent quality badge
  const completenessChecks = {
    has_base_url: Boolean(enriched.base_url),
    has_docs_url: Boolean(enriched.docs_url),
    has_website_url: Boolean(enriched.website_url),
    has_known_auth: enriched.auth_type !== 'unknown',
    has_known_pricing: enriched.pricing_model !== 'unknown',
    has_endpoints: endpoints.length > 0,
    is_verified: enriched.verification_level === 'verified'
  };

  res.json({
    success: true,
    api: {
      ...enriched,
      endpoints: endpoints.map((ep) => ({
        ...ep,
        auth_required: Boolean(ep.auth_required),
        query_params_json: parseJson(ep.query_params_json, [])
      })),
      reviews,
      quality_indicators: completenessChecks
    }
  });
});

async function syncApiTagsAndEndpoints(conn, apiId, tagsInput, endpointsInput) {
  if (Array.isArray(tagsInput)) {
    await conn.query('DELETE FROM api_tags WHERE api_id = ?', [apiId]);
    const cleanTags = [
      ...new Set(
        tagsInput
          .map((t) => String(typeof t === 'object' ? t.name : t || '').trim().toLowerCase())
          .filter((t) => t.length >= 2)
      )
    ].slice(0, 12);

    for (const tagName of cleanTags) {
      const tagSlug = slugify(tagName);
      await conn.query(
        'INSERT INTO tags (name, slug) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
        [tagName.slice(0, 80), tagSlug.slice(0, 100)]
      );
      const [tRows] = await conn.query('SELECT id FROM tags WHERE slug = ? LIMIT 1', [tagSlug]);
      if (tRows.length > 0) {
        await conn.query('INSERT IGNORE INTO api_tags (api_id, tag_id) VALUES (?, ?)', [
          apiId,
          tRows[0].id
        ]);
      }
    }
  }

  if (Array.isArray(endpointsInput)) {
    await conn.query('DELETE FROM api_endpoints WHERE api_id = ?', [apiId]);
    for (const ep of endpointsInput.slice(0, 20)) {
      if (!ep || !ep.path || !ep.summary) continue;
      const method = validateEnum(
        String(ep.http_method || 'GET').toUpperCase(),
        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'GRAPHQL', 'WS'],
        'Endpoint HTTP method',
        'GET'
      );
      await conn.query(
        `INSERT INTO api_endpoints
         (api_id, http_method, path, summary, description, auth_required, sample_request, sample_response, query_params_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          apiId,
          method,
          sanitizeText(ep.path, 300),
          sanitizeText(ep.summary, 255),
          sanitizeText(ep.description, 2000),
          ep.auth_required === false ? 0 : 1,
          sanitizeText(ep.sample_request, 4000),
          sanitizeText(ep.sample_response, 4000),
          ep.query_params_json ? JSON.stringify(ep.query_params_json) : null
        ]
      );
    }
  }
}

const createApi = asyncHandler(async (req, res) => {
  const name = sanitizeText(req.body.name, 180);
  const shortDescription = sanitizeText(req.body.short_description, 320);
  const fullDescription = sanitizeText(req.body.full_description, 10000);
  const categoryId = Number(req.body.category_id);

  if (!name || !shortDescription || !fullDescription || !categoryId) {
    throw new AppError(
      'API name, short description, full description, and category are required.',
      400,
      'MISSING_REQUIRED_FIELDS'
    );
  }

  const [catCheck] = await pool.query('SELECT id FROM categories WHERE id = ? LIMIT 1', [categoryId]);
  if (catCheck.length === 0) {
    throw new AppError('Selected category does not exist.', 400, 'INVALID_CATEGORY');
  }

  const docsUrl = validateHttpUrl(req.body.docs_url, 'Documentation URL', true);
  const baseUrl = validateHttpUrl(req.body.base_url, 'Base URL', false);
  const websiteUrl = validateHttpUrl(req.body.website_url, 'Official Website URL', false);
  const logoUrl = validateHttpUrl(req.body.logo_url, 'Logo URL', false);
  const openapiSpecUrl = validateHttpUrl(req.body.openapi_spec_url, 'OpenAPI Spec URL', false);

  const authType = validateEnum(req.body.auth_type, AUTH_TYPES, 'Authentication type', 'unknown');
  const pricingModel = validateEnum(req.body.pricing_model, PRICING_MODELS, 'Pricing model', 'unknown');
  const corsSupported = validateEnum(req.body.cors_supported, CORS_VALUES, 'CORS support', 'unknown');

  const isAdmin = req.user.role === 'admin';
  const sourceType = isAdmin ? 'admin' : 'community';
  const initialStatus = isAdmin && req.body.status === 'approved' ? 'approved' : isAdmin ? 'approved' : 'pending';
  const verificationLevel = isAdmin && req.body.verification_level
    ? validateEnum(req.body.verification_level, ['verified', 'community_reviewed', 'unverified', 'incomplete'], 'Verification level', 'verified')
    : isAdmin
    ? 'verified'
    : 'unverified';

  const providerProfileId = req.user.provider_profile_id || null;
  const providerName =
    sanitizeText(req.body.provider_name, 150) ||
    req.user.provider_company_name ||
    req.user.full_name ||
    req.user.username;

  const createdApiId = await withTransaction(async (conn) => {
    const slug = await generateUniqueSlug(conn, 'apis', name);
    const featuresObj = req.body.features_json && typeof req.body.features_json === 'object'
      ? req.body.features_json
      : null;

    const [result] = await conn.query(
      `INSERT INTO apis (
        name, slug, logo_url, short_description, full_description,
        category_id, provider_profile_id, provider_name, submitted_by, owner_user_id,
        base_url, docs_url, website_url, openapi_spec_url,
        auth_type, auth_details, pricing_model, pricing_details, rate_limit_info,
        https_supported, cors_supported,
        source_type, verification_level, status, is_featured, features_json, published_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, ?
      )`,
      [
        name,
        slug,
        logoUrl,
        shortDescription,
        fullDescription,
        categoryId,
        providerProfileId,
        providerName,
        req.user.id,
        req.body.is_owner === false && !providerProfileId ? null : req.user.id,
        baseUrl,
        docsUrl,
        websiteUrl,
        openapiSpecUrl,
        authType,
        sanitizeText(req.body.auth_details, 300),
        pricingModel,
        sanitizeText(req.body.pricing_details, 300),
        sanitizeText(req.body.rate_limit_info, 255),
        req.body.https_supported === false ? 0 : 1,
        corsSupported,
        sourceType,
        verificationLevel,
        initialStatus,
        isAdmin && req.body.is_featured ? 1 : 0,
        featuresObj ? JSON.stringify(featuresObj) : null,
        initialStatus === 'approved' ? new Date() : null
      ]
    );

    const apiId = result.insertId;
    await syncApiTagsAndEndpoints(conn, apiId, req.body.tags, req.body.endpoints);

    await conn.query(
      `INSERT INTO api_moderation_logs (api_id, moderator_user_id, action, previous_status, new_status, notes)
       VALUES (?, ?, ?, NULL, ?, ?)`,
      [
        apiId,
        req.user.id,
        isAdmin ? 'approved' : 'submitted',
        initialStatus,
        isAdmin ? 'Created directly by administrator.' : 'Submitted by community member for moderation.'
      ]
    );

    return apiId;
  });

  const [createdRows] = await pool.query(
    `SELECT a.*, c.name AS category_name, c.slug AS category_slug
     FROM apis a
     INNER JOIN categories c ON c.id = a.category_id
     WHERE a.id = ?`,
    [createdApiId]
  );
  const [enriched] = await attachTagsAndFavorites(createdRows, req.user.id);

  res.status(201).json({
    success: true,
    message:
      initialStatus === 'approved'
        ? 'API listing published successfully.'
        : 'API submitted successfully and is pending administrator review.',
    api: enriched
  });
});

const updateApi = asyncHandler(async (req, res) => {
  const apiId = Number(req.params.id);
  const [existingRows] = await pool.query('SELECT * FROM apis WHERE id = ? LIMIT 1', [apiId]);
  if (existingRows.length === 0) {
    throw new AppError('API listing not found.', 404, 'API_NOT_FOUND');
  }

  const existing = existingRows[0];
  const isAdmin = req.user.role === 'admin';
  const isOwner =
    existing.owner_user_id === req.user.id ||
    existing.submitted_by === req.user.id ||
    (req.user.provider_profile_id && existing.provider_profile_id === req.user.provider_profile_id);

  if (!isAdmin && !isOwner) {
    throw new AppError('You do not have permission to edit this API listing.', 403, 'FORBIDDEN_EDIT');
  }

  const name = sanitizeText(req.body.name, 180) || existing.name;
  const shortDescription = sanitizeText(req.body.short_description, 320) || existing.short_description;
  const fullDescription = sanitizeText(req.body.full_description, 10000) || existing.full_description;
  const categoryId = req.body.category_id ? Number(req.body.category_id) : existing.category_id;

  const docsUrl =
    req.body.docs_url !== undefined
      ? validateHttpUrl(req.body.docs_url, 'Documentation URL', true)
      : existing.docs_url;
  const baseUrl =
    req.body.base_url !== undefined
      ? validateHttpUrl(req.body.base_url, 'Base URL', false)
      : existing.base_url;
  const websiteUrl =
    req.body.website_url !== undefined
      ? validateHttpUrl(req.body.website_url, 'Official Website URL', false)
      : existing.website_url;
  const logoUrl =
    req.body.logo_url !== undefined
      ? validateHttpUrl(req.body.logo_url, 'Logo URL', false)
      : existing.logo_url;
  const openapiSpecUrl =
    req.body.openapi_spec_url !== undefined
      ? validateHttpUrl(req.body.openapi_spec_url, 'OpenAPI Spec URL', false)
      : existing.openapi_spec_url;

  const authType =
    req.body.auth_type !== undefined
      ? validateEnum(req.body.auth_type, AUTH_TYPES, 'Authentication type')
      : existing.auth_type;
  const pricingModel =
    req.body.pricing_model !== undefined
      ? validateEnum(req.body.pricing_model, PRICING_MODELS, 'Pricing model')
      : existing.pricing_model;
  const corsSupported =
    req.body.cors_supported !== undefined
      ? validateEnum(req.body.cors_supported, CORS_VALUES, 'CORS support')
      : existing.cors_supported;

  const providerName =
    req.body.provider_name !== undefined
      ? sanitizeText(req.body.provider_name, 150) || existing.provider_name
      : existing.provider_name;

  // Admin-only fields
  const nextStatus =
    isAdmin && req.body.status
      ? validateEnum(req.body.status, ['pending', 'approved', 'rejected', 'archived'], 'Status')
      : existing.status;
  const nextVerification =
    isAdmin && req.body.verification_level
      ? validateEnum(
          req.body.verification_level,
          ['verified', 'community_reviewed', 'unverified', 'incomplete'],
          'Verification level'
        )
      : existing.verification_level;
  const nextFeatured =
    isAdmin && req.body.is_featured !== undefined
      ? req.body.is_featured ? 1 : 0
      : existing.is_featured;

  await withTransaction(async (conn) => {
    const slug =
      name !== existing.name
        ? await generateUniqueSlug(conn, 'apis', name, apiId)
        : existing.slug;

    const featuresJson =
      req.body.features_json !== undefined
        ? req.body.features_json
          ? JSON.stringify(req.body.features_json)
          : null
        : existing.features_json
        ? typeof existing.features_json === 'string'
          ? existing.features_json
          : JSON.stringify(existing.features_json)
        : null;

    await conn.query(
      `UPDATE apis
       SET name = ?, slug = ?, logo_url = ?, short_description = ?, full_description = ?,
           category_id = ?, provider_name = ?,
           base_url = ?, docs_url = ?, website_url = ?, openapi_spec_url = ?,
           auth_type = ?, auth_details = ?, pricing_model = ?, pricing_details = ?, rate_limit_info = ?,
           https_supported = ?, cors_supported = ?,
           status = ?, verification_level = ?, is_featured = ?, features_json = ?,
           published_at = CASE
             WHEN ? = 'approved' AND published_at IS NULL THEN UTC_TIMESTAMP()
             ELSE published_at
           END
       WHERE id = ?`,
      [
        name,
        slug,
        logoUrl,
        shortDescription,
        fullDescription,
        categoryId,
        providerName,
        baseUrl,
        docsUrl,
        websiteUrl,
        openapiSpecUrl,
        authType,
        req.body.auth_details !== undefined
          ? sanitizeText(req.body.auth_details, 300)
          : existing.auth_details,
        pricingModel,
        req.body.pricing_details !== undefined
          ? sanitizeText(req.body.pricing_details, 300)
          : existing.pricing_details,
        req.body.rate_limit_info !== undefined
          ? sanitizeText(req.body.rate_limit_info, 255)
          : existing.rate_limit_info,
        req.body.https_supported !== undefined
          ? req.body.https_supported ? 1 : 0
          : existing.https_supported,
        corsSupported,
        nextStatus,
        nextVerification,
        nextFeatured,
        featuresJson,
        nextStatus,
        apiId
      ]
    );

    if (req.body.tags !== undefined || req.body.endpoints !== undefined) {
      await syncApiTagsAndEndpoints(conn, apiId, req.body.tags, req.body.endpoints);
    }

    await conn.query(
      `INSERT INTO api_moderation_logs (api_id, moderator_user_id, action, previous_status, new_status, notes)
       VALUES (?, ?, 'edited', ?, ?, ?)`,
      [apiId, req.user.id, existing.status, nextStatus, 'API listing updated.']
    );
  });

  const [updatedRows] = await pool.query(
    `SELECT a.*, c.name AS category_name, c.slug AS category_slug
     FROM apis a
     INNER JOIN categories c ON c.id = a.category_id
     WHERE a.id = ?`,
    [apiId]
  );
  const [enriched] = await attachTagsAndFavorites(updatedRows, req.user.id);

  res.json({
    success: true,
    message: 'API listing updated successfully.',
    api: enriched
  });
});

const deleteApi = asyncHandler(async (req, res) => {
  const apiId = Number(req.params.id);
  const [rows] = await pool.query('SELECT * FROM apis WHERE id = ? LIMIT 1', [apiId]);
  if (rows.length === 0) {
    throw new AppError('API listing not found.', 404, 'API_NOT_FOUND');
  }

  const existing = rows[0];
  const isAdmin = req.user.role === 'admin';
  const isOwner =
    existing.owner_user_id === req.user.id || existing.submitted_by === req.user.id;

  if (!isAdmin && !isOwner) {
    throw new AppError('You are not authorized to delete this API listing.', 403, 'FORBIDDEN_DELETE');
  }

  await pool.query('DELETE FROM apis WHERE id = ?', [apiId]);

  res.json({
    success: true,
    message: 'API listing deleted permanently.'
  });
});

const compareApis = asyncHandler(async (req, res) => {
  const rawIds = req.body.api_ids || req.query.ids;
  const ids = (Array.isArray(rawIds) ? rawIds : String(rawIds || '').split(','))
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  const uniqueIds = [...new Set(ids)].slice(0, 4);
  if (uniqueIds.length < 2) {
    throw new AppError('Select at least 2 APIs (up to 4) to compare side by side.', 400, 'COMPARE_MIN_TWO');
  }

  const [rows] = await pool.query(
    `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
            pp.company_name AS provider_company_name, pp.slug AS provider_slug,
            pp.verification_status AS provider_verification_status,
            pp.website_url AS provider_website_url,
            (SELECT COUNT(*) FROM api_endpoints ep WHERE ep.api_id = a.id) AS endpoints_count
     FROM apis a
     INNER JOIN categories c ON c.id = a.category_id
     LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
     WHERE a.id IN (?) AND a.status = 'approved'`,
    [uniqueIds]
  );

  if (rows.length < 2) {
    throw new AppError('At least two approved APIs are required for comparison.', 404, 'APIS_NOT_FOUND');
  }

  const enriched = await attachTagsAndFavorites(rows, req.user.id);
  // Preserve requested ordering
  const ordered = uniqueIds
    .map((id) => enriched.find((a) => a.id === id))
    .filter(Boolean);

  res.json({
    success: true,
    comparison: ordered
  });
});

const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
            pp.slug AS provider_slug, pp.logo_url AS provider_logo_url,
              pp.website_url AS provider_website_url,
              pp.verification_status AS provider_verification_status
     FROM apis a
     INNER JOIN categories c ON c.id = a.category_id
     LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
     WHERE a.status = 'approved'
       AND a.id NOT IN (SELECT api_id FROM favorites WHERE user_id = ?)
     ORDER BY
       (a.category_id IN (
         SELECT a2.category_id
         FROM favorites f2
         INNER JOIN apis a2 ON a2.id = f2.api_id
         WHERE f2.user_id = ?
       )) DESC,
       FIELD(a.verification_level, 'verified', 'community_reviewed', 'unverified', 'incomplete'),
       a.average_rating DESC,
       a.views_count DESC
     LIMIT 6`,
    [userId, userId]
  );

  const enriched = await attachTagsAndFavorites(rows, userId);
  res.json({
    success: true,
    recommendations: enriched
  });
});

const triggerStatusCheck = asyncHandler(async (req, res) => {
  const apiId = Number(req.params.id);
  const [rows] = await pool.query('SELECT id, owner_user_id, submitted_by FROM apis WHERE id = ? LIMIT 1', [apiId]);
  if (rows.length === 0) {
    throw new AppError('API listing not found.', 404, 'API_NOT_FOUND');
  }

  const isAllowed =
    req.user.role === 'admin' ||
    rows[0].owner_user_id === req.user.id ||
    rows[0].submitted_by === req.user.id;

  if (!isAllowed) {
    throw new AppError('Only the API owner or an administrator can run a live status check.', 403, 'FORBIDDEN');
  }

  const result = await checkApiEndpointStatus(apiId);
  res.json({
    success: true,
    check: result
  });
});

module.exports = {
  getHomepageData,
  listAndSearchApis,
  getApiByIdOrSlug,
  createApi,
  updateApi,
  deleteApi,
  compareApis,
  getRecommendations,
  triggerStatusCheck,
  attachTagsAndFavorites
};
