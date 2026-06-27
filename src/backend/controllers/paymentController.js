const crypto = require('crypto');
const pool = require('../config/database');
require('dotenv').config();
const { PayOS } = require('@payos/node');

const getIO = () => {
    try { return require('../server').io; } catch { return null; }
};

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
                const [orderData] = await pool.query('SELECT tong_tien, thue_vat, nguoi_mua_id, gian_hang_id FROM don_hang WHERE id = ?', [orderId]);
                if (orderData.length > 0) {
                    const maInvoice = 'HD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                    await pool.query(
                        `INSERT INTO hoa_don (ma_hoa_don, don_hang_id, nguoi_mua_id, tong_tien, tien_giam_gia, thue, thanh_tien, trang_thai, ngay_thanh_toan)
                         VALUES (?, ?, ?, ?, 0.00, ?, ?, 'da_thanh_toan', CURRENT_TIMESTAMP)
                         ON DUPLICATE KEY UPDATE trang_thai = 'da_thanh_toan', ngay_thanh_toan = CURRENT_TIMESTAMP`,
                        [maInvoice, orderId, orderData[0].nguoi_mua_id, orderData[0].tong_tien, orderData[0].thue_vat || 0.00, orderData[0].tong_tien]
                    );

                    // Xóa giỏ hàng
                    await pool.query('DELETE FROM gio_hang WHERE nguoi_mua_id = ?', [orderData[0].nguoi_mua_id]);

                    // Thông báo người bán
                    const [shopOwner] = await pool.query('SELECT nguoi_ban_id FROM gian_hang WHERE id = ?', [orderData[0].gian_hang_id]);
                    const [buyer] = await pool.query('SELECT ho_ten FROM nguoi_dung WHERE id = ?', [orderData[0].nguoi_mua_id]);
                    if (shopOwner.length > 0) {
                        await pool.query(
                            `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
                             VALUES (?, ?, ?, 'order', 'unread', ?)`,
                            [
                                shopOwner[0].nguoi_ban_id,
                                'Đơn hàng mới đã thanh toán',
                                `Bạn có đơn hàng mới #${orderId} từ khách ${buyer[0]?.ho_ten || 'khách hàng'} - Tổng: ${new Intl.NumberFormat('vi-VN').format(orderData[0].tong_tien)}đ`,
                                '/pages/seller/orders.html?trang_thai=cho_xac_nhan'
                            ]
                        );
                        const io = getIO();
                        if (io) {
                            io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_notification', {
                                noi_dung: `Bạn có đơn hàng mới #${orderId} từ khách ${buyer[0]?.ho_ten || 'khách hàng'} - Tổng: ${new Intl.NumberFormat('vi-VN').format(orderData[0].tong_tien)}đ`,
                                loai: 'order',
                                url_lien_ket: '/pages/seller/orders.html?trang_thai=cho_xac_nhan'
                            });
                            io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_order', { shop_id: orderData[0].gian_hang_id });
                        }
                    }
                }

                res.redirect(`/pages/order-detail.html?id=${orderId}&payment=success`);
            } else {
                // Thay vì hủy đơn ngay lập tức, chuyển khách về checkout để họ xác nhận
                res.redirect(`/pages/checkout.html?confirm_cancel_id=${orderId}`);
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
                "SELECT id, tong_tien, thue_vat, nguoi_mua_id, gian_hang_id FROM don_hang WHERE ma_giao_dich = ? AND trang_thai_thanh_toan != 'paid'",
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

                    // Xóa giỏ hàng
                    await pool.query('DELETE FROM gio_hang WHERE nguoi_mua_id = ?', [order.nguoi_mua_id]);

                    // Thông báo người bán
                    const [shopOwner] = await pool.query('SELECT nguoi_ban_id FROM gian_hang WHERE id = ?', [order.gian_hang_id]);
                    const [buyer] = await pool.query('SELECT ho_ten FROM nguoi_dung WHERE id = ?', [order.nguoi_mua_id]);
                    if (shopOwner.length > 0) {
                        await pool.query(
                            `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
                             VALUES (?, ?, ?, 'order', 'unread', ?)`,
                            [
                                shopOwner[0].nguoi_ban_id,
                                'Đơn hàng mới đã thanh toán',
                                `Bạn có đơn hàng mới #${order.id} từ khách ${buyer[0]?.ho_ten || 'khách hàng'} - Tổng: ${new Intl.NumberFormat('vi-VN').format(order.tong_tien)}đ`,
                                '/pages/seller/orders.html?trang_thai=cho_xac_nhan'
                            ]
                        );
                        const io = getIO();
                        if (io) {
                            io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_notification', {
                                noi_dung: `Bạn có đơn hàng mới #${order.id} từ khách ${buyer[0]?.ho_ten || 'khách hàng'} - Tổng: ${new Intl.NumberFormat('vi-VN').format(order.tong_tien)}đ`,
                                loai: 'order',
                                url_lien_ket: '/pages/seller/orders.html?trang_thai=cho_xac_nhan'
                            });
                            io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_order', { shop_id: order.gian_hang_id });
                        }
                    }
                }
            }
            res.redirect((process.env.CLIENT_URL || '') + '/pages/payment-success.html');
        } else {
            const [orders] = await pool.query("SELECT id FROM don_hang WHERE ma_giao_dich = ?", [orderCode]);
            if (orders.length > 0) {
                res.redirect((process.env.CLIENT_URL || '') + `/pages/checkout.html?confirm_cancel_id=${orders[0].id}`);
            } else {
                res.redirect((process.env.CLIENT_URL || '') + '/pages/orders.html');
            }
        }
    } catch (error) {
        console.error('PayOS return error:', error);
        res.redirect((process.env.CLIENT_URL || '') + '/pages/orders.html');
    }
};

