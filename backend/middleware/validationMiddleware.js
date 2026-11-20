const { AppError } = require('./errorMiddleware');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,40}$/;

function sanitizeText(value, maxLength = 2000) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function validateEmail(email) {
  if (!email || !EMAIL_REGEX.test(String(email).trim())) {
    throw new AppError('Please enter a valid email address.', 400, 'INVALID_EMAIL');
  }
  return String(email).trim().toLowerCase();
}

function validateUsername(username) {
  if (!username || !USERNAME_REGEX.test(String(username).trim())) {
    throw new AppError(
      'Username must be 3-40 characters and contain only letters, numbers, dots, underscores, or hyphens.',
      400,
      'INVALID_USERNAME'
    );
  }
  return String(username).trim();
}

function validateHttpUrl(urlValue, fieldName = 'URL', required = false) {
  if (urlValue === null || urlValue === undefined || String(urlValue).trim() === '') {
    if (required) {
      throw new AppError(`${fieldName} is required.`, 400, 'VALIDATION_ERROR');
    }
    return null;
  }

  const raw = String(urlValue).trim();
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return parsed.toString().slice(0, 500);
  } catch (_) {
    throw new AppError(
      `${fieldName} must be a valid http:// or https:// URL.`,
      400,
      'INVALID_URL'
    );
  }
}

function validateEnum(value, allowedValues, fieldName, fallback = null) {
  if (value === null || value === undefined || value === '') {
    if (fallback !== null) return fallback;
    throw new AppError(`${fieldName} is required.`, 400, 'VALIDATION_ERROR');
  }
  const normalized = String(value).trim();
  if (!allowedValues.includes(normalized)) {
    throw new AppError(
      `Invalid ${fieldName}. Allowed values: ${allowedValues.join(', ')}.`,
      400,
      'INVALID_ENUM'
    );
  }
  return normalized;
}

function parsePagination(query, defaultLimit = 12, maxLimit = 50) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function requireBodyFields(fields) {
  return (req, _res, next) => {
    const missing = [];
    for (const field of fields) {
      const val = req.body ? req.body[field] : undefined;
      if (val === undefined || val === null || String(val).trim() === '') {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return next(
        new AppError(
          `Missing required fields: ${missing.join(', ')}.`,
          400,
          'MISSING_FIELDS',
          { missing }
        )
      );
    }
    next();
  };
}

module.exports = {
  sanitizeText,
  validateEmail,
  validateUsername,
  validateHttpUrl,
  validateEnum,
  parsePagination,
  requireBodyFields
};
