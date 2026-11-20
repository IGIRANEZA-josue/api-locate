const { AppError } = require('./errorMiddleware');

function premiumOnly(featureLabel = 'This developer feature') {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));
    }

    if (!req.user.is_premium && req.user.role !== 'admin') {
      return next(
        new AppError(
          `${featureLabel} requires an active API Locate Premium subscription.`,
          403,
          'PREMIUM_REQUIRED',
          { upgrade_url: '/pricing' }
        )
      );
    }

    next();
  };
}

module.exports = {
  premiumOnly
};
