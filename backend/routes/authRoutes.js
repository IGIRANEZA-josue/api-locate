const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getSession,
  getProfile,
  logout,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/session', getSession);
router.post('/logout', logout);
router.get('/profile', protect, getProfile);
router.get('/me', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;
