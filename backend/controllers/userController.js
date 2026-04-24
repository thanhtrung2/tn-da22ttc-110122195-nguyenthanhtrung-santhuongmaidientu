const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// Cập nhật thông tin cá nhân
const updateProfile = async (req, res) => {
    try {
        const { ho_ten, so_dien_thoai, dia_chi } = req.body;
        let avatar = req.user.avatar;

        if (req.file) {
            avatar = req.file.path || req.file.filename;
        }

        await pool.query(
            'UPDATE nguoi_dung SET ho_ten = ?, so_dien_thoai = ?, dia_chi = ?, avatar = ? WHERE id = ?',
            [ho_ten || req.user.ho_ten, so_dien_thoai || req.user.so_dien_thoai, dia_chi || req.user.dia_chi, avatar, req.user.id]
        );

        res.json({ success: true, message: 'Cập nhật thông tin thành công' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đổi mật khẩu
const changePassword = async (req, res) => {
    try {
        const { mat_khau_cu, mat_khau_moi } = req.body;

        if (!mat_khau_cu || !mat_khau_moi) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        const [rows] = await pool.query('SELECT mat_khau FROM nguoi_dung WHERE id = ?', [req.user.id]);
        const isValid = await bcrypt.compare(mat_khau_cu, rows[0].mat_khau);

        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
        }

        const hashed = await bcrypt.hash(mat_khau_moi, 10);
        await pool.query('UPDATE nguoi_dung SET mat_khau = ? WHERE id = ?', [hashed, req.user.id]);

        res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { updateProfile, changePassword };
