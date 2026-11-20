const { pool, parseJson, withTransaction } = require('../config/db');
const { AppError } = require('../middleware/errorMiddleware');
const { generateUniqueSlug, slugify } = require('../utils/slugify');
const { safeFetch } = require('./monitoringService');

function inferCategorySlug(text = '') {
  const lower = String(text).toLowerCase();
  if (/\b(ai|llm|gpt|ml|openai|model|embedding|neural|vision)\b/.test(lower)) return 'ai-machine-learning';
  if (/\b(pay|stripe|billing|invoice|bank|currency|fintech|wallet)\b/.test(lower)) return 'payments-fintech';
  if (/\b(auth|oauth|jwt|identity|security|sso|token|verify)\b/.test(lower)) return 'authentication-security';
  if (/\b(sms|email|mail|chat|twilio|message|push|voice)\b/.test(lower)) return 'communication-messaging';
  if (/\b(map|geo|location|place|route|ip|weather)\b/.test(lower)) {
    return /\b(weather|climate|forecast|meteo)\b/.test(lower) ? 'weather-environment' : 'geolocation-maps';
  }
  if (/\b(cloud|aws|docker|kubernetes|deploy|dns|server|ci)\b/.test(lower)) return 'cloud-devops';
  if (/\b(analytics|search|data|scrape|metric|finance)\b/.test(lower)) return 'data-analytics';
  if (/\b(image|video|audio|media|stream|ocr|pdf)\b/.test(lower)) return 'media-video-audio';
  if (/\b(shop|commerce|shipping|order|tax|catalog)\b/.test(lower)) return 'ecommerce-logistics';
  return 'developer-tools';
}

/**
 * Normalizes diverse permitted public API repository payloads into validated candidate API records.
 */
