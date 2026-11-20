const { pool, parseJson } = require('../config/db');
const { verifyToken } = require('../utils/generateToken');
const { getSessionCookieToken } = require('../utils/sessionCookie');
const { AppError, asyncHandler } = require('./errorMiddleware');

async function loadUserContext(userId) {
  await pool.query(
    `UPDATE subscriptions
     SET status = 'expired'
     WHERE user_id = ?
       AND status = 'active'
       AND current_period_end IS NOT NULL
       AND current_period_end <= UTC_TIMESTAMP()`,
    [userId]
  );

  const [users] = await pool.query(
    `SELECT u.id, u.username, u.email, u.full_name, u.avatar_url, u.bio,
            u.role, u.theme_preference, u.is_active, u.last_login_at, u.created_at,
            pp.id AS provider_profile_id, pp.company_name AS provider_company_name,
            pp.slug AS provider_slug, pp.verification_status AS provider_verification_status
     FROM users u
     LEFT JOIN provider_profiles pp ON pp.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];
  if (!user.is_active) {
    throw new AppError('Your account has been suspended. Please contact support.', 403, 'ACCOUNT_SUSPENDED');
  }

  const [subs] = await pool.query(
    `SELECT s.id, s.plan_id, s.status, s.payment_provider, s.auto_renew,
            s.cancel_at_period_end, s.current_period_start, s.current_period_end,
            p.code AS plan_code, p.name AS plan_name, p.max_favorites, p.features_json
     FROM subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = ?
       AND s.status = 'active'
       AND (s.current_period_end IS NULL OR s.current_period_end > UTC_TIMESTAMP())
       AND p.code != 'free'
     ORDER BY s.current_period_end DESC, s.id DESC
     LIMIT 1`,
    [userId]
  );

  let activeSub = null;
  if (subs.length > 0) {
    activeSub = {
      ...subs[0],
      features: parseJson(subs[0].features_json, {})
    };
    delete activeSub.features_json;
  }

  return {
    ...user,
    is_active: Boolean(user.is_active),
    is_premium: Boolean(activeSub) || user.role === 'admin',
    subscription: activeSub
  };
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer && bearer !== 'null' && bearer !== 'undefined') {
      return bearer;
    }
  }
  return getSessionCookieToken(req);
}

const protect = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    throw new AppError('Authentication required. Please log in to continue.', 401, 'AUTH_REQUIRED');
  }

  const decoded = verifyToken(token);
  const user = await loadUserContext(decoded.sub);
  if (!user) {
    throw new AppError('User account no longer exists.', 401, 'USER_NOT_FOUND');
  }

  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    const user = await loadUserContext(decoded.sub);
    req.user = user || null;
  } catch (_) {
    req.user = null;
  }
  next();
});

module.exports = {
  protect,
  optionalAuth,
  extractBearerToken,
  loadUserContext
};
