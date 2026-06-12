const crypto = require('crypto');
const pool = require('../config/database');
require('dotenv').config();
const { PayOS } = require('@payos/node');

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY
});

// ==================== VNPAY ====================
const createVnpayPayment = async (req, res) => {
    try {
        const { order_id, amount, orderInfo } = req.body;

        const tmnCode = process.env.VNPAY_TMN_CODE;
        const secretKey = process.env.VNPAY_HASH_SECRET;
        const vnpUrl = process.env.VNPAY_URL;
        const returnUrl = process.env.VNPAY_RETURN_URL;

        const date = new Date();
        const createDate = date.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const orderId = createDate + '_' + order_id;

        // Record payment attempt in thanh_toan table
        await pool.query(
            `INSERT INTO thanh_toan (don_hang_id, nguoi_mua_id, so_tien, phuong_thuc, ma_giao_dich_he_thong, trang_thai)
             VALUES (?, ?, ?, 'vnpay', ?, 'pending')`,
            [order_id, req.user.id, amount, orderId]
        );

        let vnp_Params = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': tmnCode,
            'vnp_Locale': 'vn',
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': orderId,
            'vnp_OrderInfo': orderInfo || `Thanh toan don hang ${order_id}`,
            'vnp_OrderType': 'other',
            'vnp_Amount': amount * 100,
            'vnp_ReturnUrl': returnUrl,
            'vnp_IpAddr': req.ip || '127.0.0.1',
            'vnp_CreateDate': createDate
        };

        // Sort params
        const sortedParams = sortObject(vnp_Params);
        const signData = new URLSearchParams(sortedParams).toString();
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
        sortedParams['vnp_SecureHash'] = signed;

        const paymentUrl = vnpUrl + '?' + new URLSearchParams(sortedParams).toString();
        console.log('VNPay URL Created:', paymentUrl);

        res.json({ success: true, data: { paymentUrl } });
    } catch (error) {
        console.error('VNPay Create Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi tạo thanh toán VNPay: ' + error.message });
    }
};

const vnpayReturn = async (req, res) => {
    try {
        let vnp_Params = req.query;
        const secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        const sortedParams = sortObject(vnp_Params);
        const signData = new URLSearchParams(sortedParams).toString();
        const hmac = crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        if (secureHash === signed) {
            const responseCode = vnp_Params['vnp_ResponseCode'];
            const txnRef = vnp_Params['vnp_TxnRef'];
            const orderId = txnRef.split('_')[1];

            if (responseCode === '00') {
                // Update order payment status
                await pool.query(
                    "UPDATE don_hang SET trang_thai_thanh_toan = 'paid', ma_giao_dich = ? WHERE id = ?",
                    [txnRef, orderId]
                );

                // Update thanh_toan status to completed
                await pool.query(
                    "UPDATE thanh_toan SET trang_thai = 'completed', ma_giao_dich = ? WHERE ma_giao_dich_he_thong = ?",
                    [txnRef, txnRef]
                );

                // Create invoice (hoa_don)
                const [orderData] = await pool.query('SELECT tong_tien, thue_vat, nguoi_mua_id FROM don_hang WHERE id = ?', [orderId]);
                if (orderData.length > 0) {
                    const maInvoice = 'HD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                    await pool.query(
                        `INSERT INTO hoa_don (ma_hoa_don, don_hang_id, nguoi_mua_id, tong_tien, tien_giam_gia, thue, thanh_tien, trang_thai, ngay_thanh_toan)
                         VALUES (?, ?, ?, ?, 0.00, ?, ?, 'da_thanh_toan', CURRENT_TIMESTAMP)
                         ON DUPLICATE KEY UPDATE trang_thai = 'da_thanh_toan', ngay_thanh_toan = CURRENT_TIMESTAMP`,
                        [maInvoice, orderId, orderData[0].nguoi_mua_id, orderData[0].tong_tien, orderData[0].thue_vat || 0.00, orderData[0].tong_tien]
                    );
                }

                res.redirect(`/pages/order-detail.html?id=${orderId}&payment=success`);
            } else {
                // Update payment status to failed
                await pool.query(
                    "UPDATE thanh_toan SET trang_thai = 'failed' WHERE ma_giao_dich_he_thong = ?",
                    [txnRef]
                );
                res.redirect(`/pages/order-detail.html?id=${orderId}&payment=failed`);
            }
        } else {
            res.redirect('/pages/orders.html?payment=invalid');
        }
    } catch (error) {
        console.error('VNPay return error:', error);
        res.redirect('/pages/orders.html?payment=error');
    }
};