function normalizeSourcePayload(source, payload, maxItems = 12) {
  const config = parseJson(source.config_json, {});
  const adapter = config.adapter || source.source_type;
  const candidates = [];

  if (adapter === 'npm_sdk_catalog' && payload && Array.isArray(payload.objects)) {
    for (const entry of payload.objects.slice(0, maxItems)) {
      const pkg = entry.package || {};
      if (!pkg.name) continue;
      const homepage = pkg?.links?.homepage || pkg?.links?.repository || pkg?.links?.npm;
      if (!homepage) continue;

      candidates.push({
        externalKey: `npm:${pkg.name}`,
        name: pkg.name
          .replace(/^@/, '')
          .replace(/[/-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .slice(0, 160),
        shortDescription: String(pkg.description || `Developer SDK & REST API package (${pkg.name}).`).slice(0, 300),
        fullDescription: `${pkg.description || pkg.name}\n\nDiscovered via official npm Registry metadata (${pkg.name}@${pkg.version || 'latest'}). Review official documentation and license terms before production integration.`,
        providerName: pkg?.publisher?.username || 'Open Source Publisher',
        baseUrl: null,
        docsUrl: homepage,
        websiteUrl: pkg?.links?.npm || homepage,
        sourceUrl: pkg?.links?.npm || `${source.base_url}/${pkg.name}`,
        authType: 'api_key',
        pricingModel: 'unknown',
        tags: Array.isArray(pkg.keywords) ? pkg.keywords.slice(0, 5) : ['sdk', 'openapi']
      });
    }
  } else if (adapter === 'github_openapi_repo' && payload && typeof payload === 'object') {
    // Handles single GitHub repository metadata OR array of GitHub repositories
    const repos = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload)
      ? payload
      : [payload];

    for (const repo of repos.slice(0, maxItems)) {
      if (!repo || !repo.full_name) continue;
      const docsUrl = repo.homepage || repo.html_url;
      if (!docsUrl) continue;

      candidates.push({
        externalKey: `gh:${repo.id || repo.full_name}`,
        name: (repo.name || repo.full_name)
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .slice(0, 160),
        shortDescription: String(repo.description || `Official OpenAPI specification from ${repo.full_name}.`).slice(0, 300),
        fullDescription: `${repo.description || repo.full_name}\n\nImported from official GitHub repository ${repo.full_name}. Stars: ${repo.stargazers_count ?? 0}.`,
        providerName: repo?.owner?.login || 'GitHub Maintainer',
        baseUrl: repo.full_name.startsWith('github/') ? 'https://api.github.com' : null,
        docsUrl,
        websiteUrl: repo.html_url,
        sourceUrl: repo.html_url,
        licenseName: repo?.license?.spdx_id || source.license_name,
        authType: 'bearer',
        pricingModel: 'freemium',
        tags: Array.isArray(repo.topics) && repo.topics.length > 0 ? repo.topics.slice(0, 5) : ['openapi', 'rest']
      });
    }
  } else if (adapter === 'apis_guru_v2' && payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const entries = Object.entries(payload).slice(0, maxItems);
    for (const [apiKey, meta] of entries) {
      const preferredVer = meta?.preferred;
      const verObj = (preferredVer && meta?.versions?.[preferredVer]) || Object.values(meta?.versions || {})[0];
      const info = verObj?.info || {};
      const title = info.title || apiKey;
      const docsUrl = info?.contact?.url || verObj?.externalDocs?.url || verObj?.swaggerUrl;
      if (!docsUrl) continue;

      candidates.push({
        externalKey: `apisguru:${apiKey}`,
        name: String(title).slice(0, 160),
        shortDescription: String(info.description || `${title} Web API specification.`).replace(/\s+/g, ' ').slice(0, 300),
        fullDescription: String(info.description || `${title} imported from APIs.guru OpenAPI directory.`).slice(0, 4000),
        providerName: info['x-providerName'] || apiKey.split(':')[0] || 'Public API Provider',
        baseUrl: null,
        docsUrl,
        websiteUrl: info?.contact?.url || docsUrl,
        openapiSpecUrl: verObj?.swaggerYamlUrl || verObj?.swaggerUrl || null,
        sourceUrl: verObj?.swaggerUrl || `${source.base_url}`,
        licenseName: info?.license?.name || source.license_name,
        licenseUrl: info?.license?.url || source.license_url,
        logoUrl: info?.['x-logo']?.url || null,
        authType: 'unknown',
        pricingModel: 'unknown',
        tags: Array.isArray(info['x-apisguru-categories']) ? info['x-apisguru-categories'].slice(0, 5) : ['openapi']
      });
    }
  } else if (Array.isArray(payload) || Array.isArray(payload?.apis)) {
    const list = Array.isArray(payload) ? payload : payload.apis;
    for (const item of list.slice(0, maxItems)) {
      if (!item?.name || !(item?.docs_url || item?.docsUrl || item?.url)) continue;
      const docsUrl = item.docs_url || item.docsUrl || item.url;
      candidates.push({
        externalKey: String(item.id || item.external_key || slugify(item.name)).slice(0, 175),
        name: String(item.name).slice(0, 160),
        shortDescription: String(item.short_description || item.description || item.name).slice(0, 300),
        fullDescription: String(item.full_description || item.description || item.name).slice(0, 4000),
        providerName: String(item.provider_name || item.provider || source.name).slice(0, 140),
        baseUrl: item.base_url || item.baseUrl || null,
        docsUrl,
        websiteUrl: item.website_url || docsUrl,
        sourceUrl: item.source_url || docsUrl,
        licenseName: item.license_name || source.license_name,
        licenseUrl: item.license_url || source.license_url,
        authType: item.auth_type || 'unknown',
        pricingModel: item.pricing_model || 'unknown',
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 5) : []
      });
    }
  }

  return candidates;
}

