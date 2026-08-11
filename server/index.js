require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
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
  })
);

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', protect, adminRoutes);
app.post('/api/chat', protect, chatController.kisanChat);
app.post('/api/voice/tts', protect, voiceController.textToSpeech);
app.post('/api/whatsapp/webhook', whatsappController.whatsappWebhook);

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

// Error handling middleware
app.use((err, req, res, next) => {
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
