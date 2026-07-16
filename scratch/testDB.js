const pool = require('../src/backend/config/database.js');

async function test() {
    try {
        const [rows] = await pool.query('SELECT * FROM khuyen_mai WHERE gian_hang_id IS NULL');
        console.log('Global Vouchers:', rows);
        process.exit(0);
    } catch(e) {
        console.error('Error:', e);
        process.exit(1);
    }
}
test();
