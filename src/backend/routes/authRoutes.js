const express = require('express');
const router = express.Router();
const { register, login, getProfile, uploadVerification, googleLogin, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', uploadVerification, register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', authenticate, getProfile);

module.exports = router;
