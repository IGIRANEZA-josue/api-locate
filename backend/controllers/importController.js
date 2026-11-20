const { pool, parseJson } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  sanitizeText,
  validateHttpUrl,
  validateEnum
} = require('../middleware/validationMiddleware');
const { generateUniqueSlug } = require('../utils/slugify');
const { runSourceImport } = require('../services/importService');

const SOURCE_TYPES = ['official_feed', 'openapi_directory', 'github_repo', 'public_catalog'];

const listApiSources = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*,
            (SELECT COUNT(*) FROM apis a WHERE a.source_id = s.id) AS imported_apis_count,
            (SELECT COUNT(*) FROM api_import_jobs j WHERE j.source_id = s.id) AS total_jobs_count
     FROM api_sources s
     ORDER BY s.id ASC`
  );

  res.json({
    success: true,
    sources: rows.map((s) => ({
      ...s,
      auto_publish: Boolean(s.auto_publish),
      is_enabled: Boolean(s.is_enabled),
      config_json: parseJson(s.config_json, {})
    }))
  });
});

const createApiSource = asyncHandler(async (req, res) => {
  const name = sanitizeText(req.body.name, 150);
  if (!name) {
    throw new AppError('Source name is required.', 400, 'NAME_REQUIRED');
  }

  const sourceType = validateEnum(
    req.body.source_type,
    SOURCE_TYPES,
    'Source type',
    'openapi_directory'
  );
  const baseUrl = validateHttpUrl(req.body.base_url, 'Base URL', true);
  const feedUrl = validateHttpUrl(req.body.feed_url, 'Feed URL', true);
  const licenseName = sanitizeText(req.body.license_name, 120);
  const licenseUrl = validateHttpUrl(req.body.license_url, 'License URL', false);
  const attributionText = sanitizeText(req.body.attribution_text, 500);
  const termsUrl = validateHttpUrl(req.body.terms_url, 'Terms URL', false);
  const rateLimit = Math.max(1, Math.min(1000, Number(req.body.rate_limit_per_hour || 60)));
  const autoPublish = req.body.auto_publish ? 1 : 0;
  const isEnabled = req.body.is_enabled !== false ? 1 : 0;
  const configJson = req.body.config_json ? JSON.stringify(req.body.config_json) : null;

  const slug = await generateUniqueSlug(pool, 'api_sources', name);

  const [ins] = await pool.query(
    `INSERT INTO api_sources
     (name, slug, source_type, base_url, feed_url, license_name, license_url,
      attribution_text, terms_url, rate_limit_per_hour, auto_publish, is_enabled, config_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      slug,
      sourceType,
      baseUrl,
      feedUrl,
      licenseName,
      licenseUrl,
      attributionText,
      termsUrl,
      rateLimit,
      autoPublish,
      isEnabled,
      configJson
    ]
  );

  const [created] = await pool.query('SELECT * FROM api_sources WHERE id = ?', [ins.insertId]);
  res.status(201).json({
    success: true,
    message: 'API import source added.',
    source: {
      ...created[0],
      auto_publish: Boolean(created[0].auto_publish),
      is_enabled: Boolean(created[0].is_enabled),
      config_json: parseJson(created[0].config_json, {})
    }
  });
});

