const express = require('express');
const router = express.Router();
const {
  createPromotionCampaign,
  getMyCampaigns,
  getCampaignById,
  getActiveSponsoredCampaigns,
  trackCampaignEvent
} = require('../controllers/promotionController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { sensitiveLimiter } = require('../middleware/rateLimitMiddleware');

router.get('/active', optionalAuth, getActiveSponsoredCampaigns);
router.post('/:id/event', optionalAuth, trackCampaignEvent);

router.post('/', protect, sensitiveLimiter, createPromotionCampaign);
router.get('/my-campaigns', protect, getMyCampaigns);
router.get('/:id', protect, getCampaignById);

module.exports = router;
