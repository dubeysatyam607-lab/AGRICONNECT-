const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { JWT_SECRET } = require('../config/security');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (id, expiresIn = '30d', extra = {}) => {
  return jwt.sign({ id, ...extra }, JWT_SECRET, { expiresIn });
};

// Generate 6-digit OTP from a cryptographically secure source.
// Optionally guarantees it differs from a previous OTP (never reuse an old code).
const generateOTP = (previous) => {
  let otp;
  do {
    otp = crypto.randomInt(100000, 1000000).toString();
  } while (previous && otp === previous);
  return otp;
};

// OTP validity window (5 minutes) — single source of truth on the server.
const OTP_TTL_MS = 5 * 60 * 1000;
// Maximum allowed verification attempts per OTP before it is invalidated.
const MAX_OTP_ATTEMPTS = 5;

// Build a new OTP record (hash only — never plain text) for a user/application.
// `lastIssuedOtps` keeps the most recent plain code in memory (bounded by TTL)
// purely to guarantee a freshly generated OTP differs from the previous one.
// Plain codes are never written to the database or logged.
const lastIssuedOtps = new Map(); // email -> { plain, expiresAt }

const getLastIssuedOtp = (email) => {
  const entry = lastIssuedOtps.get(email);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    lastIssuedOtps.delete(email);
    return undefined;
  }
  return entry.plain;
};

const newOtpRecord = async (email) => {
  const previous = getLastIssuedOtp(email);
  const otp = generateOTP(previous);
  lastIssuedOtps.set(email, { plain: otp, expiresAt: Date.now() + OTP_TTL_MS });
  return {
    otpCode: await bcrypt.hash(otp, 10),
    otpCreatedAt: new Date().toISOString(),
    otpExpiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    otpAttempts: 0,
    otpVerified: false,
    plain: otp, // transient, returned to caller only to send via email
  };
};