// ==================== PAYOS ====================
const createPayosPayment = async (req, res) => {
    try {
        const { orderCode, amount, orderInfo } = req.body;

        if (!orderCode || !amount) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin thanh toán' });
        }

        const body = {
            orderCode: Number(orderCode),
            amount: Number(amount),
            description: orderInfo ? orderInfo.substring(0, 25) : `Thanh toan DH ${orderCode}`,
            returnUrl: `${process.env.PAYOS_RETURN_URL}`,
            cancelUrl: `${process.env.PAYOS_CANCEL_URL}`
        };

        const paymentLinkResponse = await payos.paymentRequests.create(body);
        
        res.json({ success: true, data: { paymentUrl: paymentLinkResponse.checkoutUrl } });
    } catch (error) {
        console.error('PayOS Create Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo thanh toán PayOS: ' + error.message });
    }
};

const payosReturn = async (req, res) => {
    try {
        const { code, id, cancel, status, orderCode } = req.query;

        if (code === '00' && cancel === 'false' && status === 'PAID') {
            const [orders] = await pool.query(
                "SELECT id, tong_tien, thue_vat, nguoi_mua_id FROM don_hang WHERE ma_giao_dich = ? AND trang_thai_thanh_toan != 'paid'",
                [orderCode]
            );

            if (orders.length > 0) {
                for (const order of orders) {
                    await pool.query(
                        "UPDATE don_hang SET trang_thai_thanh_toan = 'paid' WHERE id = ?",
                        [order.id]
                    );

                    const sysTxnRef = 'ONLINE_' + Date.now() + '_' + order.id;
                    await pool.query(
                        `INSERT INTO thanh_toan (don_hang_id, nguoi_mua_id, so_tien, phuong_thuc, ma_giao_dich, ma_giao_dich_he_thong, trang_thai)
                         VALUES (?, ?, ?, 'payos', ?, ?, 'completed')
                         ON DUPLICATE KEY UPDATE trang_thai = 'completed'`,
                        [order.id, order.nguoi_mua_id, order.tong_tien, orderCode, sysTxnRef]
                    );

                    const maInvoice = 'HD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                    await pool.query(
                        `INSERT INTO hoa_don (ma_hoa_don, don_hang_id, nguoi_mua_id, tong_tien, tien_giam_gia, thue, thanh_tien, trang_thai, ngay_thanh_toan)
                         VALUES (?, ?, ?, ?, 0.00, ?, ?, 'da_thanh_toan', CURRENT_TIMESTAMP)
                         ON DUPLICATE KEY UPDATE trang_thai = 'da_thanh_toan', ngay_thanh_toan = CURRENT_TIMESTAMP`,
                        [maInvoice, order.id, order.nguoi_mua_id, order.tong_tien, order.thue_vat || 0, order.tong_tien]
                    );
                }
            }
            res.redirect(`${process.env.CLIENT_URL}/pages/payment-success.html`);
        } else {
            res.redirect(`${process.env.CLIENT_URL}/pages/orders.html`);
        }
    } catch (error) {
        console.error('PayOS return error:', error);
        res.redirect(`${process.env.CLIENT_URL}/pages/orders.html`);
    }
};

const payosCancel = async (req, res) => {
    try {
        const { orderCode } = req.query;
        // The webhook handles failure or we can just ignore DB updates since it's cancelled
        // Redirect to orders page with failure message
        res.redirect(`${process.env.CLIENT_URL}/pages/orders.html?payment=cancelled`);
    } catch (error) {
        console.error('PayOS cancel error:', error);
        res.redirect(`${process.env.CLIENT_URL}/pages/orders.html?payment=error`);
    }
};