const updateApiSource = asyncHandler(async (req, res) => {
  const sourceId = Number(req.params.id);
  const [rows] = await pool.query('SELECT * FROM api_sources WHERE id = ? LIMIT 1', [sourceId]);
  if (rows.length === 0) {
    throw new AppError('API source not found.', 404, 'SOURCE_NOT_FOUND');
  }

  const cur = rows[0];
  const name = sanitizeText(req.body.name, 150) || cur.name;
  const sourceType =
    req.body.source_type !== undefined
      ? validateEnum(req.body.source_type, SOURCE_TYPES, 'Source type')
      : cur.source_type;
  const baseUrl =
    req.body.base_url !== undefined
      ? validateHttpUrl(req.body.base_url, 'Base URL', true)
      : cur.base_url;
  const feedUrl =
    req.body.feed_url !== undefined
      ? validateHttpUrl(req.body.feed_url, 'Feed URL', true)
      : cur.feed_url;
  const licenseName =
    req.body.license_name !== undefined
      ? sanitizeText(req.body.license_name, 120)
      : cur.license_name;
  const licenseUrl =
    req.body.license_url !== undefined
      ? validateHttpUrl(req.body.license_url, 'License URL', false)
      : cur.license_url;
  const attributionText =
    req.body.attribution_text !== undefined
      ? sanitizeText(req.body.attribution_text, 500)
      : cur.attribution_text;
  const termsUrl =
    req.body.terms_url !== undefined
      ? validateHttpUrl(req.body.terms_url, 'Terms URL', false)
      : cur.terms_url;
  const rateLimit =
    req.body.rate_limit_per_hour !== undefined
      ? Math.max(1, Math.min(1000, Number(req.body.rate_limit_per_hour)))
      : cur.rate_limit_per_hour;
  const autoPublish =
    req.body.auto_publish !== undefined ? (req.body.auto_publish ? 1 : 0) : cur.auto_publish;
  const isEnabled =
    req.body.is_enabled !== undefined ? (req.body.is_enabled ? 1 : 0) : cur.is_enabled;
  const configJson =
    req.body.config_json !== undefined
      ? req.body.config_json
        ? JSON.stringify(req.body.config_json)
        : null
      : typeof cur.config_json === 'string'
      ? cur.config_json
      : cur.config_json
      ? JSON.stringify(cur.config_json)
      : null;

  await pool.query(
    `UPDATE api_sources
     SET name = ?, source_type = ?, base_url = ?, feed_url = ?,
         license_name = ?, license_url = ?, attribution_text = ?, terms_url = ?,
         rate_limit_per_hour = ?, auto_publish = ?, is_enabled = ?, config_json = ?
     WHERE id = ?`,
    [
      name,
      sourceType,
      baseUrl,
      feedUrl,
      licenseName,
      licenseUrl,
      attributionText,
      termsUrl,
      rateLimit,
      autoPublish,
      isEnabled,
      configJson,
      sourceId
    ]
  );

  const [updated] = await pool.query('SELECT * FROM api_sources WHERE id = ?', [sourceId]);
  res.json({
    success: true,
    message: 'API source updated.',
    source: {
      ...updated[0],
      auto_publish: Boolean(updated[0].auto_publish),
      is_enabled: Boolean(updated[0].is_enabled),
      config_json: parseJson(updated[0].config_json, {})
    }
  });
});

const deleteApiSource = asyncHandler(async (req, res) => {
  const sourceId = Number(req.params.id);
  const [resDel] = await pool.query('DELETE FROM api_sources WHERE id = ?', [sourceId]);
  if (resDel.affectedRows === 0) {
    throw new AppError('API source not found.', 404, 'SOURCE_NOT_FOUND');
  }
  res.json({ success: true, message: 'API source removed.' });
});

const triggerImportJob = asyncHandler(async (req, res) => {
  const sourceId = Number(req.params.id);
  const job = await runSourceImport(sourceId, req.user.id);
  res.json({
    success: true,
    message: `Import job finished: ${job.imported_count} imported, ${job.skipped_count} skipped, ${job.failed_count} failed.`,
    job
  });
});

const listImportJobs = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT j.*, s.name AS source_name, s.slug AS source_slug,
            u.username AS triggered_by_username
     FROM api_import_jobs j
     INNER JOIN api_sources s ON s.id = j.source_id
     LEFT JOIN users u ON u.id = j.triggered_by
     ORDER BY j.created_at DESC
     LIMIT 50`
  );

  res.json({
    success: true,
    jobs: rows.map((j) => ({
      ...j,
      log_json: parseJson(j.log_json, [])
    }))
  });
});

module.exports = {
  listApiSources,
  createApiSource,
  updateApiSource,
  deleteApiSource,
  triggerImportJob,
  listImportJobs
};
