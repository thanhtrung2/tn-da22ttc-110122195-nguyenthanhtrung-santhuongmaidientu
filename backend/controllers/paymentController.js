const crypto = require('crypto');
const pool = require('../config/database');
require('dotenv').config();

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
                await pool.query(
                    "UPDATE don_hang SET trang_thai_thanh_toan = 'paid', ma_giao_dich = ? WHERE id = ?",
                    [txnRef, orderId]
                );
                res.redirect(`/pages/order-detail.html?id=${orderId}&payment=success`);
            } else {
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

// ==================== MOMO ====================
const createMomoPayment = async (req, res) => {
    try {
        const { order_id, amount, orderInfo } = req.body;

        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const redirectUrl = process.env.MOMO_RETURN_URL;
        const ipnUrl = process.env.MOMO_NOTIFY_URL;
        const requestType = 'payWithMethod';
        const orderId = 'MOMO_' + Date.now() + '_' + order_id;
        const requestId = orderId;
        const extraData = '';
        const autoCapture = true;
        const lang = 'vi';

        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo || 'Thanh toan don hang'}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

        const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

        const requestBody = {
            partnerCode, partnerName: 'KLTN2026 Shop',
            storeId: 'KLTN2026Store', requestId, amount, orderId,
            orderInfo: orderInfo || 'Thanh toan don hang',
            redirectUrl, ipnUrl, lang, requestType, autoCapture, extraData, signature
        };

        console.log('Sending request to MoMo:', JSON.stringify(requestBody));

        const response = await fetch(process.env.MOMO_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('MoMo API Response:', data);

        if (data.resultCode === 0) {
            res.json({ success: true, data: { paymentUrl: data.payUrl } });
        } else {
            console.error('MoMo Business Error:', data);
            res.status(400).json({ success: false, message: data.message || 'Lỗi từ phía MoMo' });
        }
    } catch (error) {
        console.error('MoMo System Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo thanh toán MoMo: ' + error.message });
    }
};

const momoReturn = async (req, res) => {
    try {
        const { resultCode, orderId } = req.query;
        const realOrderId = orderId.split('_')[2];

        if (resultCode === '0') {
            await pool.query(
                "UPDATE don_hang SET trang_thai_thanh_toan = 'paid', ma_giao_dich = ? WHERE id = ?",
                [orderId, realOrderId]
            );
            res.redirect(`/pages/order-detail.html?id=${realOrderId}&payment=success`);
        } else {
            res.redirect(`/pages/order-detail.html?id=${realOrderId}&payment=failed`);
        }
    } catch (error) {
        console.error('Momo return error:', error);
        res.redirect('/pages/orders.html?payment=error');
    }
};

const momoNotify = async (req, res) => {
    try {
        const { resultCode, orderId } = req.body;
        const realOrderId = orderId.split('_')[2];

        if (resultCode === 0) {
            await pool.query(
                "UPDATE don_hang SET trang_thai_thanh_toan = 'paid', ma_giao_dich = ? WHERE id = ?",
                [orderId, realOrderId]
            );
        }
        res.status(204).send();
    } catch (error) {
        console.error('Momo notify error:', error);
        res.status(204).send();
    }
};

function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => { sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+"); });
    return sorted;
}

module.exports = { createVnpayPayment, vnpayReturn, createMomoPayment, momoReturn, momoNotify };
