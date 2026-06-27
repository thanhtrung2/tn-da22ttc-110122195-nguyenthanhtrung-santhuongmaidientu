const express = require('express');
const router = express.Router();
const { createPromotion, getMyPromotions, getShopPromotions, savePromotion, getMyWalletPromotions, getHomePromotions, updatePromotion, deletePromotion, checkPromotion } = require('../controllers/promotionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/home', getHomePromotions);
router.get('/check', authenticate, checkPromotion);
router.get('/wallet', authenticate, getMyWalletPromotions);
router.post('/save/:id', authenticate, savePromotion);
router.get('/shop/:shopId', getShopPromotions);
router.get('/', authenticate, authorize('seller'), getMyPromotions);
router.post('/', authenticate, authorize('seller'), createPromotion);
router.put('/:id', authenticate, authorize('seller'), updatePromotion);
router.delete('/:id', authenticate, authorize('seller'), deletePromotion);

module.exports = router;
