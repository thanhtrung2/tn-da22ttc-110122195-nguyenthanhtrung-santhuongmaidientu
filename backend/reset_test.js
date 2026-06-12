require('dotenv').config();
const pool = require('./config/database');

async function test() {
    try {
        // Re-insert shop for user 8 to test
        await pool.query("INSERT IGNORE INTO shop (nguoi_ban_id, ten_shop, dia_chi_kho, ma_so_thue) VALUES (8, 'Test Shop', 'Test', '0000000000')");
        await pool.query("UPDATE nguoi_dung SET vai_tro='seller', trang_thai_xac_thuc='rejected', ly_do_tu_choi='test' WHERE id=8");
        console.log('Reset user 8 to rejected seller');
    } catch(e) {
        console.error('Error:', e.message, e.sqlMessage);
    }
    process.exit(0);
}
test();