const payosCancel = async (req, res) => {
    try {
        const { orderCode } = req.query;
        const [orders] = await pool.query("SELECT id FROM don_hang WHERE ma_giao_dich = ?", [orderCode]);
        if (orders.length > 0) {
            res.redirect((process.env.CLIENT_URL || '') + `/pages/checkout.html?confirm_cancel_id=${orders[0].id}`);
        } else {
            res.redirect((process.env.CLIENT_URL || '') + '/pages/checkout.html');
        }
    } catch (error) {
        console.error('PayOS cancel error:', error);
        res.redirect((process.env.CLIENT_URL || '') + '/pages/checkout.html');
    }
};

const payosWebhook = async (req, res) => {
    try {
        const webhookData = await payos.webhooks.verify(req.body);

        if (webhookData.code === '00') {
            console.log('Webhook received success for orderCode:', webhookData.orderCode);
            
            const [orders] = await pool.query(
                "SELECT id, tong_tien, thue_vat, nguoi_mua_id, gian_hang_id FROM don_hang WHERE ma_giao_dich = ? AND trang_thai_thanh_toan != 'paid'",
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

                    // Xóa giỏ hàng
                    await pool.query('DELETE FROM gio_hang WHERE nguoi_mua_id = ?', [order.nguoi_mua_id]);

                    // Thông báo người bán
                    const [shopOwner] = await pool.query('SELECT nguoi_ban_id FROM gian_hang WHERE id = ?', [order.gian_hang_id]);
                    const [buyer] = await pool.query('SELECT ho_ten FROM nguoi_dung WHERE id = ?', [order.nguoi_mua_id]);
                    if (shopOwner.length > 0) {
                        await pool.query(
                            `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
                             VALUES (?, ?, ?, 'order', 'unread', ?)`,
                            [
                                shopOwner[0].nguoi_ban_id,
                                'Đơn hàng mới đã thanh toán',
                                `Bạn có đơn hàng mới #${order.id} từ khách ${buyer[0]?.ho_ten || 'khách hàng'} - Tổng: ${new Intl.NumberFormat('vi-VN').format(order.tong_tien)}đ`,
                                '/pages/seller/orders.html?trang_thai=cho_xac_nhan'
                            ]
                        );
                        const io = getIO();
                        if (io) {
                            io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_notification', {
                                noi_dung: `Bạn có đơn hàng mới #${order.id} từ khách ${buyer[0]?.ho_ten || 'khách hàng'} - Tổng: ${new Intl.NumberFormat('vi-VN').format(order.tong_tien)}đ`,
                                loai: 'order',
                                url_lien_ket: '/pages/seller/orders.html?trang_thai=cho_xac_nhan'
                            });
                            io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_order', { shop_id: order.gian_hang_id });
                        }
                    }
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

const retryPayment = async (req, res) => {
    try {
        const orderId = req.params.id;
        const [orders] = await pool.query(
            "SELECT * FROM don_hang WHERE id = ? AND nguoi_mua_id = ?",
            [orderId, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        const order = orders[0];
        if (order.trang_thai_thanh_toan === 'paid') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán' });
        }
        if (order.trang_thai === 'da_huy') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã bị hủy' });
        }
        if (order.phuong_thuc_thanh_toan === 'cod') {
            return res.status(400).json({ success: false, message: 'Đơn hàng thanh toán khi nhận hàng không cần thanh toán lại' });
        }

        let maGiaoDich = order.ma_giao_dich;
        if (order.phuong_thuc_thanh_toan === 'payos') {
            maGiaoDich = Number(String(Date.now()).slice(-5) + Math.floor(1000 + Math.random() * 9000));
        } else if (order.phuong_thuc_thanh_toan === 'vnpay') {
            const date = new Date();
            const createDate = date.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            maGiaoDich = createDate + '_' + order.id;
        }

        await pool.query(
            "UPDATE don_hang SET ma_giao_dich = ? WHERE id = ?",
            [maGiaoDich, order.id]
        );

        if (order.phuong_thuc_thanh_toan === 'payos') {
            const body = {
                orderCode: Number(maGiaoDich),
                amount: Number(order.tong_tien),
                description: `Thanh toan DH ${order.id}`,
                returnUrl: `${process.env.PAYOS_RETURN_URL}`,
                cancelUrl: `${process.env.PAYOS_CANCEL_URL}`
            };
            const paymentLinkResponse = await payos.paymentRequests.create(body);
            return res.json({ success: true, data: { paymentUrl: paymentLinkResponse.checkoutUrl } });
        } else if (order.phuong_thuc_thanh_toan === 'vnpay') {
            const tmnCode = process.env.VNPAY_TMN_CODE;
            const secretKey = process.env.VNPAY_HASH_SECRET;
            const vnpUrl = process.env.VNPAY_URL;
            const returnUrl = process.env.VNPAY_RETURN_URL;
            const createDate = maGiaoDich.split('_')[0];

            await pool.query(
                `INSERT INTO thanh_toan (don_hang_id, nguoi_mua_id, so_tien, phuong_thuc, ma_giao_dich_he_thong, trang_thai)
                 VALUES (?, ?, ?, 'vnpay', ?, 'pending')`,
                [order.id, req.user.id, order.tong_tien, maGiaoDich]
            );

            let vnp_Params = {
                'vnp_Version': '2.1.0',
                'vnp_Command': 'pay',
                'vnp_TmnCode': tmnCode,
                'vnp_Locale': 'vn',
                'vnp_CurrCode': 'VND',
                'vnp_TxnRef': maGiaoDich,
                'vnp_OrderInfo': `Thanh toan don hang ${order.id}`,
                'vnp_OrderType': 'other',
                'vnp_Amount': order.tong_tien * 100,
                'vnp_ReturnUrl': returnUrl,
                'vnp_IpAddr': req.ip || '127.0.0.1',
                'vnp_CreateDate': createDate
            };
            const sortedParams = sortObject(vnp_Params);
            const signData = new URLSearchParams(sortedParams).toString();
            const hmac = crypto.createHmac('sha512', secretKey);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
            sortedParams['vnp_SecureHash'] = signed;

            const paymentUrl = vnpUrl + '?' + new URLSearchParams(sortedParams).toString();
            return res.json({ success: true, data: { paymentUrl } });
        } else {
             return res.status(400).json({ success: false, message: 'Phương thức thanh toán không được hỗ trợ để thanh toán lại' });
        }

    } catch (error) {
        console.error('Retry Payment Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo lại thanh toán: ' + error.message });
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
    retryPayment,
    getMyPayments, 
    getMyInvoices, 
    getInvoiceDetail 
};
