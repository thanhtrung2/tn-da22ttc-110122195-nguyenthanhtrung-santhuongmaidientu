const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'vipo_db'
        });

        console.log('Altering khuyen_mai table to allow NULL gian_hang_id...');
        await pool.query('ALTER TABLE khuyen_mai MODIFY gian_hang_id INT NULL;');
        console.log('Success!');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}
run();
