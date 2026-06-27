const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword, upgradeToSeller, uploadSellerVerification, cancelSellerRegistration } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, uploadAvatar.single('avatar'), updateProfile);
router.post('/change-password', authenticate, changePassword);
router.post('/upgrade-to-seller', authenticate, uploadSellerVerification, upgradeToSeller);
router.delete('/seller-registration', authenticate, cancelSellerRegistration);

module.exports = router;