const payosWebhook = async (req, res) => {
    try {
        const webhookData = await payos.webhooks.verify(req.body);

        if (webhookData.code === '00') {
            console.log('Webhook received success for orderCode:', webhookData.orderCode);
            
            const [orders] = await pool.query(
                "SELECT id, tong_tien, thue_vat, nguoi_mua_id FROM don_hang WHERE ma_giao_dich = ? AND trang_thai_thanh_toan != 'paid'",
                [webhookData.orderCode]
            );

            if (orders.length > 0) {
                for (const order of orders) {
                    await pool.query(
                        "UPDATE don_hang SET trang_thai_thanh_toan = 'paid' WHERE id = ?",
                        [order.id]
                    );

                    const sysTxnRef = 'ONLINE_' + Date.now() + '_' + order.id;
                    await pool.query(
                        `INSERT INTO thanh_toan (don_hang_id, nguoi_mua_id, so_tien, phuong_thuc, ma_giao_dich, ma_giao_dich_he_thong, trang_thai)
                         VALUES (?, ?, ?, 'payos', ?, ?, 'completed')
                         ON DUPLICATE KEY UPDATE trang_thai = 'completed'`,
                        [order.id, order.nguoi_mua_id, order.tong_tien, webhookData.orderCode, sysTxnRef]
                    );

                    const maInvoice = 'HD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                    await pool.query(
                        `INSERT INTO hoa_don (ma_hoa_don, don_hang_id, nguoi_mua_id, tong_tien, tien_giam_gia, thue, thanh_tien, trang_thai, ngay_thanh_toan)
                         VALUES (?, ?, ?, ?, 0.00, ?, ?, 'da_thanh_toan', CURRENT_TIMESTAMP)
                         ON DUPLICATE KEY UPDATE trang_thai = 'da_thanh_toan', ngay_thanh_toan = CURRENT_TIMESTAMP`,
                        [maInvoice, order.id, order.nguoi_mua_id, order.tong_tien, order.thue_vat || 0, order.tong_tien]
                    );
                }
            }
        }
        res.json({ success: true, message: 'Webhook received' });
    } catch (error) {
        console.error('PayOS webhook error:', error);
        res.status(400).json({ success: false, message: 'Webhook error' });
    }
};

// ==================== NEW INVOICE AND PAYMENT HISTORY APIS ====================

// Lấy lịch sử thanh toán của khách hàng
const getMyPayments = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT tt.*, dh.tong_tien as order_total
             FROM thanh_toan tt
             JOIN don_hang dh ON tt.don_hang_id = dh.id
             WHERE tt.nguoi_mua_id = ?
             ORDER BY tt.ngay_tao DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get my payments error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy lịch sử thanh toán' });
    }
};

// Lấy danh sách hóa đơn của khách hàng
const getMyInvoices = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT hd.*, dh.trang_thai as trang_thai_don_hang, gh.ten_gian_hang
             FROM hoa_don hd
             JOIN don_hang dh ON hd.don_hang_id = dh.id
             JOIN gian_hang gh ON dh.gian_hang_id = gh.id
             WHERE hd.nguoi_mua_id = ?
             ORDER BY hd.ngay_lap DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get my invoices error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách hóa đơn' });
    }
};

// Lấy chi tiết hóa đơn
const getInvoiceDetail = async (req, res) => {
    try {
        const [invoices] = await pool.query(
            `SELECT hd.*, dh.trang_thai as trang_thai_don_hang, gh.ten_gian_hang, gh.dia_chi as dia_chi_shop, nd.ho_ten as ten_nguoi_mua, nd.email as email_nguoi_mua
             FROM hoa_don hd
             JOIN don_hang dh ON hd.don_hang_id = dh.id
             JOIN gian_hang gh ON dh.gian_hang_id = gh.id
             JOIN nguoi_dung nd ON hd.nguoi_mua_id = nd.id
             WHERE hd.id = ? AND (hd.nguoi_mua_id = ? OR gh.nguoi_ban_id = ? OR nd.vai_tro = 'admin')`,
            [req.params.id, req.user.id, req.user.id]
        );

        if (invoices.length === 0) {
            return res.status(404).json({ success: false, message: 'Hóa đơn không tồn tại hoặc bạn không có quyền xem' });
        }

        // Lấy danh sách mặt hàng của đơn hàng liên quan
        const [items] = await pool.query(
            `SELECT ct.*, sp.ten_san_pham 
             FROM chi_tiet_don_hang ct
             JOIN san_pham sp ON ct.san_pham_id = sp.id 
             WHERE ct.don_hang_id = ?`,
            [invoices[0].don_hang_id]
        );

        res.json({ success: true, data: { ...invoices[0], items } });
    } catch (error) {
        console.error('Get invoice detail error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy chi tiết hóa đơn' });
    }
};

function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => { sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+"); });
    return sorted;
}

module.exports = { 
    createVnpayPayment, 
    vnpayReturn, 
    createPayosPayment, 
    payosReturn, 
    payosCancel,
    payosWebhook,
    getMyPayments, 
    getMyInvoices, 
    getInvoiceDetail 
};
