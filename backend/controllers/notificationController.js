const pool = require('../config/database');

// Lấy thông báo của người dùng
const getNotifications = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM thong_bao 
            WHERE nguoi_nhan_id = ? 
            ORDER BY ngay_tao DESC 
            LIMIT 50`,
            [req.user.id]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đánh dấu thông báo đã đọc
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { da_doc } = req.body;

        const [result] = await pool.query(
            'UPDATE thong_bao SET trang_thai = ? WHERE id = ? AND nguoi_nhan_id = ?',
            [da_doc ? 'read' : 'unread', id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đánh dấu tất cả thông báo đã đọc
const markAllAsRead = async (req, res) => {
    try {
        await pool.query(
            'UPDATE thong_bao SET trang_thai = \'read\' WHERE nguoi_nhan_id = ?',
            [req.user.id]
        );

        res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa thông báo
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'DELETE FROM thong_bao WHERE id = ? AND nguoi_nhan_id = ?',
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }

        res.json({ success: true, message: 'Xóa thành công' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đếm thông báo chưa đọc
const getUnreadCount = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM thong_bao WHERE nguoi_nhan_id = ? AND trang_thai = \'unread\'',
            [req.user.id]
        );

        res.json({ success: true, data: { count: rows[0].count } });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount };
