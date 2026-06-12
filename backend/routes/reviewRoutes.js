const express = require('express');
const router = express.Router();
const { createReview, getProductReviews, getShopReviews, replyReview } = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, createReview);
router.get('/product/:productId', getProductReviews);
router.get('/shop', authenticate, getShopReviews);
router.post('/:reviewId/reply', authenticate, replyReview);

module.exports = router;
