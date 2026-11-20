const dns = require('dns').promises;
const net = require('net');
const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorMiddleware');

function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function inCidr4(ipInt, baseStr, maskBits) {
  const baseInt = ipv4ToInt(baseStr);
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function isBlockedIpAddress(address) {
  if (!address) return true;
  const normalized = address.trim().toLowerCase();

  // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
  if (normalized.startsWith('::ffff:')) {
    const mappedV4 = normalized.slice(7);
    if (net.isIPv4(mappedV4)) {
      return isBlockedIpAddress(mappedV4);
    }
  }

  if (net.isIPv4(normalized)) {
    const ipInt = ipv4ToInt(normalized);
    if (ipInt === null) return true;
    return (
      inCidr4(ipInt, '0.0.0.0', 8) ||       // "This" network
      inCidr4(ipInt, '10.0.0.0', 8) ||      // Private RFC1918
      inCidr4(ipInt, '100.64.0.0', 10) ||   // Carrier-grade NAT
      inCidr4(ipInt, '127.0.0.0', 8) ||     // Loopback
      inCidr4(ipInt, '169.254.0.0', 16) ||  // Link-local / Cloud metadata
      inCidr4(ipInt, '172.16.0.0', 12) ||   // Private RFC1918
      inCidr4(ipInt, '192.0.0.0', 24) ||    // IETF protocol assignments
      inCidr4(ipInt, '192.0.2.0', 24) ||    // TEST-NET-1
      inCidr4(ipInt, '192.168.0.0', 16) ||  // Private RFC1918
      inCidr4(ipInt, '198.18.0.0', 15) ||   // Benchmarking
      inCidr4(ipInt, '198.51.100.0', 24) || // TEST-NET-2
      inCidr4(ipInt, '203.0.113.0', 24) ||  // TEST-NET-3
      inCidr4(ipInt, '224.0.0.0', 4) ||     // Multicast
      inCidr4(ipInt, '240.0.0.0', 4)        // Reserved / Broadcast
    );
  }

  if (net.isIPv6(normalized)) {
    if (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('ff')
    ) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Validates that a URL uses HTTP/HTTPS, has a public non-internal hostname,
 * and resolves exclusively to public IPv4/IPv6 addresses (SSRF defense).
 */
async function assertSafePublicUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (_) {
    throw new AppError('Invalid target URL format.', 400, 'INVALID_URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('Only http:// and https:// protocols are permitted.', 400, 'SSRF_BLOCKED_PROTOCOL');
  }

  if (parsed.username || parsed.password) {
    throw new AppError('URLs with embedded credentials are not permitted.', 400, 'SSRF_BLOCKED_CREDENTIALS');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new AppError('Internal or loopback hostnames are blocked.', 400, 'SSRF_BLOCKED_HOST');
  }

  if (net.isIP(hostname)) {
    if (isBlockedIpAddress(hostname)) {
      throw new AppError('Private, loopback, or link-local IP destinations are blocked.', 400, 'SSRF_BLOCKED_IP');
    }
    return parsed;
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (_) {
    throw new AppError(`Unable to resolve DNS for host: ${hostname}`, 400, 'DNS_LOOKUP_FAILED');
  }

  if (!records || records.length === 0) {
    throw new AppError(`No DNS records found for host: ${hostname}`, 400, 'DNS_LOOKUP_FAILED');
  }

  for (const record of records) {
    if (isBlockedIpAddress(record.address)) {
      throw new AppError(
        'Hostname resolves to a blocked internal, loopback, or private network address.',
        400,
        'SSRF_BLOCKED_DNS_IP'
      );
    }
  }

  return parsed;
}

/**
 * Performs an HTTP fetch with SSRF validation on the initial URL and every redirect hop,
 * plus an enforced timeout and maximum response size.
 */
async function safeFetch(urlString, { method = 'GET', headers = {}, timeoutMs = 6000, maxRedirects = 3 } = {}) {
  let currentUrl = urlString;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const validatedUrl = await assertSafePublicUrl(currentUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(validatedUrl.toString(), {
        method,
        headers: {
          'User-Agent': 'APILocate-Monitor/1.0 (+https://apilocate.dev)',
          Accept: 'application/json, text/html;q=0.8, */*;q=0.5',
          ...headers
        },
        redirect: 'manual',
        signal: controller.signal
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new AppError('Redirect response missing Location header.', 502, 'UPSTREAM_REDIRECT_ERROR');
        }
        if (hop === maxRedirects) {
          throw new AppError('Too many redirects from target endpoint.', 502, 'TOO_MANY_REDIRECTS');
        }
        currentUrl = new URL(location, validatedUrl.toString()).toString();
        continue;
      }

      return response;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err.name === 'AbortError') {
        throw new AppError(`Request timed out after ${timeoutMs}ms.`, 504, 'UPSTREAM_TIMEOUT');
      }
      throw new AppError(`Upstream connection failed: ${err.message}`, 502, 'UPSTREAM_UNREACHABLE');
    } finally {
      clearTimeout(timer);
    }
  }

  throw new AppError('Maximum redirect hops exceeded.', 502, 'TOO_MANY_REDIRECTS');
}

/**
 * Checks an API's base_url or docs_url safely and updates its operational status in MySQL.
 */
async function checkApiEndpointStatus(apiId) {
  const [rows] = await pool.query(
    'SELECT id, name, base_url, docs_url FROM apis WHERE id = ? LIMIT 1',
    [apiId]
  );

  if (rows.length === 0) {
    throw new AppError('API listing not found.', 404, 'API_NOT_FOUND');
  }

  const api = rows[0];
  const targetUrl = api.base_url || api.docs_url;
  const startedAt = Date.now();
  let operationalStatus = 'unknown';
  let responseMs = null;
  let httpStatus = null;
  let errorDetail = null;

  try {
    const response = await safeFetch(targetUrl, { method: 'GET', timeoutMs: 5000, maxRedirects: 3 });
    responseMs = Date.now() - startedAt;
    httpStatus = response.status;

    // 2xx, 3xx, or 401/403 (auth required on base API root!) indicate the API server is reachable and operational
    if (response.status < 500) {
      operationalStatus = responseMs > 3000 ? 'degraded' : 'operational';
    } else {
      operationalStatus = 'down';
    }
  } catch (err) {
    if (err.code && err.code.startsWith('SSRF_')) {
      throw err;
    }
    responseMs = Date.now() - startedAt;
    operationalStatus = 'down';
    errorDetail = err.message;
  }

  await pool.query(
    `UPDATE apis
     SET operational_status = ?,
         last_checked_at = UTC_TIMESTAMP(),
         last_response_ms = ?
     WHERE id = ?`,
    [operationalStatus, responseMs, apiId]
  );

  return {
    api_id: api.id,
    checked_url: targetUrl,
    operational_status: operationalStatus,
    http_status: httpStatus,
    response_ms: responseMs,
    error: errorDetail,
    checked_at: new Date().toISOString()
  };
}

module.exports = {
  isBlockedIpAddress,
  assertSafePublicUrl,
  safeFetch,
  checkApiEndpointStatus
};
