const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupKLTN2026() {
    let connection;
    
    try {
        console.log('🔄 Đang kết nối MySQL...');
        
        // Kết nối MySQL
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });
        
        console.log('✅ Kết nối MySQL thành công!');
        
        // Sử dụng database kltn2026
        console.log('🗄️  Sử dụng database kltn2026...');
        await connection.execute('USE kltn2026');
        
        // Đọc và chạy schema.sql (sửa tên database)
        console.log('📋 Tạo cấu trúc bảng...');
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        let schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Thay thế KLTN2026 thành kltn2026
        schemaSQL = schemaSQL.replace(/USE KLTN2026;/g, 'USE kltn2026;');
        
        // Tách và chạy từng câu lệnh
        const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            if (statement.trim() && !statement.trim().startsWith('--')) {
                try {
                    await connection.execute(statement);
                } catch (err) {
                    if (!err.message.includes('already exists')) {
                        console.warn('⚠️  Warning:', err.message);
                    }
                }
            }
        }
        console.log('✅ Cấu trúc bảng đã được tạo!');
        
        // Đọc và chạy seed.sql
        console.log('🌱 Thêm dữ liệu mẫu...');
        const seedPath = path.join(__dirname, 'database', 'seed.sql');
        let seedSQL = fs.readFileSync(seedPath, 'utf8');
        
        // Thay thế KLTN2026 thành kltn2026
        seedSQL = seedSQL.replace(/USE KLTN2026;/g, 'USE kltn2026;');
        
        const seedStatements = seedSQL.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of seedStatements) {
            if (statement.trim() && !statement.trim().startsWith('--')) {
                try {
                    await connection.execute(statement);
                } catch (err) {
                    if (!err.message.includes('Duplicate entry')) {
                        console.warn('⚠️  Warning:', err.message);
                    }
                }
            }
        }
        console.log('✅ Dữ liệu mẫu đã được thêm!');
        
        // Kiểm tra kết quả
        console.log('\n📊 Kiểm tra database:');
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📋 Số bảng: ${tables.length}`);
        
        if (tables.length > 0) {
            const [users] = await connection.execute('SELECT COUNT(*) as count FROM nguoi_dung');
            console.log(`👥 Số người dùng: ${users[0].count}`);
            
            const [products] = await connection.execute('SELECT COUNT(*) as count FROM san_pham');
            console.log(`📦 Số sản phẩm: ${products[0].count}`);
            
            // Kiểm tra admin
            const [admin] = await connection.execute('SELECT * FROM nguoi_dung WHERE vai_tro = "admin"');
            if (admin.length > 0) {
                console.log(`👑 Admin: ${admin[0].email}`);
            }
        }
        
        console.log('\n🎉 Setup database hoàn tất!');
        console.log('\n📋 Thông tin đăng nhập admin:');
        console.log('Email: admin@kltn2026.com');
        console.log('Mật khẩu: 123456');
        console.log('\n🌐 Bây giờ bạn có thể khởi động server: npm run dev');
        
    } catch (error) {
        console.error('❌ Lỗi setup database:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit(0);
    }
}

setupKLTN2026();