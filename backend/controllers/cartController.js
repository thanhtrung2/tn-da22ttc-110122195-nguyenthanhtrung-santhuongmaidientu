const pool = require('../config/database');

const getCart = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT gh.*, sp.ten_san_pham, sp.gia, sp.gia_khuyen_mai, sp.hinh_anh, sp.so_luong_ton,
            bt.id as bien_the_id, bt.mau_sac, bt.ma_mau, bt.kich_thuoc, bt.gia_them, bt.so_luong_ton as variant_stock,
            g.ten_gian_hang, g.id as gian_hang_id
            FROM gio_hang gh
            JOIN san_pham sp ON gh.san_pham_id = sp.id
            LEFT JOIN san_pham_bien_the bt ON gh.bien_the_id = bt.id
            JOIN gian_hang g ON sp.gian_hang_id = g.id
            WHERE gh.nguoi_mua_id = ? AND sp.trang_thai = 'active'
            ORDER BY g.ten_gian_hang, gh.ngay_tao DESC`,
            [req.user.id]
        );

        const grouped = {};
        rows.forEach(item => {
            if (!grouped[item.gian_hang_id]) {
                grouped[item.gian_hang_id] = {
                    gian_hang_id: item.gian_hang_id,
                    ten_gian_hang: item.ten_gian_hang,
                    items: []
                };
            }
            const finalPrice = parseFloat(item.gia) + parseFloat(item.gia_them || 0);
            const finalSalePrice = item.gia_khuyen_mai ? parseFloat(item.gia_khuyen_mai) + parseFloat(item.gia_them || 0) : null;
            const ma = item.mau_sac || '';
            const kc = item.kich_thuoc && item.kich_thuoc !== 'Mặc định' ? item.kich_thuoc : '';
            const ten_bien_the = (ma || kc) ? `${ma}${ma && kc ? ' / ' : ''}${kc}`.trim() : null;
            grouped[item.gian_hang_id].items.push({
                ...item,
                gia_hien_thi: finalPrice,
                gia_khuyen_mai_hien_thi: finalSalePrice,
                ten_bien_the
            });
        });

        res.json({ success: true, data: Object.values(grouped) });
    } catch (error) {
        console.error('getCart error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const addToCart = async (req, res) => {
    try {
        const { san_pham_id, so_luong = 1, bien_the_id } = req.body;

        const [product] = await pool.query('SELECT * FROM san_pham WHERE id = ? AND trang_thai = ?', [san_pham_id, 'active']);
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        let availableStock = product[0].so_luong_ton;
        if (bien_the_id) {
            const [variant] = await pool.query('SELECT * FROM san_pham_bien_the WHERE id = ? AND san_pham_id = ?', [bien_the_id, san_pham_id]);
            if (variant.length === 0) {
                return res.status(404).json({ success: false, message: 'Biến thể không tồn tại' });
            }
            availableStock = variant[0].so_luong_ton;
        }

        if (availableStock < so_luong) {
            return res.status(400).json({ success: false, message: 'Sản phẩm không đủ số lượng' });
        }

        const [existing] = await pool.query(
            'SELECT * FROM gio_hang WHERE nguoi_mua_id = ? AND san_pham_id = ? AND (bien_the_id = ? OR (bien_the_id IS NULL AND ? IS NULL))',
            [req.user.id, san_pham_id, bien_the_id || null, bien_the_id || null]
        );

        if (existing.length > 0) {
            const newQty = existing[0].so_luong + parseInt(so_luong);
            await pool.query('UPDATE gio_hang SET so_luong = ? WHERE id = ?', [newQty, existing[0].id]);
        } else {
            await pool.query(
                'INSERT INTO gio_hang (nguoi_mua_id, san_pham_id, bien_the_id, so_luong) VALUES (?, ?, ?, ?)',
                [req.user.id, san_pham_id, bien_the_id || null, so_luong]
            );
        }

        res.json({ success: true, message: 'Đã thêm vào giỏ hàng' });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

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

const removeCartItem = async (req, res) => {
    try {
        await pool.query('DELETE FROM gio_hang WHERE id = ? AND nguoi_mua_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Đã xóa khỏi giỏ hàng' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const clearCart = async (req, res) => {
    try {
        await pool.query('DELETE FROM gio_hang WHERE nguoi_mua_id = ?', [req.user.id]);
        res.json({ success: true, message: 'Đã xóa giỏ hàng' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getCartCount = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT SUM(so_luong) as total FROM gio_hang WHERE nguoi_mua_id = ?', [req.user.id]);
        res.json({ success: true, data: { count: rows[0].total || 0 } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart, getCartCount };
