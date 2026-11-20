const express = require('express');
const router = express.Router();
const {
  listPublicProviders,
  getProviderByIdOrSlug,
  getMyProviderDashboard,
  createProviderProfile,
  updateProviderProfile
} = require('../controllers/providerController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { sensitiveLimiter } = require('../middleware/rateLimitMiddleware');

router.get('/', listPublicProviders);
router.get('/me/dashboard', protect, getMyProviderDashboard);
router.post('/profile', protect, sensitiveLimiter, createProviderProfile);
router.put('/profile', protect, updateProviderProfile);
router.get('/:id', optionalAuth, getProviderByIdOrSlug);

module.exports = router;
