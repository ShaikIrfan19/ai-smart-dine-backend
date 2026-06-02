// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, verifyOTP, forgotPassword, resetPassword, firebaseLogin, refreshToken, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/firebase-login', firebaseLogin);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getMe);

module.exports = router;
