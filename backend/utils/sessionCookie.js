const COOKIE_NAME = 'apilocate_session';
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

function isSecureRequest(req) {
  if (req.secure) return true;
  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  if (proto.includes('https')) return true;
  const origin = String(req.headers.origin || req.headers.referer || '').toLowerCase();
  if (origin.startsWith('https://')) return true;
  return false;
}

function parseCookies(cookieHeader = '') {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const rawVal = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(rawVal);
    } catch (_) {
      out[key] = rawVal;
    }
  }
  return out;
}

function setSessionCookie(req, res, token, rememberMe = true) {
  const secure = isSecureRequest(req);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly'
  ];

  if (rememberMe) {
    parts.push(`Max-Age=${THIRTY_DAYS_SECONDS}`);
    const expires = new Date(Date.now() + THIRTY_DAYS_SECONDS * 1000).toUTCString();
    parts.push(`Expires=${expires}`);
  }

  if (secure) {
    // Support cross-origin preview iframes (CHIPS Partitioned + SameSite=None; Secure)
    parts.push('Secure');
    parts.push('SameSite=None');
    parts.push('Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req, res) {
  const secure = isSecureRequest(req);
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ];

  if (secure) {
    parts.push('Secure');
    parts.push('SameSite=None');
    parts.push('Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

function getSessionCookieToken(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies[COOKIE_NAME] || null;
}

module.exports = {
  COOKIE_NAME,
  THIRTY_DAYS_SECONDS,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  getSessionCookieToken
};
