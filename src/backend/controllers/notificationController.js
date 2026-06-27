const pool = require('../config/database');
const getIO = () => { try { return require('../server').io; } catch { return null; } };

// Tạo thông báo mới và emit socket
const createNotification = async (nguoi_nhan_id, tieu_de, noi_dung, loai, url_lien_ket = null) => {
    try {
        const [result] = await pool.query(
            `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
             VALUES (?, ?, ?, ?, 'unread', ?)`,
            [nguoi_nhan_id, tieu_de, noi_dung, loai, url_lien_ket]
        );
        
        const newNotif = {
            id: result.insertId,
            nguoi_nhan_id,
            tieu_de,
            noi_dung,
            loai,
            trang_thai: 'unread',
            url_lien_ket,
            ngay_tao: new Date()
        };

        const io = getIO();
        if (io) {
            io.to(`user_${nguoi_nhan_id}`).emit('new_notification', newNotif);
        }
        return result.insertId;
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

// Lấy danh sách thông báo (có phân trang và lọc theo loại)
const getNotifications = async (req, res) => {
    try {
        const nguoi_nhan_id = req.user.id;
        const { loai, page = 1, limit = 10 } = req.query;
        
        let sql = `SELECT * FROM thong_bao WHERE nguoi_nhan_id = ?`;
        const params = [nguoi_nhan_id];

        if (loai && loai !== 'all') {
            sql += ` AND loai = ?`;
            params.push(loai);
        }

        // Đếm tổng số để phân trang
        const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM (${sql}) as subquery`, params);
        const total = countResult[0].total;

        // Thêm sắp xếp và giới hạn
        sql += ` ORDER BY ngay_tao DESC LIMIT ? OFFSET ?`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const [rows] = await pool.query(sql, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy số lượng chưa đọc
const getUnreadCount = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) as count FROM thong_bao WHERE nguoi_nhan_id = ? AND trang_thai = 'unread'`,
            [req.user.id]
        );
        res.json({ success: true, data: { count: rows[0].count } });
    } catch (error) {
        console.error('getUnreadCount error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đánh dấu 1 thông báo là đã đọc
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `UPDATE thong_bao SET trang_thai = 'read', ngay_doc = NOW() WHERE id = ? AND nguoi_nhan_id = ?`,
            [id, req.user.id]
        );
        res.json({ success: true, message: 'Đã đánh dấu là đã đọc' });
    } catch (error) {
        console.error('markAsRead error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đánh dấu tất cả là đã đọc
const markAllAsRead = async (req, res) => {
    try {
        await pool.query(
            `UPDATE thong_bao SET trang_thai = 'read', ngay_doc = NOW() WHERE nguoi_nhan_id = ? AND trang_thai = 'unread'`,
            [req.user.id]
        );
        res.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
    } catch (error) {
        console.error('markAllAsRead error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa thông báo
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `DELETE FROM thong_bao WHERE id = ? AND nguoi_nhan_id = ?`,
            [id, req.user.id]
        );
        res.json({ success: true, message: 'Đã xóa thông báo' });
    } catch (error) {
        console.error('deleteNotification error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    createNotification,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
