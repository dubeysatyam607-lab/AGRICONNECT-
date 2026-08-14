// server/routes/adminRoutes.js
// Minimal admin route definitions – protected by adminProtect middleware

const express = require('express');
const router = express.Router();
const { adminProtect } = require('../middleware/authMiddleware');

// Example admin health check
router.get('/dashboard', adminProtect, (req, res) => {
  const u = req.user || {};
  res.json({
    message: 'Admin dashboard access verified',
    user: {
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isVerified: u.isVerified,
      mfaEnabled: !!u.mfaEnabled,
      createdAt: u.createdAt,
    },
  });
});

// Add more admin endpoints here as needed (e.g., user management, KPI stats)

module.exports = router;
