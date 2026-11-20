const jwt = require('jsonwebtoken');

function generateToken(user, options = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET environment variable must be configured with at least 16 characters.');
  }

  const expiresIn = options.expiresIn || process.env.JWT_EXPIRES_IN || '30d';

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      username: user.username
    },
    secret,
    { expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken
};
