const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { generateToken, verifyToken } = require('../utils/generateToken');
const { setSessionCookie, clearSessionCookie } = require('../utils/sessionCookie');
const { loadUserContext, extractBearerToken } = require('../middleware/authMiddleware');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  validateEmail,
  validateUsername,
  validateHttpUrl,
  validateEnum,
  sanitizeText
} = require('../middleware/validationMiddleware');
const { createNotification } = require('../services/notificationService');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

async function enrichUserWithCounts(user) {
  if (!user) return null;
  const [[[favRow]], [[notifRow]]] = await Promise.all([
    pool.query('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?', [user.id]),
    pool.query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [user.id])
  ]);
  return {
    ...user,
    favorites_count: Number(favRow?.count || 0),
    unread_notifications_count: Number(notifRow?.count || 0)
  };
}

const register = asyncHandler(async (req, res) => {
  const username = validateUsername(req.body.username);
  const email = validateEmail(req.body.email);
  const password = String(req.body.password || '');
  const confirmPassword = req.body.confirm_password !== undefined ? String(req.body.confirm_password) : null;
  const fullName = sanitizeText(req.body.full_name, 120);
  const rememberMe = req.body.remember_me !== false;
  const themePreference = validateEnum(
    req.body.theme_preference,
    ['light', 'dark', 'system'],
    'Theme preference',
    'light'
  );

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
  }

  if (confirmPassword !== null && password !== confirmPassword) {
    throw new AppError('Passwords do not match. Please verify your password.', 400, 'PASSWORD_MISMATCH');
  }

  const [existing] = await pool.query(
    'SELECT id, username, email FROM users WHERE LOWER(email) = ? OR LOWER(username) = LOWER(?) LIMIT 1',
    [email, username]
  );

  if (existing.length > 0) {
    if (existing[0].email.toLowerCase() === email) {
      throw new AppError('An account with this email address already exists. Try signing in instead.', 409, 'EMAIL_TAKEN');
    }
    throw new AppError('This username is already taken.', 409, 'USERNAME_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [result] = await pool.query(
    `INSERT INTO users (username, email, password_hash, full_name, role, theme_preference, last_login_at)
     VALUES (?, ?, ?, ?, 'user', ?, UTC_TIMESTAMP())`,
    [username, email, passwordHash, fullName, themePreference]
  );

  const userId = result.insertId;

  await createNotification(pool, {
    userId,
    type: 'welcome',
    title: 'Welcome to API Locate!',
    message: 'Discover verified APIs, save favorites, submit community resources, or create a provider profile.',
    linkUrl: '/explore'
  });

  const baseUser = await loadUserContext(userId);
  const user = await enrichUserWithCounts(baseUser);
  const token = generateToken(user, { expiresIn: rememberMe ? '30d' : '24h' });

  setSessionCookie(req, res, token, rememberMe);

  res.status(201).json({
    success: true,
    message: 'Account registered successfully.',
    token,
    remember_me: rememberMe,
    user
  });
});

