const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [rows] = await pool.query('SELECT id, ho_ten, email, vai_tro, trang_thai, avatar, so_dien_thoai, dia_chi, IF(mat_khau IS NOT NULL AND mat_khau != "", 1, 0) as has_password FROM nguoi_dung WHERE id = ?', [decoded.id]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Người dùng không tồn tại' });
        }

        if (rows[0].trang_thai === 'locked') {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
        }
        return res.status(500).json({ success: false, message: 'Lỗi xác thực' });
    }
};

// Optional auth - doesn't reject if no token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [rows] = await pool.query('SELECT id, ho_ten, email, vai_tro, trang_thai, avatar FROM nguoi_dung WHERE id = ?', [decoded.id]);
            if (rows.length > 0 && rows[0].trang_thai === 'active') {
                req.user = rows[0];
            }
        }
    } catch (e) { /* ignore */ }
    next();
};

module.exports = { authenticate, optionalAuth };
