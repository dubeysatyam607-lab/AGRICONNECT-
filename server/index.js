require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const imageRoutes = require('./routes/imageRoutes');
const chatController = require('./controllers/chatController');
const voiceController = require('./controllers/voiceController');
const whatsappController = require('./controllers/whatsappController');
const { protect } = require('./middleware/authMiddleware');
const app = express();

// Baseline security headers (CSP, X-Frame-Options, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);
app.set('trust proxy', 1);

// Redirect HTTP to HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.get('host')}${req.originalUrl}`);
  }
  next();
});

// CORS: restrict to explicitly allowed origins when ALLOWED_ORIGINS is configured.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Non-browser clients (curl, native apps) send no Origin header — allow them.
      if (!origin) return cb(null, true);
      // When no allowlist is configured, reject the request.
      if (allowedOrigins.length === 0) return cb(new Error('Origin not allowed by CORS'));
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// The WhatsApp webhook is a server-to-server call (Twilio) that cannot obtain a
// CSRF cookie. It is authenticated by its own bearer/verify token, so register
// it BEFORE global csurf to exempt it.
app.post('/api/whatsapp/webhook', whatsappController.whatsappWebhook);
app.use(csurf({ cookie: true }));

// Endpoint to get CSRF token for client
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', apiLimiter);

// Stricter limits for sensitive credential/OTP endpoints to resist brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  message: { message: 'Too many auth attempts. Please try again later.' },
});
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/resend-otp', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/admin', protect, adminRoutes);
app.post('/api/chat', protect, chatController.kisanChat);
app.post('/api/voice/tts', protect, voiceController.textToSpeech);

// Root route
app.get('/', (req, res) => {
  res.send('Agri-Connect API is running');
});

// Health / uptime probe for load balancers and uptime monitors.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // CSRF failures should surface as 403, not a generic 500
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  // Body-parser / JSON parse errors
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ message: 'Malformed request body' });
  }
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

// Connect to MongoDB
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
