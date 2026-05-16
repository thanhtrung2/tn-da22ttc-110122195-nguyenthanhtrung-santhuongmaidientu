const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    let connection;
    
    try {
        console.log('🔄 Đang kết nối MySQL...');
        
        // Kết nối MySQL (không chọn database)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });
        
        console.log('✅ Kết nối MySQL thành công!');
        
        // Tạo database nếu chưa có
        console.log('🗄️  Tạo database KLTN2026...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS KLTN2026 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.query(`USE KLTN2026`);
        console.log('✅ Database KLTN2026 đã sẵn sàng!');
        
        // Đọc và chạy schema.sql
        console.log('📋 Tạo cấu trúc bảng...');
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Tách các câu lệnh SQL
        const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.query(statement);
                } catch (err) {
                    // Bỏ qua lỗi nếu cột/index đã tồn tại hoặc syntax IF NOT EXISTS không hỗ trợ
                    if (!err.message.includes('Duplicate column name') && 
                        !err.message.includes('Duplicate key name') &&
                        !err.message.includes('already exists')) {
                        console.warn(`⚠️  Warning statement: ${statement.substring(0, 50)}...`);
                        console.warn(`   Error: ${err.message}`);
                    }
                }
            }
        }
        console.log('✅ Cấu trúc bảng đã được tạo (hoặc cập nhật)!');
        
        // Đọc và chạy seed.sql
        console.log('🌱 Thêm dữ liệu mẫu...');
        const seedPath = path.join(__dirname, 'database', 'seed.sql');
        const seedSQL = fs.readFileSync(seedPath, 'utf8');
        
        // Tách các câu lệnh SQL
        const seedStatements = seedSQL.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of seedStatements) {
            if (statement.trim()) {
                try {
                    await connection.query(statement);
                } catch (err) {
                    // Bỏ qua lỗi duplicate entry
                    if (!err.message.includes('Duplicate entry')) {
                        console.warn('⚠️  Warning:', err.message);
                    }
                }
            }
        }
        console.log('✅ Dữ liệu mẫu đã được thêm!');
        
        // Kiểm tra kết quả
        console.log('\n📊 Kiểm tra database:');
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`📋 Số bảng: ${tables.length}`);
        
        const [users] = await connection.query('SELECT COUNT(*) as count FROM nguoi_dung');
        console.log(`👥 Số người dùng: ${users[0].count}`);
        
        const [products] = await connection.query('SELECT COUNT(*) as count FROM san_pham');
        console.log(`📦 Số sản phẩm: ${products[0].count}`);
        
        console.log('\n🎉 Setup database hoàn tất!');
        console.log('\n📋 Thông tin đăng nhập admin:');
        console.log('Email: admin@kltn2026.com');
        console.log('Mật khẩu: 123456');
        
    } catch (error) {
        console.error('❌ Lỗi setup database:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Hướng dẫn sửa lỗi:');
            console.log('1. Kiểm tra username/password MySQL trong file .env');
            console.log('2. Đảm bảo MySQL Server đang chạy');
            console.log('3. Kiểm tra quyền truy cập của user');
        }
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit(0);
    }
}

setupDatabase();