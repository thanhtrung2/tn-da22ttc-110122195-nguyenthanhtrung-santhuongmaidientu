const express = require('express');
const router = express.Router();
const {
    createComplaint,
    getMyComplaints,
    getComplaintById,
    sellerGetComplaints,
    sellerRespondComplaint,
    customerConfirmResolution,
    getAllComplaints,
    adminHandleComplaint
} = require('../controllers/complaintController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Khách hàng
router.post('/', authenticate, createComplaint); // createComplaint bao gồm multer middleware
router.get('/', authenticate, getMyComplaints);

// Người bán
router.get('/seller/list', authenticate, authorize('seller'), sellerGetComplaints);
router.put('/:id/seller-respond', authenticate, authorize('seller'), sellerRespondComplaint);

// Khách hàng xác nhận
router.put('/:id/customer-confirm', authenticate, customerConfirmResolution);

// Admin
router.get('/all', authenticate, authorize('admin'), getAllComplaints);
router.put('/:id/admin-handle', authenticate, authorize('admin'), adminHandleComplaint);

// Xem chi tiết (3 bên)
router.get('/:id', authenticate, getComplaintById);

module.exports = router;
