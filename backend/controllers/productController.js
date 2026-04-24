const pool = require('../config/database');
const path = require('path');

// Helper: lấy URL ảnh từ file upload
function getImageUrl(file) {
    if (!file) return null;
    // Cloudinary trả về đường dẫn HTTPS
    if (file.path && file.path.startsWith('http')) return file.path;
    // Local storage: chuyển thành URL tương đối
    if (file.path) {
        const relative = file.path.split('uploads').pop();
        return '/uploads' + relative.replace(/\\/g, '/');
    }
    return file.filename || null;
}

// Tạo sản phẩm
const createProduct = async (req, res) => {
    try {
        const { ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, danh_muc_id } = req.body;
        let hinh_anh = getImageUrl(req.file);

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.status(400).json({ success: false, message: 'Bạn chưa có gian hàng' });
        }

        const [result] = await pool.query(
            'INSERT INTO san_pham (gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [shop[0].id, danh_muc_id || null, ten_san_pham, mo_ta, gia, gia_khuyen_mai || null, so_luong_ton || 0, hinh_anh]
        );

        res.status(201).json({ success: true, message: 'Thêm sản phẩm thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Cập nhật sản phẩm
const updateProduct = async (req, res) => {
    try {
        const { ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, danh_muc_id, trang_thai } = req.body;
        const productId = req.params.id;

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        const [product] = await pool.query('SELECT * FROM san_pham WHERE id = ? AND gian_hang_id = ?', [productId, shop[0]?.id]);

        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        let hinh_anh = product[0].hinh_anh;
        const newImage = getImageUrl(req.file);
        if (newImage) hinh_anh = newImage;

        await pool.query(
            'UPDATE san_pham SET ten_san_pham = ?, mo_ta = ?, gia = ?, gia_khuyen_mai = ?, so_luong_ton = ?, danh_muc_id = ?, hinh_anh = ?, trang_thai = ? WHERE id = ?',
            [
                ten_san_pham || product[0].ten_san_pham,
                mo_ta || product[0].mo_ta,
                gia || product[0].gia,
                gia_khuyen_mai !== undefined ? gia_khuyen_mai : product[0].gia_khuyen_mai,
                so_luong_ton !== undefined ? so_luong_ton : product[0].so_luong_ton,
                danh_muc_id || product[0].danh_muc_id,
                hinh_anh,
                trang_thai || product[0].trang_thai,
                productId
            ]
        );

        res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa sản phẩm
const deleteProduct = async (req, res) => {
    try {
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        const [result] = await pool.query('DELETE FROM san_pham WHERE id = ? AND gian_hang_id = ?', [req.params.id, shop[0]?.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        res.json({ success: true, message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy sản phẩm của gian hàng (seller)
const getMyProducts = async (req, res) => {
    try {
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const [rows] = await pool.query(
            `SELECT sp.*, dm.ten_danh_muc FROM san_pham sp 
            LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id 
            WHERE sp.gian_hang_id = ? ORDER BY sp.ngay_tao DESC`,
            [shop[0].id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy tất cả sản phẩm (public - với tìm kiếm, lọc, phân trang)
const getAllProducts = async (req, res) => {
    try {
        const { search, danh_muc_id, min_gia, max_gia, sort, page = 1, limit = 12 } = req.query;
        let sql = `SELECT sp.*, gh.ten_gian_hang, dm.ten_danh_muc,
            (SELECT AVG(so_sao) FROM danh_gia WHERE san_pham_id = sp.id) as diem_trung_binh,
            (SELECT COUNT(*) FROM danh_gia WHERE san_pham_id = sp.id) as so_danh_gia
            FROM san_pham sp 
            JOIN gian_hang gh ON sp.gian_hang_id = gh.id 
            LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
            WHERE sp.trang_thai = 'active' AND gh.trang_thai = 'active'`;
        const params = [];

        if (search) {
            sql += ' AND (sp.ten_san_pham LIKE ? OR sp.mo_ta LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (danh_muc_id) {
            sql += ' AND sp.danh_muc_id = ?';
            params.push(danh_muc_id);
        }
        if (min_gia) {
            sql += ' AND sp.gia >= ?';
            params.push(min_gia);
        }
        if (max_gia) {
            sql += ' AND sp.gia <= ?';
            params.push(max_gia);
        }

        // Count total
        const countSql = sql.replace(/SELECT .+? FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await pool.query(countSql, params);
        const total = countResult[0].total;

        // Sort
        switch (sort) {
            case 'price_asc': sql += ' ORDER BY sp.gia ASC'; break;
            case 'price_desc': sql += ' ORDER BY sp.gia DESC'; break;
            case 'newest': sql += ' ORDER BY sp.ngay_tao DESC'; break;
            case 'popular': sql += ' ORDER BY sp.luot_xem DESC'; break;
            case 'rating': sql += ' ORDER BY diem_trung_binh DESC'; break;
            default: sql += ' ORDER BY sp.ngay_tao DESC';
        }

        // Pagination
        const offset = (page - 1) * limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await pool.query(sql, params);

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Chi tiết sản phẩm (public)
const getProductById = async (req, res) => {
    try {
        // Increment view count
        await pool.query('UPDATE san_pham SET luot_xem = luot_xem + 1 WHERE id = ?', [req.params.id]);

        const [rows] = await pool.query(
            `SELECT sp.*, gh.ten_gian_hang, gh.id as shop_id, gh.logo as shop_logo, gh.nguoi_ban_id,
            dm.ten_danh_muc,
            (SELECT AVG(so_sao) FROM danh_gia WHERE san_pham_id = sp.id) as diem_trung_binh,
            (SELECT COUNT(*) FROM danh_gia WHERE san_pham_id = sp.id) as so_danh_gia
            FROM san_pham sp 
            JOIN gian_hang gh ON sp.gian_hang_id = gh.id
            LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
            WHERE sp.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        // Get reviews
        const [reviews] = await pool.query(
            `SELECT dg.*, nd.ho_ten, nd.avatar FROM danh_gia dg 
            JOIN nguoi_dung nd ON dg.nguoi_mua_id = nd.id 
            WHERE dg.san_pham_id = ? ORDER BY dg.ngay_tao DESC`,
            [req.params.id]
        );

        res.json({ success: true, data: { ...rows[0], reviews } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy danh mục
const getCategories = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM danh_muc ORDER BY ten_danh_muc');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { createProduct, updateProduct, deleteProduct, getMyProducts, getAllProducts, getProductById, getCategories };
