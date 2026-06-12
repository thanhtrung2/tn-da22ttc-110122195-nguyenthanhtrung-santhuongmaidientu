const express = require('express');
const router = express.Router();
const {
    createOrder, getMyOrders, getOrderById, cancelOrder,
    updateOrderStatus, getShopOrders, completeOrderCustomer,
    approveCancelRequest, rejectCancelRequest, getCancelRequests, sellerCancelOrder,
    createOrderBuyNow
} = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.post('/', authenticate, createOrder);
router.post('/buy-now', authenticate, createOrderBuyNow);
router.get('/', authenticate, getMyOrders);

// Seller endpoints
router.get('/shop-orders', authenticate, authorize('seller'), getShopOrders);
router.get('/cancel-requests', authenticate, authorize('seller'), getCancelRequests);
router.put('/:id/seller-cancel', authenticate, authorize('seller'), sellerCancelOrder);
router.put('/:id/status', authenticate, authorize('seller'), updateOrderStatus);

// Customer / shared endpoints
router.get('/:id', authenticate, getOrderById);
router.put('/:id/cancel', authenticate, cancelOrder);
router.put('/:id/complete', authenticate, completeOrderCustomer);

// Cancel request handling (seller)
router.post('/cancel-requests/:id/approve', authenticate, authorize('seller'), approveCancelRequest);
router.post('/cancel-requests/:id/reject', authenticate, authorize('seller'), rejectCancelRequest);

module.exports = router;
