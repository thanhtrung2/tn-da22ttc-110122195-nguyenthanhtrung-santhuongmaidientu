const pool = require('../config/database');

// Lấy danh sách địa chỉ của người dùng
const getAddresses = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM dia_chi_nguoi_dung WHERE nguoi_dung_id = ? ORDER BY la_mac_dinh DESC, ngay_tao DESC',
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách địa chỉ' });
    }
};

// Thêm địa chỉ mới
const createAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { ho_ten, so_dien_thoai, dia_chi, la_mac_dinh } = req.body;

        if (!ho_ten || !so_dien_thoai || !dia_chi) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ họ tên, SĐT và địa chỉ' });
        }

        // Kiểm tra xem người dùng đã có địa chỉ nào chưa
        const [existing] = await connection.query(
            'SELECT id FROM dia_chi_nguoi_dung WHERE nguoi_dung_id = ?',
            [req.user.id]
        );

        let finalIsDefault = la_mac_dinh ? 1 : 0;
        // Nếu là địa chỉ đầu tiên, bắt buộc phải là mặc định
        if (existing.length === 0) {
            finalIsDefault = 1;
        }

        // Nếu thiết lập làm mặc định, đặt tất cả địa chỉ cũ thành không mặc định
        if (finalIsDefault === 1) {
            await connection.query(
                'UPDATE dia_chi_nguoi_dung SET la_mac_dinh = FALSE WHERE nguoi_dung_id = ?',
                [req.user.id]
            );
        }

        const [result] = await connection.query(
            'INSERT INTO dia_chi_nguoi_dung (nguoi_dung_id, ho_ten, so_dien_thoai, dia_chi, la_mac_dinh) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, ho_ten, so_dien_thoai, dia_chi, finalIsDefault]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Thêm địa chỉ thành công',
            data: {
                id: result.insertId,
                nguoi_dung_id: req.user.id,
                ho_ten,
                so_dien_thoai,
                dia_chi,
                la_mac_dinh: finalIsDefault === 1
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create address error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm địa chỉ' });
    } finally {
        connection.release();
    }
};

// Cập nhật địa chỉ
const updateAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const addressId = req.params.id;
        const { ho_ten, so_dien_thoai, dia_chi, la_mac_dinh } = req.body;

        if (!ho_ten || !so_dien_thoai || !dia_chi) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ họ tên, SĐT và địa chỉ' });
        }

        // Kiểm tra địa chỉ có tồn tại và thuộc về user không
        const [address] = await connection.query(
            'SELECT * FROM dia_chi_nguoi_dung WHERE id = ? AND nguoi_dung_id = ?',
            [addressId, req.user.id]
        );

        if (address.length === 0) {
            return res.status(404).json({ success: false, message: 'Địa chỉ không tồn tại' });
        }

        let finalIsDefault = la_mac_dinh ? 1 : 0;
        // Nếu địa chỉ này đang là mặc định thì không cho bỏ mặc định trừ khi có cái khác thay thế
        if (address[0].la_mac_dinh && !la_mac_dinh) {
            finalIsDefault = 1;
        }

        // Nếu đặt làm mặc định, đổi các cái khác thành 0
        if (finalIsDefault === 1) {
            await connection.query(
                'UPDATE dia_chi_nguoi_dung SET la_mac_dinh = FALSE WHERE nguoi_dung_id = ?',
                [req.user.id]
            );
        }

        await connection.query(
            'UPDATE dia_chi_nguoi_dung SET ho_ten = ?, so_dien_thoai = ?, dia_chi = ?, la_mac_dinh = ? WHERE id = ? AND nguoi_dung_id = ?',
            [ho_ten, so_dien_thoai, dia_chi, finalIsDefault, addressId, req.user.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Cập nhật địa chỉ thành công'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Update address error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật địa chỉ' });
    } finally {
        connection.release();
    }
};

// Xóa địa chỉ
const deleteAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const addressId = req.params.id;

        // Kiểm tra địa chỉ có tồn tại và thuộc về user không
        const [address] = await connection.query(
            'SELECT * FROM dia_chi_nguoi_dung WHERE id = ? AND nguoi_dung_id = ?',
            [addressId, req.user.id]
        );

        if (address.length === 0) {
            return res.status(404).json({ success: false, message: 'Địa chỉ không tồn tại' });
        }

        const wasDefault = address[0].la_mac_dinh;

        // Xóa địa chỉ
        await connection.query(
            'DELETE FROM dia_chi_nguoi_dung WHERE id = ? AND nguoi_dung_id = ?',
            [addressId, req.user.id]
        );

        // Nếu địa chỉ bị xóa là mặc định, chuyển địa chỉ khác (nếu có) thành mặc định
        if (wasDefault) {
            const [remaining] = await connection.query(
                'SELECT id FROM dia_chi_nguoi_dung WHERE nguoi_dung_id = ? ORDER BY ngay_tao DESC LIMIT 1',
                [req.user.id]
            );

            if (remaining.length > 0) {
                await connection.query(
                    'UPDATE dia_chi_nguoi_dung SET la_mac_dinh = TRUE WHERE id = ?',
                    [remaining[0].id]
                );
            }
        }

        await connection.commit();

        res.json({ success: true, message: 'Xóa địa chỉ thành công' });
    } catch (error) {
        await connection.rollback();
        console.error('Delete address error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa địa chỉ' });
    } finally {
        connection.release();
    }
};

// Đặt làm mặc định
const setDefaultAddress = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const addressId = req.params.id;

        // Kiểm tra địa chỉ có thuộc về user không
        const [address] = await connection.query(
            'SELECT * FROM dia_chi_nguoi_dung WHERE id = ? AND nguoi_dung_id = ?',
            [addressId, req.user.id]
        );

        if (address.length === 0) {
            return res.status(404).json({ success: false, message: 'Địa chỉ không tồn tại' });
        }

        // Đặt tất cả thành không mặc định
        await connection.query(
            'UPDATE dia_chi_nguoi_dung SET la_mac_dinh = FALSE WHERE nguoi_dung_id = ?',
            [req.user.id]
        );

        // Đặt địa chỉ này thành mặc định
        await connection.query(
            'UPDATE dia_chi_nguoi_dung SET la_mac_dinh = TRUE WHERE id = ? AND nguoi_dung_id = ?',
            [addressId, req.user.id]
        );

        await connection.commit();

        res.json({ success: true, message: 'Đặt địa chỉ mặc định thành công' });
    } catch (error) {
        await connection.rollback();
        console.error('Set default address error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

module.exports = {
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
