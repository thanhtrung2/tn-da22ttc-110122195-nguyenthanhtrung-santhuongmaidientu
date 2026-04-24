const pool = require('../config/database');

// Tạo đánh giá
const createReview = async (req, res) => {
    try {
        const { san_pham_id, don_hang_id, so_sao, binh_luan } = req.body;

        if (!so_sao || so_sao < 1 || so_sao > 5) {
            return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1-5 sao' });
        }

        // Check order completed and belongs to user
        const [order] = await pool.query(
            "SELECT * FROM don_hang WHERE id = ? AND nguoi_mua_id = ? AND trang_thai = 'hoan_thanh'",
            [don_hang_id, req.user.id]
        );

        if (order.length === 0) {
            return res.status(400).json({ success: false, message: 'Chỉ có thể đánh giá khi đơn hàng đã hoàn thành' });
        }

        // Check product in order
        const [orderItem] = await pool.query(
            'SELECT * FROM chi_tiet_don_hang WHERE don_hang_id = ? AND san_pham_id = ?',
            [don_hang_id, san_pham_id]
        );

        if (orderItem.length === 0) {
            return res.status(400).json({ success: false, message: 'Sản phẩm không có trong đơn hàng' });
        }

        // Check already reviewed
        const [existing] = await pool.query(
            'SELECT id FROM danh_gia WHERE nguoi_mua_id = ? AND san_pham_id = ? AND don_hang_id = ?',
            [req.user.id, san_pham_id, don_hang_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bạn đã đánh giá sản phẩm này' });
        }

        await pool.query(
            'INSERT INTO danh_gia (san_pham_id, nguoi_mua_id, don_hang_id, so_sao, binh_luan) VALUES (?, ?, ?, ?, ?)',
            [san_pham_id, req.user.id, don_hang_id, so_sao, binh_luan]
        );

        res.status(201).json({ success: true, message: 'Đánh giá thành công' });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy đánh giá theo sản phẩm
const getProductReviews = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT dg.*, nd.ho_ten, nd.avatar FROM danh_gia dg
            JOIN nguoi_dung nd ON dg.nguoi_mua_id = nd.id
            WHERE dg.san_pham_id = ? ORDER BY dg.ngay_tao DESC`,
            [req.params.productId]
        );

        const [stats] = await pool.query(
            `SELECT AVG(so_sao) as trung_binh, COUNT(*) as tong,
            SUM(CASE WHEN so_sao = 5 THEN 1 ELSE 0 END) as sao_5,
            SUM(CASE WHEN so_sao = 4 THEN 1 ELSE 0 END) as sao_4,
            SUM(CASE WHEN so_sao = 3 THEN 1 ELSE 0 END) as sao_3,
            SUM(CASE WHEN so_sao = 2 THEN 1 ELSE 0 END) as sao_2,
            SUM(CASE WHEN so_sao = 1 THEN 1 ELSE 0 END) as sao_1
            FROM danh_gia WHERE san_pham_id = ?`,
            [req.params.productId]
        );

        res.json({ success: true, data: { reviews: rows, stats: stats[0] } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { createReview, getProductReviews };
