const express = require('express');
const router = express.Router();
const { createPromotion, getMyPromotions, updatePromotion, deletePromotion, checkPromotion } = require('../controllers/promotionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/check', authenticate, checkPromotion);
router.get('/', authenticate, authorize('seller'), getMyPromotions);
router.post('/', authenticate, authorize('seller'), createPromotion);
router.put('/:id', authenticate, authorize('seller'), updatePromotion);
router.delete('/:id', authenticate, authorize('seller'), deletePromotion);

module.exports = router;
