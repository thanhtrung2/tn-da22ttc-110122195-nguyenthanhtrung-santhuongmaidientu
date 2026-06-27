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
        const { ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, danh_muc_id, thuoc_tinh, variants } = req.body;
        let hinh_anh = getImageUrl(req.files && req.files['hinh_anh'] ? req.files['hinh_anh'][0] : req.file);
        let video_url = getImageUrl(req.files && req.files['video'] ? req.files['video'][0] : null);

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.status(400).json({ success: false, message: 'Bạn chưa có gian hàng' });
        }

        // Kiểm tra người bán đã được xác thực chưa
        const [seller] = await pool.query('SELECT trang_thai_xac_thuc FROM nguoi_dung WHERE id = ?', [req.user.id]);
        if (seller[0].trang_thai_xac_thuc !== 'verified') {
            return res.status(403).json({ 
                success: false, 
                message: 'Tài khoản của bạn chưa được xác thực. Vui lòng chờ Admin phê duyệt để có thể đăng sản phẩm.' 
            });
        }

        let hinh_anh_phu = [];
        if (req.files && req.files['additional_images']) {
            hinh_anh_phu = req.files['additional_images'].map(f => getImageUrl(f));
        }
        let hinh_anh_phu_json = hinh_anh_phu.length > 0 ? JSON.stringify(hinh_anh_phu) : null;

        // Tạo sản phẩm với trạng thái chờ duyệt
        const [result] = await pool.query(
            'INSERT INTO san_pham (gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, hinh_anh_phu, video_url, thuoc_tinh, trang_thai_duyet) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [shop[0].id, danh_muc_id || null, ten_san_pham, mo_ta, gia, gia_khuyen_mai || null, so_luong_ton || 0, hinh_anh, hinh_anh_phu_json, video_url, thuoc_tinh || null, 'pending']
        );

        const productId = result.insertId;

        if (variants) {
            let parsedVariants = [];
            try { parsedVariants = JSON.parse(variants); } catch(e) {}
            if (parsedVariants.length > 0) {
                for (const v of parsedVariants) {
                    let variantImage = null;
                    if (v.image_id === 'main') {
                        variantImage = hinh_anh;
                    } else if (typeof v.image_id === 'string' && v.image_id.startsWith('add_')) {
                        const idx = parseInt(v.image_id.split('_')[1]);
                        if (!isNaN(idx) && hinh_anh_phu[idx]) variantImage = hinh_anh_phu[idx];
                    }

                    await pool.query(
                        'INSERT INTO san_pham_bien_the (san_pham_id, mau_sac, ma_mau, kich_thuoc, so_luong_ton, gia_them, hinh_anh) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [productId, v.mau_sac || null, v.ma_mau || null, v.kich_thuoc || null, v.so_luong_ton || 0, v.gia_them || 0, variantImage]
                    );
                }
            }
        }

        res.status(201).json({ 
            success: true, 
            message: 'Thêm sản phẩm thành công! Sản phẩm đang chờ Admin duyệt.', 
            data: { id: productId } 
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Cập nhật sản phẩm
const updateProduct = async (req, res) => {
    try {
        const { ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, danh_muc_id, trang_thai, thuoc_tinh, variants } = req.body;
        const productId = req.params.id;

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        const [product] = await pool.query('SELECT * FROM san_pham WHERE id = ? AND gian_hang_id = ?', [productId, shop[0]?.id]);

        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        let keep_existing_images = [];
        if (req.body.keep_existing_images) {
            try { keep_existing_images = JSON.parse(req.body.keep_existing_images); } catch(e){}
        }

        let hinh_anh = null;
        let hinh_anh_phu = [];
        if (keep_existing_images.length > 0) {
            // First existing is main, rest are phu
            hinh_anh = keep_existing_images[0] ? keep_existing_images[0].replace(req.protocol + '://' + req.get('host'), '') : null;
            hinh_anh_phu = keep_existing_images.slice(1).map(u => u.replace(req.protocol + '://' + req.get('host'), ''));
        } else {
            // No existing images kept, main image must come from new upload
            const newImage = getImageUrl(req.files && req.files['hinh_anh'] ? req.files['hinh_anh'][0] : req.file);
            hinh_anh = newImage;
        }

        // Additional images from new upload
        if (req.files && req.files['additional_images']) {
            const newAdditional = req.files['additional_images'].map(f => getImageUrl(f));
            hinh_anh_phu = hinh_anh_phu.concat(newAdditional);
        }
        
        let hinh_anh_phu_json = hinh_anh_phu.length > 0 ? JSON.stringify(hinh_anh_phu) : null;

        let video_url = product[0].video_url;
        const newVideo = getImageUrl(req.files && req.files['video'] ? req.files['video'][0] : null);
        if (newVideo) {
            video_url = newVideo;
        } else if (req.body.remove_video === 'true') {
            video_url = null;
        }

        await pool.query(
            'UPDATE san_pham SET ten_san_pham = ?, mo_ta = ?, gia = ?, gia_khuyen_mai = ?, so_luong_ton = ?, danh_muc_id = ?, hinh_anh = ?, hinh_anh_phu = ?, video_url = ?, thuoc_tinh = ?, trang_thai = ? WHERE id = ?',
            [
                ten_san_pham || product[0].ten_san_pham,
                mo_ta || product[0].mo_ta,
                gia || product[0].gia,
                gia_khuyen_mai !== undefined ? gia_khuyen_mai : product[0].gia_khuyen_mai,
                so_luong_ton !== undefined ? so_luong_ton : product[0].so_luong_ton,
                danh_muc_id || product[0].danh_muc_id,
                hinh_anh,
                hinh_anh_phu_json,
                video_url,
                thuoc_tinh !== undefined ? thuoc_tinh : product[0].thuoc_tinh,
                trang_thai || product[0].trang_thai,
                productId
            ]
        );

        if (variants) {
            let parsedVariants = [];
            try { parsedVariants = JSON.parse(variants); } catch(e) {}
            await pool.query('DELETE FROM san_pham_bien_the WHERE san_pham_id = ?', [productId]);
            if (parsedVariants.length > 0) {
                for (const v of parsedVariants) {
                    let variantImage = null;
                    if (v.image_id === 'main') {
                        variantImage = hinh_anh;
                    } else if (v.image_id === 'existing_main') {
                        variantImage = hinh_anh; // The main is now the first kept
                    } else if (typeof v.image_id === 'string' && v.image_id.startsWith('add_')) {
                        const idx = parseInt(v.image_id.split('_')[1]);
                        // The index here is based on NEW uploaded additional_images.
                        // Wait, in frontend: mappedImageId = 'add_' + imgIndex; 
                        // The index is the position in `req.files['additional_images']`
                        const uploadedAddImgs = req.files && req.files['additional_images'] ? req.files['additional_images'].map(f=>getImageUrl(f)) : [];
                        if (!isNaN(idx) && uploadedAddImgs[idx]) variantImage = uploadedAddImgs[idx];
                    } else if (typeof v.image_id === 'string' && v.image_id.startsWith('existing_add_')) {
                        const idx = parseInt(v.image_id.split('_')[2]);
                        const existingPhu = keep_existing_images.slice(1).map(u => u.replace(req.protocol + '://' + req.get('host'), ''));
                        if (!isNaN(idx) && existingPhu[idx]) variantImage = existingPhu[idx];
                    }

                    await pool.query(
                        'INSERT INTO san_pham_bien_the (san_pham_id, mau_sac, ma_mau, kich_thuoc, so_luong_ton, gia_them, hinh_anh) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [productId, v.mau_sac || null, v.ma_mau || null, v.kich_thuoc || null, v.so_luong_ton || 0, v.gia_them || 0, variantImage]
                    );
                }
            }
        }

        res.json({ success: true, message: 'Cập nhật sản phẩm thành công' });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa sản phẩm (soft delete - đặt trang_thai = 'deleted' để tránh lỗi FK từ chi_tiet_don_hang)
const deleteProduct = async (req, res) => {
    try {
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (!shop.length) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy gian hàng' });
        }

        // Kiểm tra sản phẩm thuộc gian hàng này
        const [product] = await pool.query(
            'SELECT id FROM san_pham WHERE id = ? AND gian_hang_id = ?',
            [req.params.id, shop[0].id]
        );
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại hoặc bạn không có quyền xóa' });
        }

        // Kiểm tra sản phẩm có trong đơn hàng đang xử lý không
        const [activeOrders] = await pool.query(
            `SELECT ct.id FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.don_hang_id = dh.id
             WHERE ct.san_pham_id = ?
               AND dh.trang_thai NOT IN ('hoan_thanh', 'da_huy')
             LIMIT 1`,
            [req.params.id]
        );
        if (activeOrders.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa sản phẩm đang có trong đơn hàng chưa hoàn thành. Vui lòng ẩn sản phẩm thay vì xóa.'
            });
        }

        // Thử xóa cứng trước (sản phẩm chưa có trong đơn hàng nào)
        try {
            await pool.query('DELETE FROM san_pham_bien_the WHERE san_pham_id = ?', [req.params.id]);
            await pool.query('DELETE FROM san_pham WHERE id = ? AND gian_hang_id = ?', [req.params.id, shop[0].id]);
        } catch (fkError) {
            // Nếu bị lỗi FK (sản phẩm có trong chi_tiet_don_hang cũ), dùng soft delete
            await pool.query(
                'UPDATE san_pham SET trang_thai = ? WHERE id = ? AND gian_hang_id = ?',
                ['deleted', req.params.id, shop[0].id]
            );
        }

        res.json({ success: true, message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};

// Mock moderation endpoint for frontend
const moderateImageUpload = async (req, res) => {
    // Luôn trả về an toàn vì đã tắt YOLO
    res.json({ success: true, isSafe: true });
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
            WHERE sp.gian_hang_id = ? AND sp.trang_thai != 'deleted' ORDER BY sp.ngay_tao DESC`,
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
        let baseSql = `FROM san_pham sp 
            JOIN gian_hang gh ON sp.gian_hang_id = gh.id 
            LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
            WHERE sp.trang_thai = 'active' AND sp.trang_thai_duyet = 'approved' AND gh.trang_thai = 'active'`;
        
        const params = [];

        if (search) {
            baseSql += ' AND (sp.ten_san_pham LIKE ? OR sp.mo_ta LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (danh_muc_id) {
            baseSql += ' AND sp.danh_muc_id = ?';
            params.push(danh_muc_id);
        }
        if (min_gia) {
            baseSql += ' AND sp.gia >= ?';
            params.push(min_gia);
        }
        if (max_gia) {
            baseSql += ' AND sp.gia <= ?';
            params.push(max_gia);
        }

        // Count total
        const countSql = `SELECT COUNT(*) as total ${baseSql}`;
        const [countResult] = await pool.query(countSql, params);
        const total = countResult[0].total;

        let sql = `SELECT sp.*, gh.ten_gian_hang, dm.ten_danh_muc,
            (SELECT AVG(so_sao) FROM danh_gia WHERE san_pham_id = sp.id) as diem_trung_binh,
            (SELECT COUNT(*) FROM danh_gia WHERE san_pham_id = sp.id) as so_danh_gia
            ${baseSql}`;

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

        // Get variants
        const [variants] = await pool.query(
            'SELECT * FROM san_pham_bien_the WHERE san_pham_id = ? AND trang_thai = "active"',
            [req.params.id]
        );

        // Group variants for frontend (by mau_sac)
        let variants_grouped = [];
        if (variants.length > 0) {
            const groups = {};
            variants.forEach(v => {
                const color = v.mau_sac || 'Mặc định';
                if (!groups[color]) {
                    groups[color] = {
                        mau_sac: color,
                        ma_mau: v.ma_mau || '#cccccc',
                        hinh_anh: v.hinh_anh || null,
                        tong_ton: 0,
                        kich_thuoc: []
                    };
                }
                groups[color].tong_ton += v.so_luong_ton;
                groups[color].kich_thuoc.push({
                    id: v.id,
                    ten: v.kich_thuoc || 'Mặc định',
                    so_luong_ton: v.so_luong_ton,
                    gia_them: v.gia_them
                });
            });
            variants_grouped = Object.values(groups);
        }

        res.json({ success: true, data: { ...rows[0], reviews, variants, variants_grouped } });
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

// Lấy sản phẩm theo gian hàng (public)
const getProductsByShop = async (req, res) => {
    try {
        const { gian_hang_id } = req.params;
        const { danh_muc_id, sort, page = 1, limit = 12 } = req.query;
        
        let sql = `SELECT sp.*, gh.ten_gian_hang, dm.ten_danh_muc,
            (SELECT AVG(so_sao) FROM danh_gia WHERE san_pham_id = sp.id) as diem_trung_binh,
            (SELECT COUNT(*) FROM danh_gia WHERE san_pham_id = sp.id) as so_danh_gia
            FROM san_pham sp 
            JOIN gian_hang gh ON sp.gian_hang_id = gh.id 
            LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id
            WHERE sp.gian_hang_id = ? AND sp.trang_thai = 'active' AND sp.trang_thai_duyet = 'approved'`;
        const params = [gian_hang_id];

        if (danh_muc_id) {
            sql += ' AND sp.danh_muc_id = ?';
            params.push(danh_muc_id);
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
        console.error('Get shop products error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getSearchSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json({ success: true, data: { categories: [], products: [], tags: [] } });
        }

        const searchTerm = `%${q}%`;

        const [categories] = await pool.query(
            'SELECT id, ten_danh_muc FROM danh_muc WHERE ten_danh_muc LIKE ? LIMIT 3',
            [searchTerm]
        );

        const [products] = await pool.query(
            `SELECT sp.id, sp.ten_san_pham, sp.hinh_anh, sp.gia, sp.gia_khuyen_mai, gh.ten_gian_hang 
             FROM san_pham sp
             JOIN gian_hang gh ON sp.gian_hang_id = gh.id
             WHERE sp.ten_san_pham LIKE ? 
               AND sp.trang_thai = 'active' 
               AND sp.trang_thai_duyet = 'approved' 
               AND gh.trang_thai = 'active' 
             LIMIT 5`,
            [searchTerm]
        );

        const tags = [];
        if (products.length > 0) {
            const firstWord = products[0].ten_san_pham.split(' ')[0];
            if (firstWord && firstWord.length > 2) {
                tags.push(firstWord);
            }
        }

        res.json({
            success: true,
            data: {
                categories,
                products,
                tags
            }
        });
    } catch (error) {
        console.error('Search suggest error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { createProduct, updateProduct, deleteProduct, getMyProducts, getAllProducts, getProductById, getCategories, getProductsByShop, getSearchSuggestions, moderateImageUpload };
