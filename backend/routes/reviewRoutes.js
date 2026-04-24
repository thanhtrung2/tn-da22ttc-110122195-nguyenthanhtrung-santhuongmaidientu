const express = require('express');
const router = express.Router();
const { createReview, getProductReviews } = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, createReview);
router.get('/product/:productId', getProductReviews);

module.exports = router;
