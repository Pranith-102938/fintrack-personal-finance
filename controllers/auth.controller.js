const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Helper: Generate JWT token with user ID payload
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/v1/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists.'
      });
    }

    // Create new user (password is hashed by the pre-save hook in User model)
    const user = await User.create({ name, email, password });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    // Handle Mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists.'
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: messages[0]
      });
    }

    console.error('Register Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error during registration. Please try again.'
    });
  }
};

// POST /api/v1/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email and explicitly include password field for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    // Compare provided password with stored hash
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      message: `Welcome back, ${user.name}!`,
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login. Please try again.'
    });
  }
};

// GET /api/v1/auth/me — Get current authenticated user profile
const getMe = async (req, res) => {
  try {
    // req.user is attached by the protect middleware
    res.status(200).json({
      status: 'success',
      user: req.user.toSafeObject()
    });
  } catch (error) {
    console.error('GetMe Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user profile.'
    });
  }
};

// PUT /api/v1/auth/profile — Update authenticated user profile
const updateProfile = async (req, res) => {
  try {
    const { name, email, currency, monthlyIncomeTarget, avatar } = req.body;

    // Security Hardening: Ignore any body ID fields to prevent unauthorized cross-account identity manipulation
    delete req.body._id;
    delete req.body.id;
    delete req.body.userId;

    // If email is being changed, check it doesn't belong to another user
    if (email && email !== req.user.email) {
      const emailTaken = await User.findOne({ email });
      if (emailTaken) {
        return res.status(400).json({
          status: 'error',
          message: 'This email address is already in use by another account.'
        });
      }
    }

    // Update only allowed profile attributes on authenticated req.user
    if (name !== undefined) req.user.name = name;
    if (email !== undefined) req.user.email = email;
    if (currency !== undefined) req.user.currency = currency;
    if (monthlyIncomeTarget !== undefined) req.user.monthlyIncomeTarget = monthlyIncomeTarget;
    if (avatar !== undefined) req.user.avatar = avatar;

    await req.user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully.',
      user: req.user.toSafeObject()
    });
  } catch (error) {
    console.error('UpdateProfile Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile.'
    });
  }
};

// PUT /api/v1/auth/change-password — Change user password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch user explicitly using authenticated req.user._id attached by protect middleware
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    // Verify current password against stored hash
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect.'
      });
    }

    // Validate new password rules
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters.'
      });
    }

    // Update to new password (pre-save hook will hash it with bcrypt 10 rounds)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('ChangePassword Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password.'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword
};
