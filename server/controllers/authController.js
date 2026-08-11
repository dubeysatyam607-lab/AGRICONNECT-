const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { JWT_SECRET } = require('../config/security');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Generate 6-digit OTP from a cryptographically secure source
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
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
        return res.status(400).json({ message: 'User already exists and is verified. Please log in.' });
      }
      // If user exists but not verified, we can just resend OTP or update password
      // For simplicity, we'll update the user data
      userExists.name = name;
      userExists.password = password; // Will be hashed by pre-save hook
      const otp = generateOTP();
      const hashedOTP = await bcrypt.hash(otp, 10);
      userExists.otpCode = hashedOTP;
      userExists.otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      
      await userExists.save();
      await sendOTPEmail(email, otp);

      return res.status(200).json({ message: 'OTP sent to your email.' });
    }

    const otp = generateOTP();
    const otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    const hashedOTP = await bcrypt.hash(otp, 10);
    const user = await User.create({
      name,
      email,
      password,
      otpCode: hashedOTP,
      otpExpiresAt,
      isVerified: false
    });

    if (user) {
      await sendOTPEmail(user.email, otp);
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
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }

    if (!user.otpCode || !(await bcrypt.compare(otp, user.otpCode))) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (Date.now() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
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
        return res.status(401).json({ message: 'Please verify your email first. Use the register or resend OTP flow.' });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
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
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    user.otpCode = hashedOTP;
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000;
    await user.save();
    
    await sendOTPEmail(email, otp);
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

module.exports = {
  registerUser,
  verifyOTP,
  authUser,
  resendOTP,
  getUserProfile
};
