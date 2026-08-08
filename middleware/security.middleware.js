const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// 1. Global API Rate Limiter — 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    status: 'error',
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  }
});

// 2. Strict Authentication Rate Limiter — 10 attempts per 15 minutes per IP (protects against brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many login or authentication attempts. Please try again after 15 minutes.'
  }
});

// 3. Password Change Rate Limiter — 5 attempts per 15 minutes per IP
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 password change attempts per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many password change attempts. Please try again after 15 minutes.'
  }
});

// 4. NoSQL Query Injection Sanitizer Middleware
const sanitizeInput = mongoSanitize({
  allowDots: false,
  replaceWith: '_'
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordChangeLimiter,
  sanitizeInput
};
