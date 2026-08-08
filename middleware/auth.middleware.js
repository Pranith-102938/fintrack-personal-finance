const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User.model');

// Protect routes — verify JWT token from Authorization header
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from "Bearer <token>" header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized. No authentication token provided.'
      });
    }

    // Verify token secret presence
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      return res.status(500).json({
        status: 'error',
        message: 'Internal server security configuration error.'
      });
    }

    // Verify token signature and expiration
    const decoded = jwt.verify(token, secret);

    // Validate decoded ID format to prevent Mongoose cast errors
    if (!decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid user token payload.'
      });
    }

    // Attach full user document to request
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User associated with this token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT error types
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authentication token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication token has expired. Please log in again.'
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Not authorized.'
    });
  }
};

module.exports = { protect };
