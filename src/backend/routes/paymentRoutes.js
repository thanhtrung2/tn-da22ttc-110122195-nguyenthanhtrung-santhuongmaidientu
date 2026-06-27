const express = require('express');
const router = express.Router();
const { 
    createVnpayPayment, 
    vnpayReturn, 
    createPayosPayment, 
    payosReturn, 
    payosCancel,
    payosWebhook,
    retryPayment,
    getMyPayments,
    getMyInvoices,
    getInvoiceDetail
} = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/vnpay/create', authenticate, createVnpayPayment);
router.get('/vnpay-return', vnpayReturn);
router.post('/payos/create', authenticate, createPayosPayment);
router.get('/payos-return', payosReturn);
router.get('/payos-cancel', payosCancel);
router.post('/payos-webhook', payosWebhook);

router.post('/retry/:id', authenticate, retryPayment);

// New history & invoices routes
router.get('/history', authenticate, getMyPayments);
router.get('/invoices', authenticate, getMyInvoices);
router.get('/invoices/:id', authenticate, getInvoiceDetail);

module.exports = router;