// Constant-time OTP comparison to resist timing attacks
const otpMatches = (expected, provided) => {
  if (!expected || typeof provided !== 'string' || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
};

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send OTP Email
const sendOTPEmail = async (email, otp) => {
  if (!process.env.EMAIL_USER) {
    // Never log OTPs — even in dev, they can land in CI logs or shared shells.
    console.log(`[Mock Email] OTP email to ${email} skipped (EMAIL_USER not configured)`);
    return; // Skip actual sending if no credentials
  }

  const mailOptions = {
    from: `"Agri-Connect" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Agri-Connect Verification OTP',
    text: `Your OTP for Agri-Connect registration is: ${otp}. It will expire in 5 minutes.`,
    html: `<h3>Welcome to Agri-Connect!</h3>
           <p>Your OTP for registration is: <strong>${otp}</strong></p>
           <p>It will expire in 5 minutes.</p>`
  };

  await transporter.sendMail(mailOptions);
};

// @desc    Register a new user & send OTP
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      if (userExists.isVerified) {
        // Keep registration response uniform — do not reveal account existence.
        return res.status(200).json({ message: 'Registration initiated. OTP sent to your email.' });
      }
      // If user exists but not verified, we can just resend OTP or update password
      // For simplicity, we'll update the user data
      userExists.name = name;
      userExists.password = password; // Will be hashed by pre-save hook
      const otp = await newOtpRecord(email);
      userExists.otpCode = otp.otpCode;
      userExists.otpCreatedAt = otp.otpCreatedAt;
      userExists.otpExpiresAt = otp.otpExpiresAt;
      userExists.otpAttempts = 0;
      userExists.otpVerified = false;

      await userExists.save();
      await sendOTPEmail(email, otp.plain);

      return res.status(200).json({ message: 'OTP sent to your email.' });
    }

    const otp = await newOtpRecord(email);

    const hashedOTP = otp.otpCode;
    const user = await User.create({
      name,
      email,
      password,
      otpCode: hashedOTP,
      otpCreatedAt: otp.otpCreatedAt,
      otpExpiresAt: otp.otpExpiresAt,
      otpAttempts: 0,
      otpVerified: false,
      isVerified: false
    });

    if (user) {
      await sendOTPEmail(user.email, otp.plain);
      res.status(201).json({ message: 'Registration initiated. OTP sent to your email.' });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Invalid verification attempt' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }

    if (!user.otpCode) {
      return res.status(400).json({ message: 'No OTP has been issued for this account yet' });
    }

    // 1) Expiry is enforced from the server/database expires_at — never the client timer.
    const expiresAt = user.otpExpiresAt ? new Date(user.otpExpiresAt).getTime() : 0;
    if (!user.otpExpiresAt || Date.now() > expiresAt) {
      // Expired: invalidate the OTP so it can never be reused.
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
      user.otpCreatedAt = undefined;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please resend a new OTP.' });
    }

    // 2) Brute-force protection: maximum verification attempts per OTP.
    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      // Exhausted: invalidate the OTP to force a fresh resend.
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
      user.otpCreatedAt = undefined;
      await user.save();
      return res.status(429).json({ message: 'Too many incorrect attempts. Please resend a new OTP.' });
    }

    // 3) Wrong code → increment attempts, never reveal the code.
    if (!(await bcrypt.compare(String(otp || ''), user.otpCode))) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        // Exhausted: invalidate immediately so the OTP can never be reused.
        user.otpCode = undefined;
        user.otpExpiresAt = undefined;
        user.otpCreatedAt = undefined;
        await user.save();
        return res.status(429).json({ message: 'Too many incorrect attempts. Please resend a new OTP.' });
      }
      await user.save();
      const remaining = MAX_OTP_ATTEMPTS - user.otpAttempts;
      return res.status(400).json({ message: `Invalid OTP. ${remaining} attempt(s) remaining.` });
    }

    // 4) Mark as verified and clear OTP
    user.isVerified = true;
    user.otpVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    user.otpCreatedAt = undefined;
    await user.save();

    res.status(200).json({
      message: 'Email verified successfully',
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if (!user.isVerified) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // If MFA is enabled, do NOT issue a full-access token. Instead issue a
      // short-lived "pending MFA" token that only verifyMfa can upgrade.
      if (user.mfaEnabled && user.mfaSecret) {
        const pendingToken = generateToken(user._id, '5m', { mfaPending: true });
        return res.status(200).json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          mfaRequired: true,
          mfaToken: pendingToken,
          mfaEnabled: true,
        });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
        mfaEnabled: false,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
      // Uniform response: don't reveal whether the account exists.
      return res.status(400).json({ message: 'Cannot resend OTP for this email' });
    }

    // Resend is only allowed AFTER the current OTP has expired. The same OTP
    // stays valid for the full 5-minute window.
    const expiresAt = user.otpExpiresAt ? new Date(user.otpExpiresAt).getTime() : 0;
    if (user.otpCode && user.otpExpiresAt && Date.now() <= expiresAt) {
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      return res.status(429).json({
        message: `The current OTP is still valid. Please wait ${remaining}s before requesting a new one.`,
      });
    }

    // Invalidate the previous OTP immediately and generate a completely new code.
    const otp = await newOtpRecord(email);
    user.otpCode = otp.otpCode;
    user.otpCreatedAt = otp.otpCreatedAt;
    user.otpExpiresAt = otp.otpExpiresAt;
    user.otpAttempts = 0;
    user.otpVerified = false;
    await user.save();

    await sendOTPEmail(email, otp.plain);
    res.status(200).json({ message: 'New OTP sent to your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during resend OTP' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Forgot password - send reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email });

    if (!user || !user.isVerified) {
      // Uniform response — never reveal whether the account exists or its state.
      return res.status(200).json({ message: 'If the email exists, a password reset OTP has been sent.' });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    user.resetOtpCode = hashedOTP;
    user.resetOtpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes for password reset
    user.resetOtpAttempts = 0;
    await user.save();

    await sendPasswordResetEmail(email, otp);

    res.status(200).json({ message: 'If the email exists, a password reset OTP has been sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

// Send Password Reset Email
const sendPasswordResetEmail = async (email, otp) => {
  if (!process.env.EMAIL_USER) {
    console.log(`[Mock Email] Password reset OTP email to ${email} skipped (EMAIL_USER not configured)`);
    return;
  }

  const mailOptions = {
    from: `"Agri-Connect" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Agri-Connect Password Reset OTP',
    text: `Your OTP for Agri-Connect password reset is: ${otp}. It will expire in 10 minutes.`,
    html: `<h3>Password Reset Request</h3>
           <p>Your OTP for password reset is: <strong>${otp}</strong></p>
           <p>It will expire in 10 minutes.</p>
           <p>If you didn't request this, please ignore this email.</p>`
  };

  await transporter.sendMail(mailOptions);
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Please provide email, OTP, and new password' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const user = await User.findOne({ email });

    if (!user || !user.resetOtpCode) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Brute-force protection for reset OTP (same 5-attempt cap as verify-otp)
    if (user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      user.resetOtpCode = undefined;
      user.resetOtpExpiresAt = undefined;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    if (!(await bcrypt.compare(String(otp || ''), user.resetOtpCode))) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      if (user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
        user.resetOtpCode = undefined;
        user.resetOtpExpiresAt = undefined;
        user.resetOtpAttempts = 0;
        await user.save();
        return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
      }
      await user.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (Date.now() > user.resetOtpExpiresAt) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Update password and clear reset OTP
    user.password = newPassword; // Will be hashed by pre-save hook
    user.resetOtpCode = undefined;
    user.resetOtpExpiresAt = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// @desc Enable MFA for user
// @route POST /api/auth/enable-mfa
// @access Private
const enableMfa = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = authenticator.generateSecret();
    user.mfaSecret = secret;
    user.mfaEnabled = true;
    await user.save();

    const otpauth = authenticator.keyuri(user.email, 'Agri-Connect', secret);
    QRCode.toDataURL(otpauth, (err, dataUrl) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to generate QR code' });
      }
      res.json({ message: 'MFA enabled', qrCode: dataUrl, secret });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error enabling MFA' });
  }
};

// @desc Verify MFA token
// @route POST /api/auth/verify-mfa
// @access Private
const verifyMfa = async (req, res) => {
  const { token, mfaToken } = req.body;
  try {
    // The mfaToken (from login) is required to prove the password step completed.
    let pending;
    try {
      pending = jwt.verify(String(mfaToken || token || ''), JWT_SECRET, { algorithms: ['HS256', 'HS384', 'HS512'] });
    } catch {
      return res.status(401).json({ message: 'MFA challenge expired. Please log in again.' });
    }
    if (!pending.mfaPending) {
      return res.status(401).json({ message: 'Invalid MFA challenge.' });
    }

    const user = await User.findById(pending.id);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ message: 'MFA not set up' });
    }
    const isValid = authenticator.check(token, user.mfaSecret);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid MFA token' });
    }
    const jwtToken = generateToken(user._id);
    res.json({ message: 'MFA verified', token: jwtToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error verifying MFA' });
  }
};

module.exports = {
  enableMfa,
  verifyMfa,
  registerUser,
  verifyOTP,
  authUser,
  resendOTP,
  getUserProfile,
  forgotPassword,
  resetPassword
};
