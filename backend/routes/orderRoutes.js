const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrderById, cancelOrder, updateOrderStatus, getShopOrders, completeOrderCustomer } = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.post('/', authenticate, createOrder);
router.get('/', authenticate, getMyOrders);
router.get('/shop-orders', authenticate, authorize('seller'), getShopOrders);
router.get('/:id', authenticate, getOrderById);
router.put('/:id/cancel', authenticate, cancelOrder);
router.put('/:id/complete', authenticate, completeOrderCustomer);
router.put('/:id/status', authenticate, authorize('seller'), updateOrderStatus);

module.exports = router;
