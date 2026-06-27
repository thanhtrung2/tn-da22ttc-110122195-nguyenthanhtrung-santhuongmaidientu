const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cấu hình multer cho upload file xác thực
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/verification/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadVerification = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG) hoặc PDF'));
        }
    }
}).fields([
    { name: 'cccd_mat_truoc', maxCount: 1 },
    { name: 'cccd_mat_sau', maxCount: 1 },
    { name: 'giay_phep_kinh_doanh', maxCount: 1 },
    { name: 'anh_guong_mat', maxCount: 1 }
]);

// Đăng ký
const register = async (req, res) => {
    try {
        const { ho_ten, email, mat_khau, so_dien_thoai, vai_tro } = req.body;

        console.log('Register request:', { ho_ten, email, vai_tro, hasFiles: !!req.files });

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
        const ten_dang_nhap = email.split('@')[0]; // Generate username from email

        // Xử lý đăng ký người bán với xác thực
        if (userRole === 'seller') {
            console.log('Seller registration - Files:', req.files);
            
            // Kiểm tra file upload
            if (!req.files || !req.files.cccd_mat_truoc || !req.files.cccd_mat_sau || 
                !req.files.giay_phep_kinh_doanh || !req.files.anh_guong_mat) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Vui lòng tải lên đầy đủ các giấy tờ xác thực (CCCD 2 mặt, Giấy phép kinh doanh, Ảnh gương mặt)' 
                });
            }

            const [result] = await pool.query(
                `INSERT INTO nguoi_dung (ho_ten, email, mat_khau, so_dien_thoai, vai_tro,
                 cccd_mat_truoc, cccd_mat_sau, giay_phep_kinh_doanh, anh_guong_mat, trang_thai_xac_thuc) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [
                    ho_ten, email, hashedPassword, so_dien_thoai || null, userRole,
                    req.files.cccd_mat_truoc[0].path,
                    req.files.cccd_mat_sau[0].path,
                    req.files.giay_phep_kinh_doanh[0].path,
                    req.files.anh_guong_mat[0].path
                ]
            );

            const token = jwt.sign({ id: result.insertId, vai_tro: userRole }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

            return res.status(201).json({
                success: true,
                message: 'Đăng ký thành công! Tài khoản đang chờ Admin xác thực.',
                data: { 
                    token, 
                    user: { 
                        id: result.insertId, 
                        ho_ten, 
                        email, 
                        ten_dang_nhap,
                        vai_tro: userRole,
                        trang_thai_xac_thuc: 'pending'
                    } 
                }
            });
        }

        // Đăng ký người mua bình thường
        const [result] = await pool.query(
            'INSERT INTO nguoi_dung (ho_ten, email, mat_khau, so_dien_thoai, vai_tro) VALUES (?, ?, ?, ?, ?)',
            [ho_ten, email, hashedPassword, so_dien_thoai || null, userRole]
        );

        const token = jwt.sign({ id: result.insertId, vai_tro: userRole }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: { token, user: { id: result.insertId, ho_ten, email, ten_dang_nhap, vai_tro: userRole } }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
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
                    ten_dang_nhap: user.ten_dang_nhap,
                    vai_tro: user.vai_tro,
                    avatar: user.avatar,
                    so_dien_thoai: user.so_dien_thoai,
                    dia_chi: user.dia_chi,
                    has_password: 1
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

// Google OAuth Login
const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ success: false, message: 'Thiếu Google credential' });
        }

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // Check if user exists
        const [existing] = await pool.query('SELECT * FROM nguoi_dung WHERE email = ?', [email]);
        
        let user;
        if (existing.length > 0) {
            // User exists, login
            user = existing[0];
            user.has_password = (user.mat_khau && user.mat_khau !== "") ? 1 : 0;
            
            if (user.trang_thai === 'locked') {
                return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
            }
        } else {
            // Create new user
            const [result] = await pool.query(
                'INSERT INTO nguoi_dung (ho_ten, email, vai_tro, avatar, google_id) VALUES (?, ?, ?, ?, ?)',
                [name, email, 'customer', picture, payload.sub]
            );
            
            user = {
                id: result.insertId,
                ho_ten: name,
                email: email,
                vai_tro: 'customer',
                avatar: picture,
                google_id: payload.sub,
                has_password: 0
            };
        }

        const token = jwt.sign({ id: user.id, vai_tro: user.vai_tro }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        res.json({
            success: true,
            message: 'Đăng nhập Google thành công',
            data: {
                token,
                user: {
                    id: user.id,
                    ho_ten: user.ho_ten,
                    email: user.email,
                    vai_tro: user.vai_tro,
                    avatar: user.avatar,
                    so_dien_thoai: user.so_dien_thoai,
                    dia_chi: user.dia_chi,
                    has_password: user.has_password
                }
            }
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xác thực Google' });
    }
};

// Quên mật khẩu
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email' });
        }

        const [users] = await pool.query('SELECT id FROM nguoi_dung WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Email không tồn tại trong hệ thống' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60000); // 15 mins

        await pool.query(
            'UPDATE nguoi_dung SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
            [otp, expires, email]
        );

        // Mock email response
        res.json({
            success: true,
            message: 'Mã xác thực đã được gửi đến email của bạn (Vui lòng xem trên màn hình vì đây là bản demo)',
            data: { mockOtp: otp } // For demo purposes
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi yêu cầu lấy lại mật khẩu' });
    }
};

// Đặt lại mật khẩu
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        const [users] = await pool.query(
            'SELECT id, reset_token, reset_token_expires FROM nguoi_dung WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Email không hợp lệ' });
        }

        const user = users[0];

        if (user.reset_token !== otp) {
            return res.status(400).json({ success: false, message: 'Mã xác thực không chính xác' });
        }

        if (new Date(user.reset_token_expires) < new Date()) {
            return res.status(400).json({ success: false, message: 'Mã xác thực đã hết hạn' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE nguoi_dung SET mat_khau = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?',
            [hashedPassword, email]
        );

        res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đặt lại mật khẩu' });
    }
};

module.exports = { register, login, getProfile, uploadVerification, googleLogin, forgotPassword, resetPassword };
