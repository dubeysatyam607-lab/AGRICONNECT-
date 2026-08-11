const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyOTP,
  authUser,
  resendOTP,
  getUserProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', authUser);
router.post('/resend-otp', resendOTP);
router.get('/profile', protect, getUserProfile);

module.exports = router;
