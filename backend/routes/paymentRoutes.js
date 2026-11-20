const express = require('express');
const router = express.Router();
const { getPaymentHistory, handlePaymentWebhook } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/webhook', handlePaymentWebhook);
router.get('/history', protect, getPaymentHistory);

module.exports = router;
