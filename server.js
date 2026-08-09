const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { apiLimiter, authLimiter, sanitizeInput } = require('./middleware/security.middleware');

// Load environment variables
dotenv.config();

// Initialize Express application
const app = express();

// Trust reverse proxies (essential for Render, Vercel, Heroku, Cloudflare rate limiting)
app.set('trust proxy', 1);

// Connect Database
connectDB();

// ─── 1. Response Compression (Production Performance) ─────
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6 // Balanced speed vs compression ratio
}));

// ─── 2. Security Headers (Helmet) ─────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for client SPA flexibility & CDN loaded scripts (Chart.js)
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' }, // Prevents Clickjacking attacks
  xContentTypeOptions: true, // Prevents MIME sniffing
  referrerPolicy: { policy: 'same-origin' }
}));

// ─── 3. CORS Configuration (Production & Development) ─────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000', 'https://fintrack-personal-finance.onrender.com'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman, same-origin) or if allowedOrigins includes '*'
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow Render deployment subdomains (*.onrender.com)
    if (origin.endsWith('.onrender.com') || allowedOrigins.some(ao => ao.includes('.onrender.com') && origin.endsWith('.onrender.com'))) {
      return callback(null, true);
    }
    // Allow Vercel preview deployment subdomains if specified
    if (origin.endsWith('.vercel.app') || allowedOrigins.some(ao => ao.includes('.vercel.app') && origin.endsWith('.vercel.app'))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: Origin '${origin}' is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ─── 4. Body Parsing & NoSQL Query Injection Sanitizer ──
app.use(express.json({ limit: '1mb' })); // Protects against large payload DoS
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeInput); // Strips MongoDB $ and . operators from req.body, req.query, req.params

// ─── 5. Static Files & Cache Optimization ─────────
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true
};
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use(express.static(path.join(__dirname, 'client'), staticOptions));

// ─── 6. Rate Limiting ─────────────────────────────
// Apply global rate limiter to all API endpoints
app.use('/api', apiLimiter);

// Backend API Health Endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Personal Finance Tracker API is running smoothly and securely',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ─── 7. API Routes ────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const transactionRoutes = require('./routes/transaction.routes');
const budgetRoutes = require('./routes/budget.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

// Apply strict brute-force protection to authentication routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// ─── 8. Single Page Application Entrypoint ─────────
app.get('*', (req, res) => {
  const clientIndex = path.join(__dirname, 'client', 'index.html');
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const fs = require('fs');

  if (fs.existsSync(clientIndex)) {
    res.sendFile(clientIndex);
  } else if (fs.existsSync(publicIndex)) {
    res.sendFile(publicIndex);
  } else {
    res.send('Personal Finance Tracker API Server initialized successfully.');
  }
});

// ─── 9. Centralized Error Handling & Data Leak Prevention ──
app.use((err, req, res, next) => {
  console.error('API Error:', err.message || err);

  const statusCode = err.status || 500;
  const response = {
    status: 'error',
    message: err.message || 'Internal Server Error'
  };

  // Only include stack trace in development mode to prevent sensitive data exposure
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// ─── 10. Server Start & Graceful Shutdown ──────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in [${process.env.NODE_ENV || 'development'}] mode on port ${PORT}`);
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error(`💥 Unhandled Promise Rejection: ${err.message}`);
});

// Graceful shutdown on SIGTERM / SIGINT
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down HTTP server gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
