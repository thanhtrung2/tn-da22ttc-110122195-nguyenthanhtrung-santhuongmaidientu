const pool = require('../config/database');

// Tạo gian hàng
const createShop = async (req, res) => {
    try {
        const { ten_gian_hang, mo_ta, dia_chi } = req.body;
        let logo = null;
        if (req.file) logo = req.file.path || req.file.filename;

        // Check if seller already has a shop
        const [existing] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bạn đã có gian hàng' });
        }

        const [result] = await pool.query(
            'INSERT INTO gian_hang (nguoi_ban_id, ten_gian_hang, mo_ta, logo, dia_chi) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, ten_gian_hang, mo_ta, logo, dia_chi]
        );

        // Update user role to seller if not already
        if (req.user.vai_tro !== 'seller') {
            await pool.query('UPDATE nguoi_dung SET vai_tro = ? WHERE id = ?', ['seller', req.user.id]);
        }

        res.status(201).json({ success: true, message: 'Tạo gian hàng thành công', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create shop error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy gian hàng của tôi
const getMyShop = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Bạn chưa có gian hàng' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Cập nhật gian hàng
const updateShop = async (req, res) => {
    try {
        const { ten_gian_hang, mo_ta, dia_chi } = req.body;
        let logo = undefined;
        if (req.file) logo = req.file.path || req.file.filename;

        const [shop] = await pool.query('SELECT * FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.status(404).json({ success: false, message: 'Gian hàng không tồn tại' });
        }

        await pool.query(
            'UPDATE gian_hang SET ten_gian_hang = ?, mo_ta = ?, dia_chi = ?, logo = ? WHERE id = ?',
            [ten_gian_hang || shop[0].ten_gian_hang, mo_ta || shop[0].mo_ta, dia_chi || shop[0].dia_chi, logo || shop[0].logo, shop[0].id]
        );

        res.json({ success: true, message: 'Cập nhật gian hàng thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy thông tin gian hàng theo ID (public)
const getShopById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT g.*, nd.ho_ten as ten_nguoi_ban, 
            (SELECT COUNT(*) FROM san_pham WHERE gian_hang_id = g.id AND trang_thai = 'active') as so_san_pham,
            (SELECT AVG(dg.so_sao) FROM danh_gia dg JOIN san_pham sp ON dg.san_pham_id = sp.id WHERE sp.gian_hang_id = g.id) as diem_trung_binh
            FROM gian_hang g JOIN nguoi_dung nd ON g.nguoi_ban_id = nd.id WHERE g.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Gian hàng không tồn tại' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy tất cả gian hàng (public)
const getAllShops = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT g.*, nd.ho_ten as ten_nguoi_ban,
            (SELECT COUNT(*) FROM san_pham WHERE gian_hang_id = g.id AND trang_thai = 'active') as so_san_pham
            FROM gian_hang g JOIN nguoi_dung nd ON g.nguoi_ban_id = nd.id WHERE g.trang_thai = 'active'`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy gian hàng theo ID người bán (public)
const getShopBySellerId = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT g.*, nd.ho_ten as ten_nguoi_ban FROM gian_hang g JOIN nguoi_dung nd ON g.nguoi_ban_id = nd.id WHERE g.nguoi_ban_id = ?`,
            [req.params.sellerId]
        );
        if (rows.length === 0) {
            return res.status(200).json({ success: false, message: 'Gian hàng của người bán này không tồn tại hoặc chưa tạo' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { createShop, getMyShop, updateShop, getShopById, getAllShops, getShopBySellerId };
