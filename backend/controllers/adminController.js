const pool = require('../config/database');

// Dashboard thống kê
const getDashboard = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT COUNT(*) as total, vai_tro FROM nguoi_dung GROUP BY vai_tro');
        const [orders] = await pool.query('SELECT COUNT(*) as total, trang_thai FROM don_hang GROUP BY trang_thai');
        const [revenue] = await pool.query("SELECT SUM(tong_tien) as total FROM don_hang WHERE trang_thai = 'hoan_thanh'");
        const [products] = await pool.query('SELECT COUNT(*) as total FROM san_pham');
        const [shops] = await pool.query('SELECT COUNT(*) as total FROM gian_hang');
        const [complaints] = await pool.query("SELECT COUNT(*) as total FROM khieu_nai WHERE trang_thai = 'cho_xu_ly'");
        const [recentOrders] = await pool.query(
            `SELECT dh.*, nd.ho_ten, gh.ten_gian_hang FROM don_hang dh
            JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            ORDER BY dh.ngay_tao DESC LIMIT 10`
        );

        // Monthly revenue (last 6 months)
        const [monthlyRevenue] = await pool.query(
            `SELECT DATE_FORMAT(ngay_tao, '%Y-%m') as thang, SUM(tong_tien) as doanh_thu, COUNT(*) as so_don
            FROM don_hang WHERE trang_thai = 'hoan_thanh' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m') ORDER BY thang`
        );

        res.json({
            success: true,
            data: {
                users, orders, revenue: revenue[0].total || 0,
                products: products[0].total, shops: shops[0].total,
                pendingComplaints: complaints[0].total,
                recentOrders, monthlyRevenue
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Quản lý người dùng
const getAllUsers = async (req, res) => {
    try {
        const { vai_tro, search, trang_thai_xac_thuc, fromDate, toDate } = req.query;
        let sql = `SELECT u.id, u.ho_ten, u.email, u.so_dien_thoai, u.vai_tro, u.trang_thai, u.trang_thai_xac_thuc, 
                    u.cccd_mat_truoc, u.cccd_mat_sau, u.giay_phep_kinh_doanh, u.anh_guong_mat, u.ngay_tao,
                    s.ten_shop, s.mo_ta as mo_ta_shop, s.dia_chi_kho, s.ma_so_thue
                    FROM nguoi_dung u
                    LEFT JOIN shop s ON u.id = s.nguoi_ban_id
                    WHERE 1=1`;
        const params = [];

        if (vai_tro) { sql += ' AND u.vai_tro = ?'; params.push(vai_tro); }
        if (search) { sql += ' AND (u.ho_ten LIKE ? OR u.email LIKE ? OR s.ten_shop LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (trang_thai_xac_thuc) { sql += ' AND u.trang_thai_xac_thuc = ?'; params.push(trang_thai_xac_thuc); }
        if (fromDate) { sql += ' AND u.ngay_tao >= ?'; params.push(fromDate); }
        if (toDate) { sql += ' AND u.ngay_tao <= ?'; params.push(toDate + ' 23:59:59'); }
        
        sql += ' ORDER BY u.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('GetAllUsers error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy danh sách người bán chờ xác thực
const getPendingSellers = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        let sql = `SELECT u.id, u.ho_ten, u.email, u.so_dien_thoai, u.cccd_mat_truoc, u.cccd_mat_sau, 
                    u.giay_phep_kinh_doanh, u.anh_guong_mat, u.trang_thai_xac_thuc, u.ngay_tao,
                    s.ten_shop, s.mo_ta as mo_ta_shop, s.dia_chi_kho, s.ma_so_thue, s.phuong_thuc_van_chuyen
                    FROM nguoi_dung u 
                    JOIN shop s ON u.id = s.nguoi_ban_id
                    WHERE u.vai_tro = 'seller' AND u.trang_thai_xac_thuc = 'pending'`;
        const params = [];
        
        if (fromDate) { sql += ' AND u.ngay_tao >= ?'; params.push(fromDate); }
        if (toDate) { sql += ' AND u.ngay_tao <= ?'; params.push(toDate + ' 23:59:59'); }
        
        sql += ' ORDER BY u.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('GetPendingSellers error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xác thực người bán
const verifySellerAccount = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { trang_thai_xac_thuc, ly_do_tu_choi } = req.body;
        const userId = req.params.id;

        if (!['verified', 'rejected'].includes(trang_thai_xac_thuc)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        if (trang_thai_xac_thuc === 'rejected' && !ly_do_tu_choi) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối' });
        }

        if (!req.user || !req.user.id) {
            throw new Error('Không tìm thấy thông tin Admin thực hiện phê duyệt');
        }

        // 1. Cập nhật thông tin xác thực trên bảng nguoi_dung
        const [updateUserResult] = await connection.query(
            'UPDATE nguoi_dung SET trang_thai_xac_thuc = ?, ly_do_tu_choi = ?, ngay_xac_thuc = NOW() WHERE id = ? AND vai_tro = ?',
            [trang_thai_xac_thuc, ly_do_tu_choi || null, userId, 'seller']
        );

        // 2. Cập nhật bảng shop
        const shopStatus = trang_thai_xac_thuc === 'verified' ? 'active' : 'rejected';
        const [updateShopResult] = await connection.query(
            'UPDATE shop SET trang_thai = ?, ly_do_tu_choi = ?, ngay_duyet = NOW(), admin_duyet_id = ? WHERE nguoi_ban_id = ?',
            [shopStatus, ly_do_tu_choi || null, req.user.id, userId]
        );

        if (trang_thai_xac_thuc === 'verified') {
            // 3. Lấy thông tin shop để tạo gian_hang
            const [shops] = await connection.query('SELECT * FROM shop WHERE nguoi_ban_id = ?', [userId]);
            if (shops.length === 0) {
                throw new Error('Không tìm thấy thông tin đăng ký shop của người dùng này');
            }
            
            const shop = shops[0];
            // Kiểm tra gian_hang đã tồn tại chưa
            const [existingGianHang] = await connection.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [userId]);
            
            if (existingGianHang.length === 0) {
                // Tạo gian_hang mới
                await connection.query(
                    'INSERT INTO gian_hang (nguoi_ban_id, ten_gian_hang, mo_ta, dia_chi, shop_id, trang_thai) VALUES (?, ?, ?, ?, ?, "active")',
                    [userId, shop.ten_shop, shop.mo_ta || '', shop.dia_chi_kho, shop.id]
                );
            } else {
                // Cập nhật gian_hang hiện có
                await connection.query(
                    'UPDATE gian_hang SET ten_gian_hang = ?, mo_ta = ?, dia_chi = ?, shop_id = ?, trang_thai = "active" WHERE nguoi_ban_id = ?',
                    [shop.ten_shop, shop.mo_ta || '', shop.dia_chi_kho, shop.id, userId]
                );
            }

            // 4. Gửi thông báo thành công cho seller
            await connection.query(
                `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, 'Chúc mừng! Bạn đã trở thành Người bán', 'Hồ sơ đăng ký bán hàng của bạn đã được Admin phê duyệt. Bây giờ bạn có thể bắt đầu đăng sản phẩm và quản lý gian hàng của mình.', 'seller_approved', 'unread', '/pages/seller/dashboard.html']
            );
        } else {
            // Gửi thông báo từ chối cho seller
            await connection.query(
                `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, 'Thông báo kết quả xét duyệt Người bán', `Rất tiếc, hồ sơ đăng ký bán hàng của bạn không được phê duyệt. Lý do: ${ly_do_tu_choi}`, 'seller_rejected', 'unread', '/pages/profile.html']
            );
        }

        await connection.commit();
        res.json({ 
            success: true, 
            message: trang_thai_xac_thuc === 'verified' ? 'Xác thực người bán thành công' : 'Đã từ chối xác thực người bán'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Verify seller error detailed:', {
            error: error.message,
            stack: error.stack,
            userId: req.params.id,
            body: req.body
        });
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Lấy danh sách sản phẩm chờ duyệt
const getPendingProducts = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT sp.*, gh.ten_gian_hang, dm.ten_danh_muc, nd.ho_ten as ten_nguoi_ban
            FROM san_pham sp
            JOIN gian_hang gh ON sp.gian_hang_id = gh.id
            JOIN nguoi_dung nd ON gh.nguoi_ban_id = nd.id
            LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
            WHERE sp.trang_thai_duyet = 'pending'
            ORDER BY sp.ngay_tao DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Duyệt sản phẩm
const approveProduct = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { trang_thai_duyet, ly_do_tu_choi } = req.body;
        const productId = req.params.id;

        if (!['approved', 'rejected'].includes(trang_thai_duyet)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        if (trang_thai_duyet === 'rejected' && !ly_do_tu_choi) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối' });
        }

        // Lấy thông tin sản phẩm và seller trước khi update
        const [products] = await connection.query(
            `SELECT sp.ten_san_pham, gh.nguoi_ban_id 
             FROM san_pham sp 
             JOIN gian_hang gh ON sp.gian_hang_id = gh.id 
             WHERE sp.id = ?`, 
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        const { ten_san_pham, nguoi_ban_id } = products[0];

        await connection.query(
            'UPDATE san_pham SET trang_thai_duyet = ?, ly_do_tu_choi = ? WHERE id = ?',
            [trang_thai_duyet, ly_do_tu_choi || null, productId]
        );

        // Gửi thông báo cho seller
        const title = trang_thai_duyet === 'approved' ? 'Sản phẩm đã được duyệt' : 'Sản phẩm bị từ chối';
        const content = trang_thai_duyet === 'approved' 
            ? `Chúc mừng! Sản phẩm "${ten_san_pham}" của bạn đã được Admin phê duyệt và đang hiển thị trên sàn.` 
            : `Rất tiếc, sản phẩm "${ten_san_pham}" của bạn không được phê duyệt. Lý do: ${ly_do_tu_choi}`;

        await connection.query(
            `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [nguoi_ban_id, title, content, 'system', 'unread', '/pages/seller/products.html']
        );

        await connection.commit();
        res.json({ 
            success: true, 
            message: trang_thai_duyet === 'approved' ? 'Duyệt sản phẩm thành công' : 'Đã từ chối sản phẩm'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Approve product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// Khóa/Mở khóa tài khoản
const toggleUserStatus = async (req, res) => {
    try {
        const { trang_thai } = req.body;
        await pool.query('UPDATE nguoi_dung SET trang_thai = ? WHERE id = ? AND vai_tro != ?', [trang_thai, req.params.id, 'admin']);
        res.json({ success: true, message: `${trang_thai === 'locked' ? 'Khóa' : 'Mở khóa'} tài khoản thành công` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Quản lý tất cả sản phẩm
const adminGetProducts = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT sp.*, gh.ten_gian_hang, dm.ten_danh_muc FROM san_pham sp
            JOIN gian_hang gh ON sp.gian_hang_id = gh.id
            LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
            ORDER BY sp.ngay_tao DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa/Ban sản phẩm
const adminUpdateProduct = async (req, res) => {
    try {
        const { trang_thai } = req.body;
        await pool.query('UPDATE san_pham SET trang_thai = ? WHERE id = ?', [trang_thai, req.params.id]);
        res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Quản lý tất cả đơn hàng
const adminGetOrders = async (req, res) => {
    try {
        const { trang_thai } = req.query;
        let sql = `SELECT dh.*, nd.ho_ten as ten_nguoi_mua, gh.ten_gian_hang
            FROM don_hang dh
            JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            JOIN gian_hang gh ON dh.gian_hang_id = gh.id`;
        const params = [];

        if (trang_thai) { sql += ' WHERE dh.trang_thai = ?'; params.push(trang_thai); }
        sql += ' ORDER BY dh.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Quản lý gian hàng
const adminGetShops = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT gh.*, nd.ho_ten as ten_nguoi_ban, nd.email,
            (SELECT COUNT(*) FROM san_pham WHERE gian_hang_id = gh.id) as so_san_pham,
            (SELECT COUNT(*) FROM don_hang WHERE gian_hang_id = gh.id) as so_don_hang
            FROM gian_hang gh JOIN nguoi_dung nd ON gh.nguoi_ban_id = nd.id ORDER BY gh.ngay_tao DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const adminUpdateShop = async (req, res) => {
    try {
        const { trang_thai } = req.body;
        await pool.query('UPDATE gian_hang SET trang_thai = ? WHERE id = ?', [trang_thai, req.params.id]);
        res.json({ success: true, message: 'Cập nhật gian hàng thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Seller Dashboard - Doanh thu
const getSellerDashboard = async (req, res) => {
    try {
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) return res.json({ success: true, data: null });

        const shopId = shop[0].id;
        const [revenue] = await pool.query("SELECT SUM(tong_tien) as total FROM don_hang WHERE gian_hang_id = ? AND trang_thai = 'hoan_thanh'", [shopId]);
        const [orders] = await pool.query('SELECT COUNT(*) as total, trang_thai FROM don_hang WHERE gian_hang_id = ? GROUP BY trang_thai', [shopId]);
        const [products] = await pool.query('SELECT COUNT(*) as total FROM san_pham WHERE gian_hang_id = ?', [shopId]);
        const [recentOrders] = await pool.query(
            `SELECT dh.*, nd.ho_ten FROM don_hang dh JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            WHERE dh.gian_hang_id = ? ORDER BY dh.ngay_tao DESC LIMIT 5`, [shopId]
        );
        const [monthlyRevenue] = await pool.query(
            `SELECT DATE_FORMAT(ngay_tao, '%Y-%m') as thang, SUM(tong_tien) as doanh_thu, COUNT(*) as so_don
            FROM don_hang WHERE gian_hang_id = ? AND trang_thai = 'hoan_thanh' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m') ORDER BY thang`, [shopId]
        );

        res.json({
            success: true,
            data: { revenue: revenue[0].total || 0, orders, products: products[0].total, recentOrders, monthlyRevenue }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getDashboard, getAllUsers, toggleUserStatus,
    adminGetProducts, adminUpdateProduct,
    adminGetOrders, adminGetShops, adminUpdateShop,
    getSellerDashboard,
    getPendingSellers, verifySellerAccount,
    getPendingProducts, approveProduct
};
