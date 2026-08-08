const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile, changePassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateRegister, validateLogin, validateProfileUpdate, validateChangePassword } = require('../middleware/validate.middleware');
const { passwordChangeLimiter } = require('../middleware/security.middleware');

// Public routes
router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);

// Protected routes (require valid JWT)
router.get('/me', protect, getMe);
router.put('/profile', protect, validateProfileUpdate, updateProfile);
router.put('/change-password', passwordChangeLimiter, protect, validateChangePassword, changePassword);
router.post('/change-password', passwordChangeLimiter, protect, validateChangePassword, changePassword);

module.exports = router;
