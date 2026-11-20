const express = require('express');
const router = express.Router();
const {
  getHomepageData,
  listAndSearchApis,
  getApiByIdOrSlug,
  createApi,
  updateApi,
  deleteApi,
  compareApis,
  getRecommendations,
  triggerStatusCheck
} = require('../controllers/apiController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { premiumOnly } = require('../middleware/premiumMiddleware');
const { sensitiveLimiter } = require('../middleware/rateLimitMiddleware');
const reviewRoutes = require('./reviewRoutes');

router.get('/homepage', optionalAuth, getHomepageData);
router.get('/search', optionalAuth, listAndSearchApis);
router.get('/recommendations', protect, premiumOnly('API recommendations'), getRecommendations);
router.get('/compare', protect, premiumOnly('Side-by-side API comparison'), compareApis);
router.post('/compare', protect, premiumOnly('Side-by-side API comparison'), compareApis);

router.get('/', optionalAuth, listAndSearchApis);
router.post('/', protect, sensitiveLimiter, createApi);

router.use('/:id', reviewRoutes);

router.post('/:id/check-status', protect, sensitiveLimiter, triggerStatusCheck);
router.get('/:id', optionalAuth, getApiByIdOrSlug);
router.put('/:id', protect, updateApi);
router.delete('/:id', protect, deleteApi);

module.exports = router;
