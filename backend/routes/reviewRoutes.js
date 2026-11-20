const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getApiReviews,
  upsertApiReview,
  deleteApiReview,
  createApiReport
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { sensitiveLimiter } = require('../middleware/rateLimitMiddleware');

router.get('/reviews', getApiReviews);
router.post('/reviews', protect, sensitiveLimiter, upsertApiReview);
router.delete('/reviews/:reviewId', protect, deleteApiReview);
router.post('/reports', protect, sensitiveLimiter, createApiReport);

module.exports = router;
