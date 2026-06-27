const pool = require('../config/database');
const moderationModel = require('../utils/moderationModel');

// Dashboard thống kê
const getDashboard = async (req, res) => {
    try {
        const timeRange = req.query.timeRange || 'all';
        let dateCondition = "1=1"; // 'all' = không lọc theo thời gian
        let groupFormat = "'%Y-%m'";

        if (timeRange === 'day') {
            dateCondition = "DATE(ngay_tao) = CURDATE()";
            groupFormat = "'%H:00'";
        } else if (timeRange === 'week') {
            dateCondition = "ngay_tao >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            groupFormat = "'%d/%m'";
        } else if (timeRange === 'month') {
            dateCondition = "MONTH(ngay_tao) = MONTH(CURDATE()) AND YEAR(ngay_tao) = YEAR(CURDATE())";
            groupFormat = "'%d/%m'";
        } else if (timeRange === 'year') {
            dateCondition = "YEAR(ngay_tao) = YEAR(CURDATE())";
            groupFormat = "'Tháng %m'";
        } else if (timeRange === '6months') {
            dateCondition = "ngay_tao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
            groupFormat = "'%Y-%m'";
        }

        // Tạo phiên bản dateCondition có prefix dh. cho các JOIN
        const dhDateCondition = dateCondition.replace(/\bngay_tao\b/g, 'dh.ngay_tao');

        // Kiểm tra cột phi_admin/thue_vat có tồn tại không (cache trong module)
        const dhCols = await getDonHangCols();
        const hasPhiAdmin = dhCols.has('phi_admin');
        const hasThueVat = dhCols.has('thue_vat');

        const [users] = await pool.query('SELECT COUNT(*) as total, vai_tro FROM nguoi_dung GROUP BY vai_tro');
        const [orders] = await pool.query(`SELECT COUNT(*) as total, trang_thai FROM don_hang WHERE ${dateCondition} GROUP BY trang_thai`);
        const [revenue] = await pool.query(`SELECT SUM(tong_tien) as total FROM don_hang WHERE trang_thai = 'hoan_thanh' AND ${dateCondition}`);
        const [fees] = await pool.query(`SELECT
            ${hasPhiAdmin ? 'SUM(phi_admin)' : '0'} as total_admin,
            ${hasThueVat ? 'SUM(thue_vat)' : '0'} as total_vat
            FROM don_hang WHERE trang_thai = 'hoan_thanh' AND ${dateCondition}`);
        const [products] = await pool.query('SELECT COUNT(*) as total FROM san_pham');
        const [shops] = await pool.query('SELECT COUNT(*) as total FROM gian_hang');
        const [complaints] = await pool.query("SELECT COUNT(*) as total FROM khieu_nai WHERE trang_thai = 'cho_xu_ly'");
        const [recentOrders] = await pool.query(
            `SELECT dh.*, nd.ho_ten, gh.ten_gian_hang FROM don_hang dh
            JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            ORDER BY dh.ngay_tao DESC LIMIT 10`
        );

        // Chart data
        const [monthlyRevenue] = await pool.query(
            `SELECT DATE_FORMAT(ngay_tao, ${groupFormat}) as thang, SUM(tong_tien) as doanh_thu, COUNT(*) as so_don
            FROM don_hang WHERE trang_thai = 'hoan_thanh' AND ${dateCondition}
            GROUP BY thang ORDER BY MIN(ngay_tao)`
        );

        // Shop revenue (top 10)
        const [shopsRevenue] = await pool.query(
            `SELECT gh.id, gh.ten_gian_hang, SUM(dh.tong_tien) as doanh_thu, COUNT(dh.id) as so_don
             FROM gian_hang gh
             JOIN don_hang dh ON gh.id = dh.gian_hang_id
             WHERE dh.trang_thai = 'hoan_thanh' AND ${dhDateCondition}
             GROUP BY gh.id, gh.ten_gian_hang
             ORDER BY doanh_thu DESC LIMIT 10`
        );

        res.json({
            success: true,
            data: {
                users, orders, revenue: revenue[0].total || 0,
                adminCommission: fees[0].total_admin || 0,
                vatCollected: fees[0].total_vat || 0,
                products: products[0].total, shops: shops[0].total,
                pendingComplaints: complaints[0].total,
                recentOrders, monthlyRevenue, shopsRevenue,
                timeRange
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
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
                    s.ten_shop, s.mo_ta as mo_ta_shop, s.dia_chi_kho, s.ma_so_thue, s.phuong_thuc_van_chuyen, s.dong_y_chinh_sach
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

// Cập nhật tài khoản
const adminUpdateUser = async (req, res) => {
    try {
        const { ho_ten, email, so_dien_thoai, vai_tro } = req.body;
        const userId = req.params.id;

        // Không cho phép sửa đổi tài khoản admin nếu người dùng không phải là admin tối cao (chỉ an toàn cơ bản)
        const [targetUser] = await pool.query('SELECT vai_tro FROM nguoi_dung WHERE id = ?', [userId]);
        if (targetUser.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        
        if (targetUser[0].vai_tro === 'admin' && vai_tro !== 'admin') {
            return res.status(403).json({ success: false, message: 'Không thể thay đổi vai trò của Admin' });
        }

        await pool.query(
            'UPDATE nguoi_dung SET ho_ten = ?, email = ?, so_dien_thoai = ?, vai_tro = ? WHERE id = ?',
            [ho_ten, email, so_dien_thoai, vai_tro, userId]
        );
        res.json({ success: true, message: 'Cập nhật tài khoản thành công' });
    } catch (error) {
        console.error('adminUpdateUser error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email đã được sử dụng bởi người dùng khác' });
        }
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa tài khoản
const adminDeleteUser = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.params.id;

        const [targetUser] = await connection.query('SELECT vai_tro FROM nguoi_dung WHERE id = ?', [userId]);
        if (targetUser.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        if (targetUser[0].vai_tro === 'admin') return res.status(403).json({ success: false, message: 'Không thể xóa Admin' });

        // Hard delete: Try to delete directly. If constraint fails, it will throw ER_ROW_IS_REFERENCED
        await connection.query('DELETE FROM nguoi_dung WHERE id = ?', [userId]);
        
        await connection.commit();
        res.json({ success: true, message: 'Đã xóa tài khoản thành công' });
    } catch (error) {
        await connection.rollback();
        console.error('adminDeleteUser error:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            res.status(400).json({ success: false, message: 'Không thể xóa vì người dùng này đã có dữ liệu (đơn hàng, gian hàng...). Vui lòng Khóa tài khoản thay vì xóa.' });
        } else {
            res.status(500).json({ success: false, message: 'Lỗi server khi xóa tài khoản' });
        }
    } finally {
        connection.release();
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
            (SELECT COUNT(*) FROM don_hang WHERE gian_hang_id = gh.id) as so_don_hang,
            (SELECT COALESCE(SUM(tong_tien),0) FROM don_hang WHERE gian_hang_id = gh.id AND trang_thai = 'hoan_thanh') as doanh_thu
            FROM gian_hang gh JOIN nguoi_dung nd ON gh.nguoi_ban_id = nd.id ORDER BY gh.ngay_tao DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy doanh thu theo tháng cho một gian hàng (last N months)
const adminGetShopRevenue = async (req, res) => {
    try {
        const shopId = req.params.id;
        const { from, to, groupBy } = req.query;
        const gb = ['day','week','month','year'].includes((groupBy||'').toLowerCase()) ? groupBy.toLowerCase() : null;

        // Backward compatible: if no from/to/groupBy supplied, fall back to last N months grouped by month
        if (!from && !to && !gb) {
            const months = parseInt(req.query.months) || 6;
            const [rows] = await pool.query(
                `SELECT DATE_FORMAT(ngay_tao, '%Y-%m') as thang, COALESCE(SUM(tong_tien),0) as doanh_thu, COUNT(*) as so_don
                 FROM don_hang WHERE gian_hang_id = ? AND trang_thai = 'hoan_thanh' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL ? MONTH)
                 GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m') ORDER BY thang`, [shopId, months]
            );
            return res.json({ success: true, data: rows });
        }

        const group = gb || 'day';
        let dateCondition = '';
        const params = [shopId];
        if (from && to) {
            dateCondition = ' AND ngay_tao >= ? AND ngay_tao <= ?';
            params.push(from);
            params.push(to + ' 23:59:59');
        } else {
            dateCondition = ' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }

        let groupExpr = `DATE_FORMAT(ngay_tao, '%Y-%m-%d')`;
        if (group === 'week') groupExpr = `CONCAT(YEAR(ngay_tao), '-W', WEEK(ngay_tao,1))`;
        else if (group === 'month') groupExpr = `DATE_FORMAT(ngay_tao, '%Y-%m')`;
        else if (group === 'year') groupExpr = `DATE_FORMAT(ngay_tao, '%Y')`;

        const sql = `SELECT ${groupExpr} as thoi_gian, COALESCE(SUM(tong_tien),0) as doanh_thu, COUNT(*) as so_don
            FROM don_hang WHERE gian_hang_id = ? AND trang_thai = 'hoan_thanh' ${dateCondition}
            GROUP BY ${groupExpr} ORDER BY ${groupExpr}`;

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('adminGetShopRevenue error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Admin: lấy đơn hàng của 1 gian hàng trong khoảng thời gian
const adminGetShopOrders = async (req, res) => {
    try {
        const shopId = req.params.id;
        const { from, to, trang_thai } = req.query;
        let sql = `SELECT dh.*, nd.ho_ten as ten_nguoi_mua, nd.so_dien_thoai as sdt_nguoi_mua
            FROM don_hang dh JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            WHERE dh.gian_hang_id = ?`;
        const params = [shopId];
        if (trang_thai) { sql += ' AND dh.trang_thai = ?'; params.push(trang_thai); }
        else { sql += " AND dh.trang_thai = 'hoan_thanh'"; }
        if (from) { sql += ' AND dh.ngay_tao >= ?'; params.push(from); }
        if (to) { sql += ' AND dh.ngay_tao <= ?'; params.push(to + ' 23:59:59'); }
        sql += ' ORDER BY dh.ngay_tao DESC';
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('adminGetShopOrders error:', error);
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
        
        const timeRange = req.query.timeRange || 'year';
        let dateCondition = "ngay_tao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
        let groupFormat = "'%Y-%m'";
        
        if (timeRange === 'day') {
            dateCondition = "DATE(ngay_tao) = CURDATE()";
            groupFormat = "'%H:00'";
        } else if (timeRange === 'week') {
            dateCondition = "ngay_tao >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            groupFormat = "'%d/%m'";
        } else if (timeRange === 'month') {
            dateCondition = "MONTH(ngay_tao) = MONTH(CURDATE()) AND YEAR(ngay_tao) = YEAR(CURDATE())";
            groupFormat = "'%d/%m'";
        } else if (timeRange === 'year') {
            dateCondition = "YEAR(ngay_tao) = YEAR(CURDATE())";
            groupFormat = "'Tháng %m'";
        }

        const [revenue] = await pool.query(`SELECT SUM(tong_tien) as total FROM don_hang WHERE gian_hang_id = ? AND trang_thai = 'hoan_thanh' AND ${dateCondition}`, [shopId]);
        const [orders] = await pool.query(`SELECT COUNT(*) as total, trang_thai FROM don_hang WHERE gian_hang_id = ? AND ${dateCondition} GROUP BY trang_thai`, [shopId]);
        const [products] = await pool.query('SELECT COUNT(*) as total FROM san_pham WHERE gian_hang_id = ?', [shopId]);
        const [recentOrders] = await pool.query(
            `SELECT dh.*, nd.ho_ten FROM don_hang dh JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            WHERE dh.gian_hang_id = ? ORDER BY dh.ngay_tao DESC LIMIT 5`, [shopId]
        );
        const [monthlyRevenue] = await pool.query(
            `SELECT DATE_FORMAT(ngay_tao, ${groupFormat}) as thang, SUM(tong_tien) as doanh_thu, COUNT(*) as so_don
            FROM don_hang WHERE gian_hang_id = ? AND trang_thai = 'hoan_thanh' AND ${dateCondition}
            GROUP BY thang ORDER BY MIN(ngay_tao)`, [shopId]
        );

        res.json({
            success: true,
            data: { revenue: revenue[0].total || 0, orders, products: products[0].total, recentOrders, monthlyRevenue }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Seller: lấy doanh thu theo khoảng thời gian / nhóm (day|week|month)
const sellerGetRevenue = async (req, res) => {
    try {
        const { from, to, groupBy } = req.query;
        const monthsBack = 1; // fallback
        const gb = ['day','week','month','year'].includes((groupBy||'').toLowerCase()) ? groupBy.toLowerCase() : 'day';

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) return res.json({ success: false, message: 'Không tìm thấy gian hàng' });
        const shopId = shop[0].id;

        let dateCondition = '';
        const params = [shopId];
        if (from && to) {
            dateCondition = ' AND ngay_tao >= ? AND ngay_tao <= ?';
            params.push(from);
            params.push(to + ' 23:59:59');
        } else {
            dateCondition = ' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }

        let groupExpr = `DATE_FORMAT(ngay_tao, '%Y-%m-%d')`;
        let labelField = 'thoi_gian';
        if (gb === 'week') {
            groupExpr = `CONCAT(YEAR(ngay_tao), '-W', WEEK(ngay_tao,1))`;
        } else if (gb === 'month') {
            groupExpr = `DATE_FORMAT(ngay_tao, '%Y-%m')`;
        } else if (gb === 'year') {
            groupExpr = `DATE_FORMAT(ngay_tao, '%Y')`;
        }

        const sql = `SELECT ${groupExpr} as ${labelField},
            COALESCE(SUM(tong_tien),0) as doanh_thu,
            COALESCE(SUM(CASE WHEN phi_admin > 0 THEN phi_admin ELSE ROUND(tien_hang * 0.15) END),0) as phi_admin,
            COALESCE(SUM(CASE WHEN thue_vat > 0 THEN thue_vat ELSE ROUND(tien_hang * 0.08) END),0) as thue_vat,
            COUNT(*) as so_don
            FROM don_hang WHERE gian_hang_id = ? AND trang_thai = 'hoan_thanh' ${dateCondition}
            GROUP BY ${groupExpr} ORDER BY ${groupExpr}`;

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('sellerGetRevenue error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy chi tiết một đơn hàng (admin)
const adminGetOrderById = async (req, res) => {
    try {
        const orderId = req.params.id;
        const [orders] = await pool.query(
            `SELECT dh.*, nd.ho_ten as ten_nguoi_mua, nd.email as email_nguoi_mua, nd.so_dien_thoai as sdt_nguoi_mua, gh.ten_gian_hang
            FROM don_hang dh
            JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            WHERE dh.id = ?`, [orderId]
        );

        if (!orders || orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const [items] = await pool.query(
            `SELECT ct.*, sp.ten_san_pham, sp.hinh_anh FROM chi_tiet_don_hang ct
             JOIN san_pham sp ON ct.san_pham_id = sp.id
             WHERE ct.don_hang_id = ?`, [orderId]
        );

        res.json({ success: true, data: { order: orders[0], items } });
    } catch (error) {
        console.error('adminGetOrderById error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Helper: kiểm tra cột tùy chọn có tồn tại trong don_hang không (cache trong process)
let _donHangCols = null;
async function getDonHangCols() {
    if (_donHangCols) return _donHangCols;
    const [rows] = await pool.query("SHOW COLUMNS FROM don_hang");
    _donHangCols = new Set(rows.map(r => r.Field));
    return _donHangCols;
}

// Admin: lấy doanh thu toàn sàn theo khoảng thời gian + nhóm (day|week|month|year)
const adminGetRevenue = async (req, res) => {
    try {
        const { from, to, groupBy } = req.query;
        const gb = ['day','week','month','year'].includes((groupBy||'').toLowerCase()) ? groupBy.toLowerCase() : 'day';

        const cols = await getDonHangCols();
        const phiAdminExpr = cols.has('phi_admin') ? 'COALESCE(SUM(phi_admin),0)' : '0';
        const thueVatExpr = cols.has('thue_vat') ? 'COALESCE(SUM(thue_vat),0)' : '0';

        let dateCondition = '';
        const params = [];
        if (from && to) {
            dateCondition = ' AND ngay_tao >= ? AND ngay_tao <= ?';
            params.push(from);
            params.push(to + ' 23:59:59');
        } else {
            dateCondition = ' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }

        let groupExpr = `DATE_FORMAT(ngay_tao, '%Y-%m-%d')`;
        if (gb === 'week') groupExpr = `CONCAT(YEAR(ngay_tao), '-W', LPAD(WEEK(ngay_tao,1),2,'0'))`;
        else if (gb === 'month') groupExpr = `DATE_FORMAT(ngay_tao, '%Y-%m')`;
        else if (gb === 'year') groupExpr = `DATE_FORMAT(ngay_tao, '%Y')`;

        // Series theo nhóm thời gian
        const seriesSql = `SELECT ${groupExpr} as thoi_gian,
                COALESCE(SUM(tong_tien),0) as doanh_thu,
                ${thueVatExpr} as thue_vat,
                ${phiAdminExpr} as phi_admin,
                COUNT(*) as so_don,
                COUNT(DISTINCT gian_hang_id) as so_gian_hang
            FROM don_hang WHERE trang_thai = 'hoan_thanh' ${dateCondition}
            GROUP BY ${groupExpr} ORDER BY ${groupExpr}`;
        const [series] = await pool.query(seriesSql, params);

        // Tổng hợp toàn khoảng
        const totalsSql = `SELECT
                COALESCE(SUM(tong_tien),0) as tong_doanh_thu,
                ${thueVatExpr} as tong_thue_vat,
                ${phiAdminExpr} as tong_phi_admin,
                COUNT(*) as tong_so_don,
                COUNT(DISTINCT gian_hang_id) as tong_gian_hang,
                COUNT(DISTINCT nguoi_mua_id) as tong_nguoi_mua
            FROM don_hang WHERE trang_thai = 'hoan_thanh' ${dateCondition}`;
        const [totals] = await pool.query(totalsSql, params);

        // Breakdown đầy đủ theo từng gian hàng (doanh thu + VAT + hoa hồng)
        const dhPhiAdmin = cols.has('phi_admin') ? 'COALESCE(SUM(dh.phi_admin),0)' : '0';
        const dhThueVat = cols.has('thue_vat') ? 'COALESCE(SUM(dh.thue_vat),0)' : '0';
        const shopBreakdownSql = `SELECT gh.id, gh.ten_gian_hang, gh.logo,
                COALESCE(SUM(dh.tong_tien),0) as doanh_thu,
                ${dhThueVat} as thue_vat,
                ${dhPhiAdmin} as phi_admin,
                COUNT(dh.id) as so_don,
                COUNT(DISTINCT dh.nguoi_mua_id) as so_khach
            FROM don_hang dh JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            WHERE dh.trang_thai = 'hoan_thanh' ${dateCondition.replace(/\bngay_tao\b/g, 'dh.ngay_tao')}
            GROUP BY gh.id, gh.ten_gian_hang, gh.logo
            ORDER BY doanh_thu DESC`;
        const [shopBreakdown] = await pool.query(shopBreakdownSql, params);
        const topShops = (shopBreakdown || []).slice(0, 10);

        const fallback = { tong_doanh_thu:0, tong_thue_vat:0, tong_phi_admin:0, tong_so_don:0, tong_gian_hang:0, tong_nguoi_mua:0 };
        res.json({
            success: true,
            data: {
                series: series || [],
                totals: totals[0] || fallback,
                topShops,
                shopBreakdown: shopBreakdown || [],
                groupBy: gb,
                hasPhiAdmin: cols.has('phi_admin'),
                hasThueVat: cols.has('thue_vat')
            }
        });
    } catch (error) {
        console.error('adminGetRevenue error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};

// Admin: lấy chi tiết đơn hàng trong một khoảng thời gian (cho dropdown chi tiết)
const adminGetRevenueOrders = async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ success: false, message: 'Thiếu khoảng thời gian' });

        const cols = await getDonHangCols();
        const phiAdminCol = cols.has('phi_admin') ? 'dh.phi_admin' : '0 as phi_admin';
        const thueVatCol = cols.has('thue_vat') ? 'dh.thue_vat' : '0 as thue_vat';
        const phiAdminSum = cols.has('phi_admin') ? 'COALESCE(SUM(dh.phi_admin),0)' : '0';
        const thueVatSum = cols.has('thue_vat') ? 'COALESCE(SUM(dh.thue_vat),0)' : '0';

        // Per-shop summary cho khoảng thời gian
        const [shopSummary] = await pool.query(
            `SELECT gh.id, gh.ten_gian_hang,
                COALESCE(SUM(dh.tong_tien),0) as doanh_thu,
                ${thueVatSum} as thue_vat,
                ${phiAdminSum} as phi_admin,
                COUNT(dh.id) as so_don
            FROM don_hang dh JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            WHERE dh.trang_thai = 'hoan_thanh'
              AND dh.ngay_tao >= ? AND dh.ngay_tao <= ?
            GROUP BY gh.id, gh.ten_gian_hang
            ORDER BY doanh_thu DESC`,
            [from, to + ' 23:59:59']
        );

        // Danh sách đơn chi tiết
        const [rows] = await pool.query(
            `SELECT dh.id, dh.tong_tien, ${thueVatCol}, ${phiAdminCol}, dh.ngay_tao, dh.trang_thai,
                    dh.phuong_thuc_thanh_toan, dh.ma_giao_dich,
                    nd.ho_ten as ten_nguoi_mua, gh.ten_gian_hang, gh.id as gian_hang_id
            FROM don_hang dh
            JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            WHERE dh.trang_thai = 'hoan_thanh'
              AND dh.ngay_tao >= ? AND dh.ngay_tao <= ?
            ORDER BY dh.ngay_tao DESC`,
            [from, to + ' 23:59:59']
        );
        res.json({ success: true, data: rows, shopSummary });
    } catch (error) {
        console.error('adminGetRevenueOrders error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};

// Lấy dữ liệu huấn luyện kiểm duyệt
const getTrainingData = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM huan_luyen_mau ORDER BY ngay_tao DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getTrainingData error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Thêm dữ liệu huấn luyện
const addTrainingSample = async (req, res) => {
    try {
        const { text, label } = req.body;
        if (!text || !['approved', 'rejected'].includes(label)) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }
        await pool.query('INSERT INTO huan_luyen_mau (text, label) VALUES (?, ?)', [text, label]);
        res.json({ success: true, message: 'Thêm dữ liệu huấn luyện thành công' });
    } catch (error) {
        console.error('addTrainingSample error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa dữ liệu huấn luyện
const deleteTrainingSample = async (req, res) => {
    try {
        const sampleId = req.params.id;
        await pool.query('DELETE FROM huan_luyen_mau WHERE id = ?', [sampleId]);
        res.json({ success: true, message: 'Xóa dữ liệu huấn luyện thành công' });
    } catch (error) {
        console.error('deleteTrainingSample error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Huấn luyện mô hình tự kiểm duyệt
const trainModerationModel = async (req, res) => {
    try {
        const modelData = await moderationModel.trainModel();
        if (modelData) {
            res.json({ success: true, message: 'Huấn luyện mô hình hoàn thành!', data: modelData });
        } else {
            res.status(400).json({ success: false, message: 'Không thể huấn luyện mô hình (không có dữ liệu)' });
        }
    } catch (error) {
        console.error('trainModerationModel error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi huấn luyện mô hình: ' + error.message });
    }
};

// Kiểm thử dự đoán văn bản kiểm duyệt
const testModeration = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp văn bản cần kiểm tra' });
        }
        const prediction = moderationModel.predictClass(text);
        res.json({ success: true, data: prediction });
    } catch (error) {
        console.error('testModeration error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const adminGetVouchers = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM khuyen_mai WHERE gian_hang_id IS NULL ORDER BY ngay_tao DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('adminGetVouchers error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const adminCreateVoucher = async (req, res) => {
    try {
        const { ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, so_luong, don_toi_thieu } = req.body;
        const [result] = await pool.query(
            'INSERT INTO khuyen_mai (gian_hang_id, ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, so_luong, don_toi_thieu) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)',
            [ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, so_luong !== undefined && so_luong !== '' && !isNaN(so_luong) ? so_luong : 100, don_toi_thieu !== undefined && don_toi_thieu !== '' && !isNaN(don_toi_thieu) ? don_toi_thieu : 0]
        );
        res.status(201).json({ success: true, message: 'Tạo Global Voucher thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('adminCreateVoucher error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const adminDeleteVoucher = async (req, res) => {
    try {
        await pool.query('DELETE FROM khuyen_mai WHERE id = ? AND gian_hang_id IS NULL', [req.params.id]);
        res.json({ success: true, message: 'Xóa Global Voucher thành công' });
    } catch (error) {
        console.error('adminDeleteVoucher error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const adminUpdateVoucher = async (req, res) => {
    try {
        const { ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, so_luong, don_toi_thieu } = req.body;
        await pool.query(
            'UPDATE khuyen_mai SET ten_khuyen_mai = ?, mo_ta = ?, loai = ?, gia_tri = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?, so_luong = ?, don_toi_thieu = ? WHERE id = ? AND gian_hang_id IS NULL',
            [ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, so_luong !== undefined && so_luong !== '' && !isNaN(so_luong) ? so_luong : 100, don_toi_thieu !== undefined && don_toi_thieu !== '' && !isNaN(don_toi_thieu) ? don_toi_thieu : 0, req.params.id]
        );
        res.json({ success: true, message: 'Cập nhật Global Voucher thành công' });
    } catch (error) {
        console.error('adminUpdateVoucher error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getDashboard, getAllUsers, toggleUserStatus, adminUpdateUser, adminDeleteUser,
    adminGetProducts, adminUpdateProduct,
    adminGetOrders, adminGetOrderById, adminGetShops, adminUpdateShop,
    adminGetShopRevenue, adminGetShopOrders,
    adminGetRevenue, adminGetRevenueOrders,
    getSellerDashboard,
    sellerGetRevenue,
    getPendingSellers, verifySellerAccount,
    getPendingProducts, approveProduct,
    getTrainingData, addTrainingSample, deleteTrainingSample,
    trainModerationModel, testModeration,
    adminGetVouchers, adminCreateVoucher, adminDeleteVoucher, adminUpdateVoucher
};
