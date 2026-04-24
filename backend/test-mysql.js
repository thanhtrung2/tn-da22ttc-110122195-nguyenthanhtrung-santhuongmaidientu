const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMySQLConnection() {
    console.log('🔍 KIỂM TRA KẾT NỐI MYSQL\n');
    
    console.log('📋 Thông tin kết nối từ file .env:');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Port: ${process.env.DB_PORT}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log(`Password: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-2) : 'KHÔNG CÓ'}`);
    console.log(`Database: ${process.env.DB_NAME}\n`);

    try {
        console.log('🔄 Đang thử kết nối MySQL...');
        
        // Test kết nối không chọn database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        
        console.log('✅ Kết nối MySQL thành công!');
        
        // Kiểm tra các database có sẵn
        console.log('\n📊 Danh sách database:');
        const [databases] = await connection.execute('SHOW DATABASES');
        databases.forEach(db => {
            const dbName = Object.values(db)[0];
            console.log(`  - ${dbName}`);
        });
        
        // Kiểm tra database kltn2026
        const kltnExists = databases.some(db => Object.values(db)[0] === 'kltn2026');
        console.log(`\n🗄️  Database kltn2026: ${kltnExists ? '✅ Tồn tại' : '❌ Chưa có'}`);
        
        if (kltnExists) {
            // Kết nối với database kltn2026
            await connection.execute('USE kltn2026');
            
            // Kiểm tra các bảng
            const [tables] = await connection.execute('SHOW TABLES');
            console.log(`📋 Số bảng trong KLTN2026: ${tables.length}`);
            
            if (tables.length > 0) {
                console.log('📋 Danh sách bảng:');
                tables.forEach(table => {
                    console.log(`  - ${Object.values(table)[0]}`);
                });
                
                // Kiểm tra dữ liệu
                try {
                    const [users] = await connection.execute('SELECT COUNT(*) as count FROM nguoi_dung');
                    console.log(`👥 Số người dùng: ${users[0].count}`);
                    
                    const [products] = await connection.execute('SELECT COUNT(*) as count FROM san_pham');
                    console.log(`📦 Số sản phẩm: ${products[0].count}`);
                } catch (err) {
                    console.log('⚠️  Chưa có dữ liệu trong bảng');
                }
            }
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Lỗi kết nối MySQL:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Lỗi xác thực - Kiểm tra lại:');
            console.log('1. Username MySQL (thường là "root")');
            console.log('2. Password MySQL');
            console.log('3. MySQL Server có đang chạy không?');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Không thể kết nối - Kiểm tra:');
            console.log('1. MySQL Server có đang chạy không?');
            console.log('2. Port 3306 có đúng không?');
            console.log('3. Host localhost/127.0.0.1 có đúng không?');
        }
    }
    
    process.exit(0);
}

testMySQLConnection();