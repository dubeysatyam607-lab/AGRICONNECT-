const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyOTP,
  authUser,
  resendOTP,
  getUserProfile,
  forgotPassword,
  resetPassword,
  enableMfa,
  verifyMfa,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { verifyRecaptcha } = require('../middleware/recaptcha');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', verifyRecaptcha, authUser);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getUserProfile);
router.post('/enable-mfa', protect, enableMfa);
router.post('/verify-mfa', protect, verifyMfa);

module.exports = router;
