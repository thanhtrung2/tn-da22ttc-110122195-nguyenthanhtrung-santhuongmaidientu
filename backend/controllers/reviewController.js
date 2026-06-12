const pool = require('../config/database');

const createReview = async (req, res) => {
    try {
        const { san_pham_id, don_hang_id, so_sao, binh_luan } = req.body;

        if (!so_sao || so_sao < 1 || so_sao > 5) {
            return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1-5 sao' });
        }

        const [order] = await pool.query(
            "SELECT * FROM don_hang WHERE id = ? AND nguoi_mua_id = ? AND trang_thai = 'hoan_thanh'",
            [don_hang_id, req.user.id]
        );

        if (order.length === 0) {
            return res.status(400).json({ success: false, message: 'Chỉ có thể đánh giá khi đơn hàng đã hoàn thành' });
        }

        const [orderItem] = await pool.query(
            'SELECT * FROM chi_tiet_don_hang WHERE don_hang_id = ? AND san_pham_id = ?',
            [don_hang_id, san_pham_id]
        );

        if (orderItem.length === 0) {
            return res.status(400).json({ success: false, message: 'Sản phẩm không có trong đơn hàng' });
        }

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

const getProductReviews = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT dg.*, nd.ho_ten, nd.avatar,
                rpl.ho_ten as ten_nguoi_phan_hoi
             FROM danh_gia dg
             JOIN nguoi_dung nd ON dg.nguoi_mua_id = nd.id
             LEFT JOIN nguoi_dung rpl ON dg.nguoi_phan_hoi_id = rpl.id
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

const getShopReviews = async (req, res) => {
    try {
        const [shop] = await pool.query(
            'SELECT id FROM gian_hang WHERE nguoi_ban_id = ?',
            [req.user.id]
        );
        if (shop.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy gian hàng' });
        }
        const shopId = shop[0].id;

        const [reviews] = await pool.query(
            `SELECT dg.*, nd.ho_ten, nd.avatar, sp.ten_san_pham, sp.hinh_anh
             FROM danh_gia dg
             JOIN nguoi_dung nd ON dg.nguoi_mua_id = nd.id
             JOIN san_pham sp ON dg.san_pham_id = sp.id
             WHERE sp.gian_hang_id = ?
             ORDER BY dg.ngay_tao DESC`,
            [shopId]
        );

        const [stats] = await pool.query(
            `SELECT AVG(dg.so_sao) as trung_binh, COUNT(*) as tong,
                SUM(CASE WHEN dg.so_sao = 5 THEN 1 ELSE 0 END) as sao_5,
                SUM(CASE WHEN dg.so_sao = 4 THEN 1 ELSE 0 END) as sao_4,
                SUM(CASE WHEN dg.so_sao = 3 THEN 1 ELSE 0 END) as sao_3,
                SUM(CASE WHEN dg.so_sao = 2 THEN 1 ELSE 0 END) as sao_2,
                SUM(CASE WHEN dg.so_sao = 1 THEN 1 ELSE 0 END) as sao_1
             FROM danh_gia dg
             JOIN san_pham sp ON dg.san_pham_id = sp.id
             WHERE sp.gian_hang_id = ?`,
            [shopId]
        );

        const [recentReviews] = await pool.query(
            `SELECT dg.so_sao, dg.ngay_tao, sp.ten_san_pham
             FROM danh_gia dg
             JOIN san_pham sp ON dg.san_pham_id = sp.id
             WHERE sp.gian_hang_id = ?
             ORDER BY dg.ngay_tao DESC LIMIT 5`,
            [shopId]
        );

        res.json({ success: true, data: { reviews, stats: stats[0], recentReviews } });
    } catch (error) {
        console.error('Get shop reviews error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const replyReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { phan_hoi } = req.body;

        if (!phan_hoi || phan_hoi.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Phản hồi phải có ít nhất 2 ký tự' });
        }

        const [review] = await pool.query('SELECT * FROM danh_gia WHERE id = ?', [reviewId]);
        if (review.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
        }

        const [shop] = await pool.query(
            'SELECT id FROM gian_hang WHERE nguoi_ban_id = ? AND id IN (SELECT gian_hang_id FROM san_pham WHERE id = ?)',
            [req.user.id, review[0].san_pham_id]
        );
        if (shop.length === 0) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền phản hồi đánh giá này' });
        }

        await pool.query(
            'UPDATE danh_gia SET phan_hoi = ?, nguoi_phan_hoi_id = ?, ngay_phan_hoi = CURRENT_TIMESTAMP WHERE id = ?',
            [phan_hoi.trim(), req.user.id, reviewId]
        );

        res.json({ success: true, message: 'Phản hồi thành công' });
    } catch (error) {
        console.error('Reply review error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { createReview, getProductReviews, getShopReviews, replyReview };
