const express = require('express');
const router = express.Router();
const { createShop, getMyShop, updateShop, getShopById, getAllShops, getShopBySellerId } = require('../controllers/shopController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { uploadShop } = require('../middleware/upload');

router.get('/', getAllShops);
router.get('/my-shop', authenticate, getMyShop);
router.post('/', authenticate, uploadShop.single('logo'), createShop);
router.put('/', authenticate, authorize('seller'), uploadShop.single('logo'), updateShop);
router.get('/seller/:sellerId', getShopBySellerId);
router.get('/:id', getShopById);

module.exports = router;
