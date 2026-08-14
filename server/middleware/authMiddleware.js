const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/security');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256', 'HS384', 'HS512'] });

      // Reject short-lived MFA-pending tokens on all protected endpoints.
      if (decoded.mfaPending) {
        return res.status(401).json({ message: 'MFA verification required' });
      }

      const found = await User.findById(decoded.id);
      if (!found) {
        return res.status(401).json({ message: 'Not authorized, user no longer exists' });
      }
      req.user = found.select('-password');
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin protection middleware – ensures the authenticated user has admin role
const adminProtect = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user' });
  }
  if (req.user.role && req.user.role.toLowerCase() === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: admin access required' });
};

module.exports = { protect, adminProtect };
