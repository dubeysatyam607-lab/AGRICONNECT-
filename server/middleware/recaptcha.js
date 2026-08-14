const fetch = require('node-fetch');

/**
 * Middleware to verify Google reCAPTCHA v3 token.
 * Expects the client to send `recaptchaToken` in the request body.
 * The secret key should be provided via the `RECAPTCHA_SECRET` environment variable.
 */
const verifyRecaptcha = async (req, res, next) => {
  try {
    const token = req.body.recaptchaToken;
    if (!token) {
      return res.status(400).json({ message: 'Missing reCAPTCHA token' });
    }

    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) {
      console.warn('reCAPTCHA secret not configured; skipping verification');
      return next(); // In dev environments allow without verification.
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`;
    const response = await fetch(verificationUrl, { method: 'POST' });
    const data = await response.json();

    // Google returns { success: true, score: 0.xx, action: 'login' }
    if (!data.success || (data.score !== undefined && data.score < 0.5)) {
      return res.status(403).json({ message: 'reCAPTCHA verification failed' });
    }

    // Optionally attach the score/action to the request for logging.
    req.recaptcha = { score: data.score, action: data.action };
    return next();
  } catch (err) {
    console.error('reCAPTCHA verification error:', err);
    return res.status(500).json({ message: 'Server error during reCAPTCHA verification' });
  }
};

module.exports = { verifyRecaptcha };
