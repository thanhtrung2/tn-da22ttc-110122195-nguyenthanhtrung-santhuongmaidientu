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
        const { vai_tro, search } = req.query;
        let sql = 'SELECT id, ho_ten, email, so_dien_thoai, vai_tro, trang_thai, ngay_tao FROM nguoi_dung WHERE 1=1';
        const params = [];

        if (vai_tro) { sql += ' AND vai_tro = ?'; params.push(vai_tro); }
        if (search) { sql += ' AND (ho_ten LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        sql += ' ORDER BY ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
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
    getSellerDashboard
};
