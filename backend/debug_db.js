require('dotenv').config();
const pool = require('./config/database');

async function test() {
    try {
        // Check nguoi_dung columns
        const [cols] = await pool.query('DESCRIBE nguoi_dung');
        console.log('nguoi_dung columns:', cols.map(c=>c.Field).join(', '));
        
        // Check if shop table exists
        const [shopCols] = await pool.query('DESCRIBE shop');
        console.log('shop columns:', shopCols.map(c=>c.Field).join(', '));

        // Check rejected users
        const [rejected] = await pool.query("SELECT id, vai_tro, trang_thai_xac_thuc FROM nguoi_dung WHERE trang_thai_xac_thuc = 'rejected'");
        console.log('Rejected users:', JSON.stringify(rejected));
        
        // Try the actual delete operation on a fake ID to see if there's a FK constraint issue
        const [shopFK] = await pool.query("SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'shop'");
        console.log('FK references to shop:', JSON.stringify(shopFK));
    } catch(e) {
        console.error('Error:', e.message, e.sqlMessage);
    }
    process.exit(0);
}
test();
