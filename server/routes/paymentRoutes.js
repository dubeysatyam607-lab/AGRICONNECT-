const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, isConfigured } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/status', (req, res) => res.json({ configured: isConfigured() }));
router.post('/razorpay/create-order', protect, createOrder);
router.post('/razorpay/verify', protect, verifyPayment);

module.exports = router;
