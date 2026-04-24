const express = require('express');
const router = express.Router();
const { updateProfile, changePassword } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

router.put('/profile', authenticate, uploadAvatar.single('avatar'), updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
