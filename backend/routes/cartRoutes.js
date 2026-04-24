const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeCartItem, clearCart, getCartCount } = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getCart);
router.get('/count', authenticate, getCartCount);
router.post('/', authenticate, addToCart);
router.put('/:id', authenticate, updateCartItem);
router.delete('/clear', authenticate, clearCart);
router.delete('/:id', authenticate, removeCartItem);

module.exports = router;
