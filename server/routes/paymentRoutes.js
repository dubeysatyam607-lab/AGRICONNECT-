const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, isConfigured } = require('../controllers/paymentController');

router.get('/status', (req, res) => res.json({ configured: isConfigured() }));
router.post('/razorpay/create-order', createOrder);
router.post('/razorpay/verify', verifyPayment);

module.exports = router;
