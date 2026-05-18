const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Starting migration...');
        
        // Fix column length in gian_hang
        await connection.query('ALTER TABLE gian_hang MODIFY COLUMN dia_chi VARCHAR(500)');
        console.log('✅ Updated gian_hang.dia_chi length to 500');

        // Ensure shop table has all columns
        await connection.query('ALTER TABLE shop ADD COLUMN IF NOT EXISTS admin_duyet_id INT NULL');
        await connection.query('ALTER TABLE shop ADD COLUMN IF NOT EXISTS ngay_duyet TIMESTAMP NULL');
        console.log('✅ Ensured shop table has admin columns');

        // Ensure nguoi_dung has ngay_xac_thuc
        await connection.query('ALTER TABLE nguoi_dung ADD COLUMN IF NOT EXISTS ngay_xac_thuc TIMESTAMP NULL');
        console.log('✅ Ensured nguoi_dung has ngay_xac_thuc');

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
