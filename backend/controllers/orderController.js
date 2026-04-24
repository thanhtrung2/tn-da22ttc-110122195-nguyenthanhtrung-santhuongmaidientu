const pool = require('../config/database');
const crypto = require('crypto');

// Tạo đơn hàng từ giỏ hàng
const createOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan, ghi_chu } = req.body;

        if (!dia_chi_giao || !so_dien_thoai) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ và số điện thoại' });
        }

        // Get cart items grouped by shop
        const [cartItems] = await connection.query(
            `SELECT gh.*, sp.ten_san_pham, sp.gia, sp.gia_khuyen_mai, sp.so_luong_ton, sp.gian_hang_id
            FROM gio_hang gh JOIN san_pham sp ON gh.san_pham_id = sp.id
            WHERE gh.nguoi_mua_id = ? AND sp.trang_thai = 'active'`,
            [req.user.id]
        );

        if (cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }

        // Check stock
        for (const item of cartItems) {
            if (item.so_luong > item.so_luong_ton) {
                return res.status(400).json({ success: false, message: `${item.ten_san_pham} không đủ số lượng (còn ${item.so_luong_ton})` });
            }
        }

        // Group by shop
        const shopGroups = {};
        cartItems.forEach(item => {
            if (!shopGroups[item.gian_hang_id]) shopGroups[item.gian_hang_id] = [];
            shopGroups[item.gian_hang_id].push(item);
        });

        const orderIds = [];

        for (const [shopId, items] of Object.entries(shopGroups)) {
            // Calculate total
            let tongTien = 0;
            items.forEach(item => {
                const price = item.gia_khuyen_mai || item.gia;
                tongTien += price * item.so_luong;
            });

            const maGiaoDich = 'DH' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();

            // Create order
            const [orderResult] = await connection.query(
                `INSERT INTO don_hang (nguoi_mua_id, gian_hang_id, tong_tien, dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan, ma_giao_dich, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.user.id, shopId, tongTien, dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan || 'cod', maGiaoDich, ghi_chu]
            );

            // Create order items
            for (const item of items) {
                const price = item.gia_khuyen_mai || item.gia;
                await connection.query(
                    'INSERT INTO chi_tiet_don_hang (don_hang_id, san_pham_id, so_luong, gia) VALUES (?, ?, ?, ?)',
                    [orderResult.insertId, item.san_pham_id, item.so_luong, price]
                );

                // Update stock
                await connection.query(
                    'UPDATE san_pham SET so_luong_ton = so_luong_ton - ? WHERE id = ?',
                    [item.so_luong, item.san_pham_id]
                );
            }

            orderIds.push(orderResult.insertId);
        }

        // Clear cart
        await connection.query('DELETE FROM gio_hang WHERE nguoi_mua_id = ?', [req.user.id]);

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công',
            data: { orderIds }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// Lấy đơn hàng của tôi (customer)
const getMyOrders = async (req, res) => {
    try {
        const { trang_thai } = req.query;
        let sql = `SELECT dh.*, gh.ten_gian_hang,
            (SELECT COUNT(*) FROM chi_tiet_don_hang WHERE don_hang_id = dh.id) as so_san_pham
            FROM don_hang dh JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            WHERE dh.nguoi_mua_id = ?`;
        const params = [req.user.id];

        if (trang_thai) {
            sql += ' AND dh.trang_thai = ?';
            params.push(trang_thai);
        }

        sql += ' ORDER BY dh.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Chi tiết đơn hàng
const getOrderById = async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT dh.*, gh.ten_gian_hang, gh.logo as shop_logo
            FROM don_hang dh JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            WHERE dh.id = ? AND (dh.nguoi_mua_id = ? OR gh.nguoi_ban_id = ?)`,
            [req.params.id, req.user.id, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        const [items] = await pool.query(
            `SELECT ct.*, sp.ten_san_pham, sp.hinh_anh FROM chi_tiet_don_hang ct
            JOIN san_pham sp ON ct.san_pham_id = sp.id WHERE ct.don_hang_id = ?`,
            [req.params.id]
        );

        res.json({ success: true, data: { ...orders[0], items } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Hủy đơn hàng (customer - chỉ khi chờ xác nhận)
const cancelOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [order] = await connection.query(
            'SELECT * FROM don_hang WHERE id = ? AND nguoi_mua_id = ? AND trang_thai = ?',
            [req.params.id, req.user.id, 'cho_xac_nhan']
        );

        if (order.length === 0) {
            return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng này' });
        }

        // Restore stock
        const [items] = await connection.query('SELECT * FROM chi_tiet_don_hang WHERE don_hang_id = ?', [req.params.id]);
        for (const item of items) {
            await connection.query('UPDATE san_pham SET so_luong_ton = so_luong_ton + ? WHERE id = ?', [item.so_luong, item.san_pham_id]);
        }

        await connection.query('UPDATE don_hang SET trang_thai = ? WHERE id = ?', ['da_huy', req.params.id]);

        await connection.commit();
        res.json({ success: true, message: 'Hủy đơn hàng thành công' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// Cập nhật trạng thái đơn hàng (seller)
const updateOrderStatus = async (req, res) => {
    try {
        const { trang_thai } = req.body;
        const validStatuses = ['da_xac_nhan', 'dang_giao', 'hoan_thanh'];

        if (!validStatuses.includes(trang_thai)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.status(403).json({ success: false, message: 'Không có quyền' });
        }

        const [result] = await pool.query(
            'UPDATE don_hang SET trang_thai = ? WHERE id = ? AND gian_hang_id = ?',
            [trang_thai, req.params.id, shop[0].id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        // If completed and payment is COD, mark as paid
        if (trang_thai === 'hoan_thanh') {
            await pool.query(
                "UPDATE don_hang SET trang_thai_thanh_toan = 'paid' WHERE id = ? AND phuong_thuc_thanh_toan = 'cod'",
                [req.params.id]
            );
        }

        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy đơn hàng của gian hàng (seller)
const getShopOrders = async (req, res) => {
    try {
        const { trang_thai } = req.query;
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.json({ success: true, data: [] });
        }

        let sql = `SELECT dh.*, nd.ho_ten as ten_nguoi_mua, nd.so_dien_thoai as sdt_nguoi_mua,
            (SELECT COUNT(*) FROM chi_tiet_don_hang WHERE don_hang_id = dh.id) as so_san_pham
            FROM don_hang dh JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            WHERE dh.gian_hang_id = ?`;
        const params = [shop[0].id];

        if (trang_thai) {
            sql += ' AND dh.trang_thai = ?';
            params.push(trang_thai);
        }

        sql += ' ORDER BY dh.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder, updateOrderStatus, getShopOrders };
