const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function cleanup() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '02032004',
        database: process.env.DB_NAME || 'kltn2026'
    });

    try {
        console.log('🧹 Bắt đầu dọn dẹp dữ liệu...');

        // Tắt check foreign key để xóa dễ dàng
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        // Xóa dữ liệu các bảng liên quan đến shop và sản phẩm
        const tablesToClear = [
            'chi_tiet_don_hang',
            'don_hang',
            'gio_hang',
            'danh_gia',
            'khuyen_mai',
            'tin_nhan',
            'khieu_nai',
            'san_pham',
            'gian_hang',
            'shop',
            'thong_bao'
        ];

        for (const table of tablesToClear) {
            console.log(`- Đang xóa bảng ${table}...`);
            await pool.query(`TRUNCATE TABLE ${table}`);
        }

        // Reset tất cả người dùng (ngoại trừ admin) về role customer và xóa thông tin xác thực
        console.log('- Đang reset vai trò người dùng...');
        await pool.query(`
            UPDATE nguoi_dung 
            SET vai_tro = 'customer', 
                cccd_mat_truoc = NULL, 
                cccd_mat_sau = NULL, 
                giay_phep_kinh_doanh = NULL, 
                anh_guong_mat = NULL, 
                trang_thai_xac_thuc = NULL, 
                ly_do_tu_choi = NULL, 
                ngay_xac_thuc = NULL 
            WHERE vai_tro != 'admin'
        `);

        // Bật lại check foreign key
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('✅ Dọn dẹp hoàn tất! Cơ sở dữ liệu đã sạch.');
    } catch (error) {
        console.error('❌ Lỗi dọn dẹp:', error);
    } finally {
        await pool.end();
    }
}

cleanup();
