const express = require('express');
const router = express.Router();
const { createProduct, updateProduct, deleteProduct, getMyProducts, getAllProducts, getProductById, getCategories, getProductsByShop, getSearchSuggestions } = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { uploadProduct } = require('../middleware/upload');

router.get('/categories', getCategories);
router.get('/shop/:gian_hang_id', getProductsByShop);
router.get('/suggest', getSearchSuggestions);
router.get('/', getAllProducts);
router.get('/my-products', authenticate, authorize('seller'), getMyProducts);
router.get('/:id', getProductById);
router.post('/', authenticate, authorize('seller'), uploadProduct.single('hinh_anh'), createProduct);
router.put('/:id', authenticate, authorize('seller'), uploadProduct.single('hinh_anh'), updateProduct);
router.delete('/:id', authenticate, authorize('seller'), deleteProduct);

module.exports = router;
