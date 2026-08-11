// server/routes/adminRoutes.js
// Minimal admin route definitions – protected by adminProtect middleware

const express = require('express');
const router = express.Router();
const { adminProtect } = require('../middleware/authMiddleware');

// Example admin health check
router.get('/dashboard', adminProtect, (req, res) => {
  res.json({ message: 'Admin dashboard access verified', user: req.user });
});

// Add more admin endpoints here as needed (e.g., user management, KPI stats)

module.exports = router;