async function runSourceImport(sourceId, triggeredByUserId = null) {
  const [sources] = await pool.query('SELECT * FROM api_sources WHERE id = ? LIMIT 1', [sourceId]);
  if (sources.length === 0) {
    throw new AppError('API import source not found.', 404, 'SOURCE_NOT_FOUND');
  }

  const source = sources[0];
  if (!source.is_enabled) {
    throw new AppError(
      `Import source "${source.name}" is currently disabled. Enable it before running an import.`,
      400,
      'SOURCE_DISABLED'
    );
  }

  // Respect configured per-source hourly rate limit
  const [recentJobs] = await pool.query(
    `SELECT COUNT(*) AS runs_last_hour
     FROM api_import_jobs
     WHERE source_id = ?
       AND started_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)`,
    [source.id]
  );

  if (recentJobs[0].runs_last_hour >= source.rate_limit_per_hour) {
    throw new AppError(
      `Hourly import rate limit (${source.rate_limit_per_hour}/hr) reached for source "${source.name}".`,
      429,
      'SOURCE_RATE_LIMIT_REACHED'
    );
  }

  // Create running import job log
  const [jobInit] = await pool.query(
    `INSERT INTO api_import_jobs (source_id, triggered_by, status, started_at)
     VALUES (?, ?, 'running', UTC_TIMESTAMP())`,
    [source.id, triggeredByUserId]
  );
  const jobId = jobInit.insertId;

  const config = parseJson(source.config_json, {});
  const maxItems = Math.min(50, Math.max(1, Number(config.max_items_per_run || 12)));

  let totalFetched = 0;
  let importedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const itemLogs = [];

  try {
    const response = await safeFetch(source.feed_url, {
      method: 'GET',
      timeoutMs: 12000,
      maxRedirects: 3
    });

    if (!response.ok) {
      throw new AppError(`Upstream feed returned HTTP ${response.status}.`, 502, 'IMPORT_FEED_HTTP_ERROR');
    }

    const payload = await response.json();
    const candidates = normalizeSourcePayload(source, payload, maxItems);
    totalFetched = candidates.length;

    // Preload category lookup map
    const [catRows] = await pool.query('SELECT id, slug FROM categories');
    const categoryMap = new Map(catRows.map((c) => [c.slug, c.id]));
    const fallbackCategoryId = categoryMap.get('developer-tools') || catRows[0]?.id;

    for (const item of candidates) {
      try {
        // Validate URLs strictly
        const docsUrl = new URL(item.docsUrl).toString().slice(0, 500);
        const baseUrl = item.baseUrl ? new URL(item.baseUrl).toString().slice(0, 500) : null;
        const websiteUrl = item.websiteUrl ? new URL(item.websiteUrl).toString().slice(0, 500) : docsUrl;

        // Check duplicate by (source_id, external_source_key) OR identical docs_url / name
        const [dups] = await pool.query(
          `SELECT id, name FROM apis
           WHERE (source_id = ? AND external_source_key = ?)
              OR docs_url = ?
              OR LOWER(name) = LOWER(?)
           LIMIT 1`,
          [source.id, item.externalKey, docsUrl, item.name]
        );

        if (dups.length > 0) {
          skippedCount += 1;
          itemLogs.push({
            external_key: item.externalKey,
            name: item.name,
            outcome: 'skipped_duplicate',
            existing_api_id: dups[0].id
          });
          continue;
        }

        const catSlug = inferCategorySlug(`${item.name} ${item.shortDescription}`);
        const categoryId = categoryMap.get(catSlug) || fallbackCategoryId;
        const publishStatus = source.auto_publish ? 'approved' : 'pending';

        await withTransaction(async (conn) => {
          const uniqueSlug = await generateUniqueSlug(conn, 'apis', item.name);

          const [ins] = await conn.query(
            `INSERT INTO apis (
              name, slug, logo_url, short_description, full_description,
              category_id, provider_name, submitted_by,
              base_url, docs_url, website_url, openapi_spec_url,
              auth_type, pricing_model,
              source_type, source_id, external_source_key, source_url,
              license_name, license_url, attribution_note,
              verification_level, operational_status, status, published_at
            ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?,
              'imported', ?, ?, ?,
              ?, ?, ?,
              'unverified', 'unknown', ?, ?
            )`,
            [
              item.name,
              uniqueSlug,
              item.logoUrl || null,
              item.shortDescription,
              item.fullDescription,
              categoryId,
              item.providerName,
              triggeredByUserId,
              baseUrl,
              docsUrl,
              websiteUrl,
              item.openapiSpecUrl || null,
              ['none', 'api_key', 'oauth2', 'basic', 'bearer', 'custom', 'unknown'].includes(item.authType)
                ? item.authType
                : 'unknown',
              ['free', 'freemium', 'paid', 'contact', 'unknown'].includes(item.pricingModel)
                ? item.pricingModel
                : 'unknown',
              source.id,
              item.externalKey,
              item.sourceUrl || source.feed_url,
              item.licenseName || source.license_name,
              item.licenseUrl || source.license_url,
              source.attribution_text || `Imported from ${source.name}`,
              publishStatus,
              publishStatus === 'approved' ? new Date() : null
            ]
          );

          const newApiId = ins.insertId;

          // Attach tags
          if (Array.isArray(item.tags)) {
            for (const rawTag of item.tags.slice(0, 5)) {
              const cleanTag = String(rawTag || '').trim().toLowerCase().slice(0, 60);
              if (!cleanTag) continue;
              const tagSlug = slugify(cleanTag);
              await conn.query(
                'INSERT INTO tags (name, slug) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
                [cleanTag, tagSlug]
              );
              const [tagRow] = await conn.query('SELECT id FROM tags WHERE slug = ? LIMIT 1', [tagSlug]);
              if (tagRow.length > 0) {
                await conn.query(
                  'INSERT IGNORE INTO api_tags (api_id, tag_id) VALUES (?, ?)',
                  [newApiId, tagRow[0].id]
                );
              }
            }
          }

          await conn.query(
            `INSERT INTO api_moderation_logs (api_id, moderator_user_id, action, previous_status, new_status, notes)
             VALUES (?, ?, 'imported', NULL, ?, ?)`,
            [newApiId, triggeredByUserId, publishStatus, `Imported from source: ${source.name}`]
          );
        });

        importedCount += 1;
        itemLogs.push({
          external_key: item.externalKey,
          name: item.name,
          outcome: 'imported',
          status: publishStatus
        });
      } catch (itemErr) {
        failedCount += 1;
        itemLogs.push({
          external_key: item.externalKey,
          name: item.name,
          outcome: 'failed',
          error: itemErr.message
        });
      }
    }

    const finalStatus = failedCount > 0 && importedCount === 0 && skippedCount === 0 ? 'failed' : failedCount > 0 ? 'partial' : 'completed';

    await pool.query(
      `UPDATE api_import_jobs
       SET status = ?,
           total_fetched = ?,
           imported_count = ?,
           skipped_count = ?,
           failed_count = ?,
           log_json = ?,
           finished_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [finalStatus, totalFetched, importedCount, skippedCount, failedCount, JSON.stringify(itemLogs), jobId]
    );

    await pool.query('UPDATE api_sources SET last_imported_at = UTC_TIMESTAMP() WHERE id = ?', [source.id]);

    const [updatedJobs] = await pool.query('SELECT * FROM api_import_jobs WHERE id = ?', [jobId]);
    return {
      ...updatedJobs[0],
      log_json: parseJson(updatedJobs[0].log_json, [])
    };
  } catch (err) {
    await pool.query(
      `UPDATE api_import_jobs
       SET status = 'failed',
           error_summary = ?,
           log_json = ?,
           finished_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [err.message, JSON.stringify(itemLogs), jobId]
    );
    throw err;
  }
}

module.exports = {
  runSourceImport
};
