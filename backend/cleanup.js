require('dotenv').config();
const pool = require('./config/database');

async function cleanup() {
    console.log('Starting data cleanup...');
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Clear transactional tables
        console.log('Clearing reviews, orders, cart...');
        await connection.query('DELETE FROM danh_gia');
        await connection.query('DELETE FROM chi_tiet_don_hang');
        await connection.query('DELETE FROM don_hang');
        await connection.query('DELETE FROM gio_hang');
        await connection.query('DELETE FROM thong_bao');
        await connection.query('DELETE FROM tin_nhan');
        await connection.query('DELETE FROM khieu_nai');
        await connection.query('DELETE FROM khuyen_mai');

        // 2. Clear products and shops
        console.log('Clearing products and shops...');
        await connection.query('DELETE FROM san_pham');
        await connection.query('DELETE FROM gian_hang');
        await connection.query('DELETE FROM shop');

        // 3. Reset users (except admin)
        console.log('Resetting users...');
        await connection.query(`
            UPDATE nguoi_dung 
            SET vai_tro = 'customer', 
                trang_thai_xac_thuc = NULL, 
                cccd_mat_truoc = NULL, 
                cccd_mat_sau = NULL, 
                giay_phep_kinh_doanh = NULL, 
                anh_guong_mat = NULL,
                ly_do_tu_choi = NULL
            WHERE email != 'admin@kltn2026.com'
        `);

        await connection.commit();
        console.log('Cleanup completed successfully!');
    } catch (error) {
        await connection.rollback();
        console.error('Cleanup failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

cleanup();
