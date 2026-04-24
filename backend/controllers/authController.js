const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Đăng ký
const register = async (req, res) => {
    try {
        const { ho_ten, email, mat_khau, so_dien_thoai, vai_tro } = req.body;

        if (!ho_ten || !email || !mat_khau) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Check email exists
        const [existing] = await pool.query('SELECT id FROM nguoi_dung WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(mat_khau, 10);
        const userRole = vai_tro === 'seller' ? 'seller' : 'customer';

        const [result] = await pool.query(
            'INSERT INTO nguoi_dung (ho_ten, email, mat_khau, so_dien_thoai, vai_tro) VALUES (?, ?, ?, ?, ?)',
            [ho_ten, email, hashedPassword, so_dien_thoai || null, userRole]
        );

        const token = jwt.sign({ id: result.insertId, vai_tro: userRole }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: { token, user: { id: result.insertId, ho_ten, email, vai_tro: userRole } }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đăng nhập
const login = async (req, res) => {
    try {
        const { email, mat_khau } = req.body;

        if (!email || !mat_khau) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
        }

        const [rows] = await pool.query('SELECT * FROM nguoi_dung WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        const user = rows[0];

        if (user.trang_thai === 'locked') {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
        }

        const isPasswordValid = await bcrypt.compare(mat_khau, user.mat_khau);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        const token = jwt.sign({ id: user.id, vai_tro: user.vai_tro }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                token,
                user: {
                    id: user.id,
                    ho_ten: user.ho_ten,
                    email: user.email,
                    vai_tro: user.vai_tro,
                    avatar: user.avatar,
                    so_dien_thoai: user.so_dien_thoai,
                    dia_chi: user.dia_chi
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy thông tin cá nhân
const getProfile = async (req, res) => {
    try {
        res.json({ success: true, data: req.user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { register, login, getProfile };
