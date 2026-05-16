const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Kết nối database thành công!');

        // Kiểm tra xem cột google_id đã tồn tại chưa
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'nguoi_dung' AND COLUMN_NAME = 'google_id'
        `, [process.env.DB_NAME]);

        if (columns.length === 0) {
            // Thêm cột google_id
            await connection.execute(`
                ALTER TABLE nguoi_dung 
                ADD COLUMN google_id VARCHAR(100) UNIQUE AFTER avatar
            `);
            console.log('✅ Đã thêm cột google_id');
        } else {
            console.log('ℹ️  Cột google_id đã tồn tại');
        }

        // Cho phép mat_khau NULL (cho tài khoản Google)
        await connection.execute(`
            ALTER TABLE nguoi_dung 
            MODIFY COLUMN mat_khau VARCHAR(255) NULL
        `);
        console.log('✅ Đã cập nhật cột mat_khau cho phép NULL');

        console.log('🎉 Cập nhật schema thành công!');

    } catch (error) {
        console.error('❌ Lỗi cập nhật schema:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateSchema();