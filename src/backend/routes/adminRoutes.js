const express = require('express');
const router = express.Router();
const { 
    getDashboard, getAllUsers, toggleUserStatus, adminUpdateUser, adminDeleteUser,
    adminGetProducts, adminUpdateProduct, 
    adminGetOrders, adminGetOrderById, adminGetShops, adminUpdateShop,
    adminGetShopRevenue, adminGetShopOrders,
    adminGetRevenue, adminGetRevenueOrders,
    getSellerDashboard, sellerGetRevenue,
    getPendingSellers, verifySellerAccount,
    getPendingProducts, approveProduct,
    getTrainingData, addTrainingSample, deleteTrainingSample,
    trainModerationModel, testModeration,
    adminGetVouchers, adminCreateVoucher, adminDeleteVoucher, adminUpdateVoucher
} = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Admin routes
router.get('/dashboard', authenticate, authorize('admin'), getDashboard);
router.get('/users', authenticate, authorize('admin'), getAllUsers);
router.put('/users/:id/status', authenticate, authorize('admin'), toggleUserStatus);
router.put('/users/:id', authenticate, authorize('admin'), adminUpdateUser);
router.delete('/users/:id', authenticate, authorize('admin'), adminDeleteUser);
router.get('/products', authenticate, authorize('admin'), adminGetProducts);
router.put('/products/:id', authenticate, authorize('admin'), adminUpdateProduct);
router.get('/orders', authenticate, authorize('admin'), adminGetOrders);
router.get('/orders/:id', authenticate, authorize('admin'), adminGetOrderById);
router.get('/shops', authenticate, authorize('admin'), adminGetShops);
router.get('/shops/:id/revenue', authenticate, authorize('admin'), adminGetShopRevenue);
router.get('/shops/:id/orders', authenticate, authorize('admin'), adminGetShopOrders);
router.put('/shops/:id', authenticate, authorize('admin'), adminUpdateShop);

// Admin Vouchers
router.get('/vouchers', authenticate, authorize('admin'), adminGetVouchers);
router.post('/vouchers', authenticate, authorize('admin'), adminCreateVoucher);
router.put('/vouchers/:id', authenticate, authorize('admin'), adminUpdateVoucher);
router.delete('/vouchers/:id', authenticate, authorize('admin'), adminDeleteVoucher);

// Admin revenue report (toàn sàn)
router.get('/revenue', authenticate, authorize('admin'), adminGetRevenue);
router.get('/revenue-orders', authenticate, authorize('admin'), adminGetRevenueOrders);

// Seller verification routes
router.get('/pending-sellers', authenticate, authorize('admin'), getPendingSellers);
router.put('/verify-seller/:id', authenticate, authorize('admin'), verifySellerAccount);

// Product approval routes
router.get('/pending-products', authenticate, authorize('admin'), getPendingProducts);
router.put('/approve-product/:id', authenticate, authorize('admin'), approveProduct);

// Product auto-moderation routes
router.get('/moderation/training-data', authenticate, authorize('admin'), getTrainingData);
router.post('/moderation/training-data', authenticate, authorize('admin'), addTrainingSample);
router.delete('/moderation/training-data/:id', authenticate, authorize('admin'), deleteTrainingSample);
router.post('/moderation/train', authenticate, authorize('admin'), trainModerationModel);
router.post('/moderation/test', authenticate, authorize('admin'), testModeration);

// Seller dashboard
router.get('/seller-dashboard', authenticate, authorize('seller'), getSellerDashboard);
router.get('/seller-revenue', authenticate, authorize('seller'), sellerGetRevenue);

module.exports = router;
