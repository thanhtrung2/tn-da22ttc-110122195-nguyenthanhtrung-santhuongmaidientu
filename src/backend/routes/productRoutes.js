const express = require('express');
const router = express.Router();
const { createProduct, updateProduct, deleteProduct, getMyProducts, getAllProducts, getProductById, getCategories, getProductsByShop, getSearchSuggestions, moderateImageUpload } = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { uploadProduct } = require('../middleware/upload');

router.get('/categories', getCategories);
router.get('/shop/:gian_hang_id', getProductsByShop);
router.get('/suggest', getSearchSuggestions);
router.get('/', getAllProducts);
router.get('/my-products', authenticate, authorize('seller'), getMyProducts);
router.post('/moderate-image', authenticate, authorize('seller'), uploadProduct.single('hinh_anh'), moderateImageUpload);
router.get('/:id', getProductById);
router.post('/', authenticate, authorize('seller'), uploadProduct.fields([{ name: 'hinh_anh', maxCount: 1 }, { name: 'additional_images', maxCount: 9 }, { name: 'video', maxCount: 1 }]), createProduct);
router.put('/:id', authenticate, authorize('seller'), uploadProduct.fields([{ name: 'hinh_anh', maxCount: 1 }, { name: 'additional_images', maxCount: 9 }, { name: 'video', maxCount: 1 }]), updateProduct);
router.delete('/:id', authenticate, authorize('seller'), deleteProduct);

module.exports = router;
