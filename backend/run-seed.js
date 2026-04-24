// Script chạy dữ liệu mẫu vào MySQL
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

async function runSeed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true,
        charset: 'utf8mb4'
    });

    console.log('✅ Đã kết nối MySQL');

    const seedFile = fs.readFileSync(path.join(__dirname, 'database', 'seed.sql'), 'utf8');
    
    try {
        await connection.query(seedFile);
        console.log('🌱 Dữ liệu mẫu đã được thêm thành công!');
    } catch (err) {
        console.error('❌ Lỗi:', err.message);
    }

    await connection.end();
    process.exit(0);
}

runSeed();
