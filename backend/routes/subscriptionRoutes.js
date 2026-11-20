const express = require('express');
const router = express.Router();
const {
  createSubscriptionCheckout,
  getMySubscription,
  cancelSubscription,
  reactivateAutoRenew
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { sensitiveLimiter } = require('../middleware/rateLimitMiddleware');

router.use(protect);
router.get('/me', getMySubscription);
router.post('/checkout', sensitiveLimiter, createSubscriptionCheckout);
router.post('/cancel', sensitiveLimiter, cancelSubscription);
router.post('/reactivate', sensitiveLimiter, reactivateAutoRenew);

module.exports = router;
