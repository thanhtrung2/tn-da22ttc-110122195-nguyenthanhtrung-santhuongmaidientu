const express = require('express');
const router = express.Router();
const { createVnpayPayment, vnpayReturn, createMomoPayment, momoReturn, momoNotify } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/vnpay/create', authenticate, createVnpayPayment);
router.get('/vnpay-return', vnpayReturn);
router.post('/momo/create', authenticate, createMomoPayment);
router.get('/momo-return', momoReturn);
router.post('/momo-notify', momoNotify);

module.exports = router;
