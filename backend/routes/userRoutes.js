const express = require('express');
const router = express.Router();
const {
  getDashboardOverview,
  getMySubmissions,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/dashboard', getDashboardOverview);
router.get('/my-submissions', getMySubmissions);
router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);

module.exports = router;
