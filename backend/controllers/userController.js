const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');

// Cấu hình multer cho upload file xác thực seller
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/verification/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadSellerVerification = multer({
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

// Lấy thông tin cá nhân
const getProfile = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, ten_dang_nhap, ho_ten, email, so_dien_thoai, dia_chi, avatar, gioi_tinh, vai_tro, trang_thai_xac_thuc, ly_do_tu_choi FROM nguoi_dung WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
        }

        const user = rows[0];

        // If user is a seller, include shop info from gian_hang and shop tables
        if (user.vai_tro === 'seller') {
            const [gh] = await pool.query(
                'SELECT id as gian_hang_id, ten_gian_hang, mo_ta, trang_thai as trang_thai_gian_hang FROM gian_hang WHERE nguoi_ban_id = ?',
                [req.user.id]
            );
            if (gh.length > 0) {
                user.gian_hang_id = gh[0].gian_hang_id;
                user.ten_gian_hang = gh[0].ten_gian_hang;
                user.mo_ta_gian_hang = gh[0].mo_ta;
                user.trang_thai_gian_hang = gh[0].trang_thai_gian_hang;
            }
            const [sh] = await pool.query(
                'SELECT id as shop_id, ten_shop, mo_ta as mo_ta_shop, dia_chi_kho, phuong_thuc_van_chuyen, ma_so_thue, trang_thai as trang_thai_shop FROM shop WHERE nguoi_ban_id = ?',
                [req.user.id]
            );
            if (sh.length > 0) {
                user.shop_id = sh[0].shop_id;
                user.ten_shop = sh[0].ten_shop;
                user.mo_ta_shop = sh[0].mo_ta_shop;
                user.dia_chi_kho = sh[0].dia_chi_kho;
                user.phuong_thuc_van_chuyen = sh[0].phuong_thuc_van_chuyen;
                user.ma_so_thue = sh[0].ma_so_thue;
                user.trang_thai_shop = sh[0].trang_thai_shop;
            }
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Cập nhật thông tin cá nhân
const updateProfile = async (req, res) => {
    try {
        const { ho_ten, so_dien_thoai, dia_chi, gioi_tinh } = req.body;
        let avatar = req.user.avatar;

        if (req.file) {
            avatar = req.file.path.replace(/\\/g, '/');
        }

        await pool.query(
            'UPDATE nguoi_dung SET ho_ten = ?, so_dien_thoai = ?, dia_chi = ?, gioi_tinh = ?, avatar = ? WHERE id = ?',
            [ho_ten || req.user.ho_ten, so_dien_thoai || req.user.so_dien_thoai, dia_chi || req.user.dia_chi, gioi_tinh || req.user.gioi_tinh, avatar, req.user.id]
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

// Nâng cấp tài khoản thành seller
const upgradeToSeller = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Kiểm tra user hiện tại: chỉ customer HOẶC seller bị từ chối mới được đăng ký/đăng ký lại
        const [currentUser] = await connection.query(
            'SELECT vai_tro, trang_thai_xac_thuc FROM nguoi_dung WHERE id = ?',
            [req.user.id]
        );
        const dbVaiTro = currentUser[0].vai_tro;
        const dbTrangThai = currentUser[0].trang_thai_xac_thuc;
        const isRejectedSeller = dbVaiTro === 'seller' && dbTrangThai === 'rejected';
        
        if (dbVaiTro !== 'customer' && !isRejectedSeller) {
            return res.status(400).json({ 
                success: false, 
                message: 'Chỉ tài khoản khách hàng hoặc tài khoản bị từ chối mới có thể đăng ký bán hàng' 
            });
        }

        // Nếu là seller pending/verified, không cho đăng ký thêm
        if (dbVaiTro === 'seller' && ['pending', 'verified'].includes(dbTrangThai)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tài khoản đã được đăng ký bán hàng' 
            });
        }

        // Validate dữ liệu đầu vào
        const { ten_shop, mo_ta_shop, dia_chi_kho, phuong_thuc_van_chuyen, ma_so_thue, dong_y_chinh_sach } = req.body;

        if (!ten_shop || !mo_ta_shop || !dia_chi_kho || !phuong_thuc_van_chuyen) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền đầy đủ các thông tin bắt buộc' 
            });
        }
        
        if (dong_y_chinh_sach !== 'true') {
            return res.status(400).json({ 
                success: false, 
                message: 'Bạn phải đồng ý với chính sách và điều khoản của sàn' 
            });
        }

        // Validate mã số thuế (nếu có)
        if (ma_so_thue && ma_so_thue !== 'undefined') {
            const taxCodeRegex = /^\d{10,13}$/;
            if (!taxCodeRegex.test(ma_so_thue)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Mã số thuế không hợp lệ (phải là 10-13 chữ số)' 
                });
            }
        }

        // Kiểm tra file upload
        if (!req.files || !req.files.cccd_mat_truoc || !req.files.cccd_mat_sau || 
            !req.files.giay_phep_kinh_doanh || !req.files.anh_guong_mat) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng tải lên đầy đủ các giấy tờ xác thực' 
            });
        }

        // Tạo hoặc cập nhật bản ghi shop
        const [shopResult] = await connection.query(
            `INSERT INTO shop (
                nguoi_ban_id, ten_shop, mo_ta, dia_chi_kho, 
                phuong_thuc_van_chuyen, ma_so_thue, dong_y_chinh_sach, trang_thai, 
                ngay_tao, ngay_cap_nhat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                ten_shop = VALUES(ten_shop),
                mo_ta = VALUES(mo_ta),
                dia_chi_kho = VALUES(dia_chi_kho),
                phuong_thuc_van_chuyen = VALUES(phuong_thuc_van_chuyen),
                ma_so_thue = VALUES(ma_so_thue),
                dong_y_chinh_sach = VALUES(dong_y_chinh_sach),
                trang_thai = 'pending',
                ngay_cap_nhat = NOW()`,
            [
                req.user.id,
                ten_shop,
                mo_ta_shop,
                dia_chi_kho,
                phuong_thuc_van_chuyen,
                (ma_so_thue === 'undefined' || !ma_so_thue) ? '' : ma_so_thue,
                dong_y_chinh_sach === 'true'
            ]
        );

        // Chuẩn hóa đường dẫn file (thay \ thành / để làm URL)
        const pathNormalizer = (p) => p ? p.replace(/\\/g, '/') : null;

        // Cập nhật thông tin user thành seller
        await connection.query(
            `UPDATE nguoi_dung SET 
             vai_tro = 'seller',
             cccd_mat_truoc = ?, 
             cccd_mat_sau = ?, 
             giay_phep_kinh_doanh = ?, 
             anh_guong_mat = ?, 
             trang_thai_xac_thuc = 'pending',
             ly_do_tu_choi = NULL,
             ngay_cap_nhat = NOW()
             WHERE id = ?`,
            [
                pathNormalizer(req.files.cccd_mat_truoc[0].path),
                pathNormalizer(req.files.cccd_mat_sau[0].path),
                pathNormalizer(req.files.giay_phep_kinh_doanh[0].path),
                pathNormalizer(req.files.anh_guong_mat[0].path),
                req.user.id
            ]
        );

        // Tạo thông báo cho admin
        await connection.query(
            `INSERT INTO thong_bao (
                nguoi_nhan_id, tieu_de, noi_dung, loai, 
                trang_thai, ngay_tao
            ) VALUES (
                (SELECT id FROM nguoi_dung WHERE vai_tro = 'admin' LIMIT 1),
                'Đăng ký bán hàng mới',
                'Có đơn đăng ký bán hàng mới từ ${req.user.ho_ten} (${req.user.email}) cần được xét duyệt.',
                'seller_registration',
                'unread',
                NOW()
            )`
        );

        // Tạo thông báo cho user
        await connection.query(
            `INSERT INTO thong_bao (
                nguoi_nhan_id, tieu_de, noi_dung, loai, 
                trang_thai, ngay_tao
            ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [
                req.user.id,
                'Đăng ký bán hàng thành công',
                'Hồ sơ đăng ký bán hàng của bạn đã được gửi thành công. Chúng tôi sẽ xét duyệt trong vòng 1-3 ngày làm việc và thông báo kết quả qua email.',
                'seller_registration_received',
                'unread'
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Đăng ký bán hàng thành công! Hồ sơ đang chờ Admin xét duyệt.',
            data: {
                vai_tro: 'seller',
                trang_thai_xac_thuc: 'pending',
                shop_id: shopResult.insertId,
                thong_bao: 'Bạn sẽ nhận được thông báo kết quả xét duyệt qua email trong 1-3 ngày làm việc.'
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Upgrade to seller error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống. Vui lòng thử lại sau.' 
        });
    } finally {
        connection.release();
    }
};

const cancelSellerRegistration = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT vai_tro, trang_thai_xac_thuc FROM nguoi_dung WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
        
        const user = rows[0];
        if (user.vai_tro !== 'seller' || user.trang_thai_xac_thuc !== 'rejected') {
            return res.status(400).json({ success: false, message: 'Chỉ có thể xóa hồ sơ khi đăng ký bị từ chối' });
        }
        
        await pool.query('DELETE FROM shop WHERE nguoi_ban_id = ?', [req.user.id]);
        
        await pool.query(
            'UPDATE nguoi_dung SET vai_tro = ?, trang_thai_xac_thuc = NULL, cccd_mat_truoc = NULL, cccd_mat_sau = NULL, giay_phep_kinh_doanh = NULL, anh_guong_mat = NULL, ly_do_tu_choi = NULL WHERE id = ?',
            ['customer', req.user.id]
        );
        
        res.json({ success: true, message: 'Đã xóa hồ sơ đăng ký cũ thành công' });
    } catch (error) {
        console.error('Cancel seller registration error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getProfile, updateProfile, changePassword, upgradeToSeller, uploadSellerVerification, cancelSellerRegistration };
