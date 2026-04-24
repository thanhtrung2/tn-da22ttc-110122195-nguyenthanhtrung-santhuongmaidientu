const pool = require('../config/database');

// Quản lý khuyến mãi
const createPromotion = async (req, res) => {
    try {
        const { ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc } = req.body;

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.status(400).json({ success: false, message: 'Bạn chưa có gian hàng' });
        }

        const [result] = await pool.query(
            'INSERT INTO khuyen_mai (gian_hang_id, ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [shop[0].id, ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc]
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

const updatePromotion = async (req, res) => {
    try {
        const { ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, trang_thai } = req.body;
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);

        await pool.query(
            'UPDATE khuyen_mai SET ten_khuyen_mai = ?, mo_ta = ?, loai = ?, gia_tri = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?, trang_thai = ? WHERE id = ? AND gian_hang_id = ?',
            [ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, trang_thai, req.params.id, shop[0].id]
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

module.exports = { createPromotion, getMyPromotions, updatePromotion, deletePromotion };