const login = asyncHandler(async (req, res) => {
  const rawIdentifier = req.body.identifier ?? req.body.email ?? req.body.username ?? '';
  const identifier = String(rawIdentifier).trim();
  const password = String(req.body.password || '');
  const rememberMe = req.body.remember_me !== false;

  if (!identifier || !password) {
    throw new AppError('Email (or username) and password are required.', 400, 'MISSING_CREDENTIALS');
  }

  const normalized = identifier.toLowerCase();
  const [rows] = await pool.query(
    `SELECT id, username, email, password_hash, role, is_active
     FROM users
     WHERE LOWER(email) = ? OR LOWER(username) = ?
     LIMIT 1`,
    [normalized, normalized]
  );

  if (rows.length === 0) {
    throw new AppError('Invalid email/username or password.', 401, 'INVALID_CREDENTIALS');
  }

  const record = rows[0];
  if (!record.is_active) {
    throw new AppError('Your account has been suspended. Please contact an administrator.', 403, 'ACCOUNT_SUSPENDED');
  }

  const passwordValid = await bcrypt.compare(password, record.password_hash);
  if (!passwordValid) {
    throw new AppError('Invalid email/username or password.', 401, 'INVALID_CREDENTIALS');
  }

  await pool.query('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [record.id]);

  const baseUser = await loadUserContext(record.id);
  const user = await enrichUserWithCounts(baseUser);
  const token = generateToken(user, { expiresIn: rememberMe ? '30d' : '24h' });

  setSessionCookie(req, res, token, rememberMe);

  res.json({
    success: true,
    message: 'Logged in successfully.',
    token,
    remember_me: rememberMe,
    user
  });
});

const getSession = asyncHandler(async (req, res) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.json({
      success: true,
      authenticated: false,
      token: null,
      user: null
    });
  }

  try {
    const decoded = verifyToken(token);
    const baseUser = await loadUserContext(decoded.sub);
    if (!baseUser) {
      clearSessionCookie(req, res);
      return res.json({
        success: true,
        authenticated: false,
        token: null,
        user: null
      });
    }

    const user = await enrichUserWithCounts(baseUser);
    // Rolling 30-day session refresh so returning users stay signed in seamlessly
    const refreshedToken = generateToken(user, { expiresIn: '30d' });
    setSessionCookie(req, res, refreshedToken, true);

    return res.json({
      success: true,
      authenticated: true,
      token: refreshedToken,
      user
    });
  } catch (_) {
    clearSessionCookie(req, res);
    return res.json({
      success: true,
      authenticated: false,
      token: null,
      user: null
    });
  }
});

const getProfile = asyncHandler(async (req, res) => {
  const baseUser = await loadUserContext(req.user.id);
  const user = await enrichUserWithCounts(baseUser);

  res.json({
    success: true,
    user
  });
});

const logout = asyncHandler(async (req, res) => {
  clearSessionCookie(req, res);
  res.json({
    success: true,
    message: 'Signed out successfully.'
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updates = [];
  const params = [];

  if (req.body.username !== undefined) {
    const username = validateUsername(req.body.username);
    const [dups] = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1',
      [username, userId]
    );
    if (dups.length > 0) {
      throw new AppError('This username is already taken.', 409, 'USERNAME_TAKEN');
    }
    updates.push('username = ?');
    params.push(username);
  }

  if (req.body.full_name !== undefined) {
    updates.push('full_name = ?');
    params.push(sanitizeText(req.body.full_name, 120));
  }

  if (req.body.avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    params.push(validateHttpUrl(req.body.avatar_url, 'Avatar URL', false));
  }

  if (req.body.bio !== undefined) {
    updates.push('bio = ?');
    params.push(sanitizeText(req.body.bio, 1000));
  }

  if (req.body.theme_preference !== undefined) {
    const theme = validateEnum(
      req.body.theme_preference,
      ['light', 'dark', 'system'],
      'Theme preference'
    );
    updates.push('theme_preference = ?');
    params.push(theme);
  }

  if (req.body.new_password) {
    const currentPassword = String(req.body.current_password || '');
    const newPassword = String(req.body.new_password || '');

    if (!currentPassword) {
      throw new AppError('Current password is required to set a new password.', 400, 'CURRENT_PASSWORD_REQUIRED');
    }
    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
    }

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
    const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!matches) {
      throw new AppError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    updates.push('password_hash = ?');
    params.push(newHash);
  }

  if (updates.length > 0) {
    params.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const baseUser = await loadUserContext(userId);
  const user = await enrichUserWithCounts(baseUser);
  const freshToken = generateToken(user, { expiresIn: '30d' });
  setSessionCookie(req, res, freshToken, true);

  res.json({
    success: true,
    message: 'Profile updated successfully.',
    token: freshToken,
    user
  });
});

module.exports = {
  register,
  login,
  getSession,
  getProfile,
  logout,
  updateProfile
};
