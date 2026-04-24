const pool = require('../config/database');

// Lấy giỏ hàng
const getCart = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT gh.*, sp.ten_san_pham, sp.gia, sp.gia_khuyen_mai, sp.hinh_anh, sp.so_luong_ton,
            g.ten_gian_hang, g.id as gian_hang_id
            FROM gio_hang gh 
            JOIN san_pham sp ON gh.san_pham_id = sp.id 
            JOIN gian_hang g ON sp.gian_hang_id = g.id
            WHERE gh.nguoi_mua_id = ? AND sp.trang_thai = 'active'
            ORDER BY g.ten_gian_hang, gh.ngay_tao DESC`,
            [req.user.id]
        );

        // Group by shop
        const grouped = {};
        rows.forEach(item => {
            if (!grouped[item.gian_hang_id]) {
                grouped[item.gian_hang_id] = {
                    gian_hang_id: item.gian_hang_id,
                    ten_gian_hang: item.ten_gian_hang,
                    items: []
                };
            }
            grouped[item.gian_hang_id].items.push(item);
        });

        res.json({ success: true, data: Object.values(grouped) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Thêm vào giỏ hàng
const addToCart = async (req, res) => {
    try {
        const { san_pham_id, so_luong = 1 } = req.body;

        // Check product exists
        const [product] = await pool.query('SELECT * FROM san_pham WHERE id = ? AND trang_thai = ?', [san_pham_id, 'active']);
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        if (product[0].so_luong_ton < so_luong) {
            return res.status(400).json({ success: false, message: 'Sản phẩm không đủ số lượng' });
        }

        // Check if already in cart
        const [existing] = await pool.query(
            'SELECT * FROM gio_hang WHERE nguoi_mua_id = ? AND san_pham_id = ?',
            [req.user.id, san_pham_id]
        );

        if (existing.length > 0) {
            const newQty = existing[0].so_luong + parseInt(so_luong);
            await pool.query('UPDATE gio_hang SET so_luong = ? WHERE id = ?', [newQty, existing[0].id]);
        } else {
            await pool.query(
                'INSERT INTO gio_hang (nguoi_mua_id, san_pham_id, so_luong) VALUES (?, ?, ?)',
                [req.user.id, san_pham_id, so_luong]
            );
        }

        res.json({ success: true, message: 'Đã thêm vào giỏ hàng' });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Cập nhật số lượng
const updateCartItem = async (req, res) => {
    try {
        const { so_luong } = req.body;
        if (so_luong < 1) {
            return res.status(400).json({ success: false, message: 'Số lượng phải lớn hơn 0' });
        }

        const [result] = await pool.query(
            'UPDATE gio_hang SET so_luong = ? WHERE id = ? AND nguoi_mua_id = ?',
            [so_luong, req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
        }

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa khỏi giỏ hàng
const removeCartItem = async (req, res) => {
    try {
        await pool.query('DELETE FROM gio_hang WHERE id = ? AND nguoi_mua_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Đã xóa khỏi giỏ hàng' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa toàn bộ giỏ hàng
const clearCart = async (req, res) => {
    try {
        await pool.query('DELETE FROM gio_hang WHERE nguoi_mua_id = ?', [req.user.id]);
        res.json({ success: true, message: 'Đã xóa giỏ hàng' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đếm số lượng giỏ hàng
const getCartCount = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT SUM(so_luong) as total FROM gio_hang WHERE nguoi_mua_id = ?', [req.user.id]);
        res.json({ success: true, data: { count: rows[0].total || 0 } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart, getCartCount };
