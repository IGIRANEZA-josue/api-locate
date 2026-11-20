const { AppError } = require('./errorMiddleware');

function adminOnly(req, _res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(
      new AppError(
        'Administrator privileges are required to access this resource.',
        403,
        'ADMIN_REQUIRED'
      )
    );
  }
  next();
}

module.exports = {
  adminOnly
};
