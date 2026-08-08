const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getDashboardStats } = require('../controllers/dashboard.controller');

// All dashboard routes require authentication
router.use(protect);

router.get('/stats', getDashboardStats);

module.exports = router;
