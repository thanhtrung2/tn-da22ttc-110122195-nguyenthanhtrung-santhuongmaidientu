const express = require('express');
const router = express.Router();
const { getDashboard, getAllUsers, toggleUserStatus, adminGetProducts, adminUpdateProduct, adminGetOrders, adminGetShops, adminUpdateShop, getSellerDashboard } = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Admin routes
router.get('/dashboard', authenticate, authorize('admin'), getDashboard);
router.get('/users', authenticate, authorize('admin'), getAllUsers);
router.put('/users/:id/status', authenticate, authorize('admin'), toggleUserStatus);
router.get('/products', authenticate, authorize('admin'), adminGetProducts);
router.put('/products/:id', authenticate, authorize('admin'), adminUpdateProduct);
router.get('/orders', authenticate, authorize('admin'), adminGetOrders);
router.get('/shops', authenticate, authorize('admin'), adminGetShops);
router.put('/shops/:id', authenticate, authorize('admin'), adminUpdateShop);

// Seller dashboard
router.get('/seller-dashboard', authenticate, authorize('seller'), getSellerDashboard);

module.exports = router;
