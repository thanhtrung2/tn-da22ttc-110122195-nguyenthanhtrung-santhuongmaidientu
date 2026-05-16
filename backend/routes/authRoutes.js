const express = require('express');
const router = express.Router();
const { register, login, getProfile, uploadVerification, googleLogin } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', uploadVerification, register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.get('/profile', authenticate, getProfile);

module.exports = router;
