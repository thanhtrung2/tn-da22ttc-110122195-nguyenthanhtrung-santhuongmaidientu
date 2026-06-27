const pool = require('../config/database');

// Quản lý khuyến mãi
const createPromotion = async (req, res) => {
    try {
        const { ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, so_luong, don_toi_thieu } = req.body;

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.status(400).json({ success: false, message: 'Bạn chưa có gian hàng' });
        }

        const [result] = await pool.query(
            'INSERT INTO khuyen_mai (gian_hang_id, ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, so_luong, don_toi_thieu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [shop[0].id, ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, so_luong !== undefined && so_luong !== '' && !isNaN(so_luong) ? so_luong : 100, don_toi_thieu !== undefined && don_toi_thieu !== '' && !isNaN(don_toi_thieu) ? don_toi_thieu : 0]
        );

        res.status(201).json({ success: true, message: 'Tạo khuyến mãi thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create promotion error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getMyPromotions = async (req, res) => {
    try {
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) return res.json({ success: true, data: [] });

        const [rows] = await pool.query('SELECT * FROM khuyen_mai WHERE gian_hang_id = ? ORDER BY ngay_tao DESC', [shop[0].id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getShopPromotions = async (req, res) => {
    try {
        const { shopId } = req.params;
        const [rows] = await pool.query(
            `SELECT * FROM khuyen_mai 
             WHERE gian_hang_id = ? AND trang_thai = 'active'
             AND DATE(ngay_bat_dau) <= CURDATE() AND DATE(ngay_ket_thuc) >= CURDATE()
             AND da_dung < so_luong
             ORDER BY ngay_tao DESC`, 
             [shopId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const savePromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if voucher exists and active
        const [promos] = await pool.query(
            `SELECT * FROM khuyen_mai 
             WHERE id = ? AND trang_thai = 'active'
             AND CURDATE() >= ngay_bat_dau AND CURDATE() <= ngay_ket_thuc
             AND da_dung < so_luong`,
            [id]
        );

        if (promos.length === 0) {
            return res.status(400).json({ success: false, message: 'Mã khuyến mãi không tồn tại, đã hết hạn hoặc hết lượt' });
        }

        // Save to vi_voucher
        try {
            await pool.query(
                `INSERT INTO vi_voucher (nguoi_dung_id, khuyen_mai_id, trang_thai) VALUES (?, ?, 'chua_dung')`,
                [userId, id]
            );
            res.json({ success: true, message: 'Đã lưu mã giảm giá vào ví' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Bạn đã lưu mã này rồi' });
            }
            throw err;
        }
    } catch (error) {
        console.error('Save promotion error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getMyWalletPromotions = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(
            `SELECT vv.id as vi_id, vv.trang_thai as trang_thai_vi, km.*, gh.ten_gian_hang, gh.logo
             FROM vi_voucher vv
             JOIN khuyen_mai km ON vv.khuyen_mai_id = km.id
             LEFT JOIN gian_hang gh ON km.gian_hang_id = gh.id
             WHERE vv.nguoi_dung_id = ?
             ORDER BY vv.ngay_luu DESC`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getHomePromotions = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT km.*, gh.ten_gian_hang, gh.logo 
             FROM khuyen_mai km
             LEFT JOIN gian_hang gh ON km.gian_hang_id = gh.id
             WHERE km.trang_thai = 'active'
             AND km.gian_hang_id IS NULL
             AND DATE(km.ngay_bat_dau) <= CURDATE() AND DATE(km.ngay_ket_thuc) >= CURDATE()
             AND km.da_dung < km.so_luong
             ORDER BY km.ngay_tao DESC LIMIT 10`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getHomePromotions error', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updatePromotion = async (req, res) => {
    try {
        const { ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, trang_thai, so_luong, don_toi_thieu } = req.body;
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);

        await pool.query(
            'UPDATE khuyen_mai SET ten_khuyen_mai = ?, mo_ta = ?, loai = ?, gia_tri = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?, trang_thai = ?, so_luong = ?, don_toi_thieu = ? WHERE id = ? AND gian_hang_id = ?',
            [ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, trang_thai, so_luong !== undefined && so_luong !== '' && !isNaN(so_luong) ? so_luong : 100, don_toi_thieu !== undefined && don_toi_thieu !== '' && !isNaN(don_toi_thieu) ? don_toi_thieu : 0, req.params.id, shop[0].id]
        );

        res.json({ success: true, message: 'Cập nhật khuyến mãi thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const deletePromotion = async (req, res) => {
    try {
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        await pool.query('DELETE FROM khuyen_mai WHERE id = ? AND gian_hang_id = ?', [req.params.id, shop[0].id]);
        res.json({ success: true, message: 'Xóa khuyến mãi thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const checkPromotion = async (req, res) => {
    try {
        const { code, shop_ids, total_amount } = req.query;
        if (!code || !shop_ids) {
            return res.status(400).json({ success: false, message: 'Thiếu mã khuyến mãi hoặc thông tin giỏ hàng' });
        }

        const shopIdsArray = shop_ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (shopIdsArray.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }

        const [promotions] = await pool.query(
            `SELECT * FROM khuyen_mai 
             WHERE ten_khuyen_mai = ? AND trang_thai = 'active'
             AND CURDATE() >= DATE(ngay_bat_dau) AND CURDATE() <= DATE(ngay_ket_thuc)
             AND (gian_hang_id IN (?) OR gian_hang_id IS NULL)
             LIMIT 1`,
            [code, shopIdsArray]
        );

        if (promotions.length === 0) {
            return res.status(404).json({ success: false, message: 'Mã khuyến mãi không hợp lệ, đã hết hạn hoặc không áp dụng cho shop này' });
        }

        const promo = promotions[0];
        
        if (promo.da_dung >= promo.so_luong) {
            return res.status(400).json({ success: false, message: 'Mã khuyến mãi đã hết lượt sử dụng' });
        }

        res.json({ success: true, data: promo });
    } catch (error) {
        console.error('Check promotion error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { createPromotion, getMyPromotions, getShopPromotions, savePromotion, getMyWalletPromotions, getHomePromotions, updatePromotion, deletePromotion, checkPromotion };
