const pool = require('../config/database');

// Gửi khiếu nại
const createComplaint = async (req, res) => {
    try {
        const { don_hang_id, loai_khieu_nai, mo_ta } = req.body;

        if (!don_hang_id || !loai_khieu_nai || !mo_ta) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Check order belongs to user (buyer or seller)
        const [order] = await pool.query(
            `SELECT dh.* FROM don_hang dh 
            LEFT JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            WHERE dh.id = ? AND (dh.nguoi_mua_id = ? OR gh.nguoi_ban_id = ?)`,
            [don_hang_id, req.user.id, req.user.id]
        );

        if (order.length === 0) {
            return res.status(400).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        await pool.query(
            'INSERT INTO khieu_nai (nguoi_gui_id, don_hang_id, loai_khieu_nai, mo_ta) VALUES (?, ?, ?, ?)',
            [req.user.id, don_hang_id, loai_khieu_nai, mo_ta]
        );

        res.status(201).json({ success: true, message: 'Gửi khiếu nại thành công' });
    } catch (error) {
        console.error('Create complaint error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy khiếu nại của tôi
const getMyComplaints = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT kn.*, dh.ma_giao_dich FROM khieu_nai kn
            JOIN don_hang dh ON kn.don_hang_id = dh.id
            WHERE kn.nguoi_gui_id = ? ORDER BY kn.ngay_tao DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Admin - Lấy tất cả khiếu nại
const getAllComplaints = async (req, res) => {
    try {
        const { trang_thai } = req.query;
        let sql = `SELECT kn.*, nd.ho_ten as ten_nguoi_gui, nd.email, dh.ma_giao_dich, dh.tong_tien
            FROM khieu_nai kn
            JOIN nguoi_dung nd ON kn.nguoi_gui_id = nd.id
            JOIN don_hang dh ON kn.don_hang_id = dh.id`;
        const params = [];

        if (trang_thai) {
            sql += ' WHERE kn.trang_thai = ?';
            params.push(trang_thai);
        }

        sql += ' ORDER BY kn.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Admin - Xử lý khiếu nại
const handleComplaint = async (req, res) => {
    try {
        const { trang_thai, phan_hoi_admin } = req.body;
        const validStatuses = ['dang_xu_ly', 'da_xu_ly', 'tu_choi'];

        if (!validStatuses.includes(trang_thai)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        await pool.query(
            'UPDATE khieu_nai SET trang_thai = ?, phan_hoi_admin = ? WHERE id = ?',
            [trang_thai, phan_hoi_admin, req.params.id]
        );

        res.json({ success: true, message: 'Cập nhật khiếu nại thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { createComplaint, getMyComplaints, getAllComplaints, handleComplaint };
