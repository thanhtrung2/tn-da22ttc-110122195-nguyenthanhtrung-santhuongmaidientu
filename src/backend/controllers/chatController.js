const pool = require('../config/database');

// Lấy danh sách cuộc hội thoại
const getConversations = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT 
                CASE WHEN tn.nguoi_gui_id = ? THEN tn.nguoi_nhan_id ELSE tn.nguoi_gui_id END as user_id,
                COALESCE(gh.ten_gian_hang, nd.ho_ten) as ho_ten, nd.avatar, nd.vai_tro,
                (SELECT noi_dung FROM tin_nhan WHERE 
                    (nguoi_gui_id = ? AND nguoi_nhan_id = nd.id) OR 
                    (nguoi_gui_id = nd.id AND nguoi_nhan_id = ?) 
                    ORDER BY ngay_tao DESC LIMIT 1) as last_message,
                (SELECT ngay_tao FROM tin_nhan WHERE 
                    (nguoi_gui_id = ? AND nguoi_nhan_id = nd.id) OR 
                    (nguoi_gui_id = nd.id AND nguoi_nhan_id = ?) 
                    ORDER BY ngay_tao DESC LIMIT 1) as last_time,
                (SELECT COUNT(*) FROM tin_nhan WHERE nguoi_gui_id = nd.id AND nguoi_nhan_id = ? AND da_doc = FALSE) as unread
            FROM tin_nhan tn
            JOIN nguoi_dung nd ON (CASE WHEN tn.nguoi_gui_id = ? THEN tn.nguoi_nhan_id ELSE tn.nguoi_gui_id END) = nd.id
            LEFT JOIN gian_hang gh ON nd.id = gh.nguoi_ban_id AND nd.vai_tro = 'seller'
            WHERE tn.nguoi_gui_id = ? OR tn.nguoi_nhan_id = ?
            ORDER BY last_time DESC`,
            [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy tin nhắn giữa 2 người
const getMessages = async (req, res) => {
    try {
        const otherUserId = req.params.userId;

        // Mark as read
        await pool.query(
            'UPDATE tin_nhan SET da_doc = TRUE WHERE nguoi_gui_id = ? AND nguoi_nhan_id = ?',
            [otherUserId, req.user.id]
        );

        const [rows] = await pool.query(
            `SELECT tn.*, COALESCE(gh.ten_gian_hang, ng.ho_ten) as ten_nguoi_gui, ng.avatar as avatar_nguoi_gui
            FROM tin_nhan tn
            JOIN nguoi_dung ng ON tn.nguoi_gui_id = ng.id
            LEFT JOIN gian_hang gh ON ng.id = gh.nguoi_ban_id AND ng.vai_tro = 'seller'
            WHERE (tn.nguoi_gui_id = ? AND tn.nguoi_nhan_id = ?) OR (tn.nguoi_gui_id = ? AND tn.nguoi_nhan_id = ?)
            ORDER BY tn.ngay_tao ASC LIMIT 100`,
            [req.user.id, otherUserId, otherUserId, req.user.id]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Gửi tin nhắn (HTTP fallback)
const sendMessage = async (req, res) => {
    try {
        const { nguoi_nhan_id, noi_dung } = req.body;

        if (!nguoi_nhan_id || !noi_dung) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung' });
        }

        const [result] = await pool.query(
            'INSERT INTO tin_nhan (nguoi_gui_id, nguoi_nhan_id, noi_dung) VALUES (?, ?, ?)',
            [req.user.id, nguoi_nhan_id, noi_dung]
        );

        res.status(201).json({ success: true, data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đếm tin nhắn chưa đọc
const getUnreadCount = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM tin_nhan WHERE nguoi_nhan_id = ? AND da_doc = FALSE',
            [req.user.id]
        );
        res.json({ success: true, data: { count: rows[0].count } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa tin nhắn đơn lẻ
const deleteMessage = async (req, res) => {
    try {
        const messageId = req.params.id;
        const [result] = await pool.query(
            'DELETE FROM tin_nhan WHERE id = ? AND nguoi_gui_id = ?',
            [messageId, req.user.id]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Đã xóa tin nhắn' });
        } else {
            res.status(403).json({ success: false, message: 'Không có quyền xóa tin nhắn này hoặc tin nhắn không tồn tại' });
        }
    } catch (error) {
        console.error('Delete message API error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa cuộc hội thoại
const deleteConversation = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        await pool.query(
            'DELETE FROM tin_nhan WHERE (nguoi_gui_id = ? AND nguoi_nhan_id = ?) OR (nguoi_gui_id = ? AND nguoi_nhan_id = ?)',
            [req.user.id, otherUserId, otherUserId, req.user.id]
        );
        res.json({ success: true, message: 'Đã xóa cuộc hội thoại' });
    } catch (error) {
        console.error('Delete conversation API error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getConversations, getMessages, sendMessage, getUnreadCount, deleteMessage, deleteConversation };
