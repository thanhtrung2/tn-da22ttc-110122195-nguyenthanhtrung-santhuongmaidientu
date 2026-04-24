const bcrypt = require('bcryptjs');
const pool = require('./config/database');

async function resetAdminPassword() {
    try {
        console.log('🔄 Đang reset mật khẩu admin...');
        
        // Hash password mới
        const newPassword = '123456';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Cập nhật hoặc tạo tài khoản admin
        const [existing] = await pool.query('SELECT id FROM nguoi_dung WHERE email = ?', ['admin@kltn2026.com']);
        
        if (existing.length > 0) {
            // Cập nhật mật khẩu
            await pool.query(
                'UPDATE nguoi_dung SET mat_khau = ?, trang_thai = ? WHERE email = ?',
                [hashedPassword, 'active', 'admin@kltn2026.com']
            );
            console.log('✅ Đã cập nhật mật khẩu admin');
        } else {
            // Tạo tài khoản admin mới
            await pool.query(
                'INSERT INTO nguoi_dung (ho_ten, email, mat_khau, vai_tro, trang_thai) VALUES (?, ?, ?, ?, ?)',
                ['Admin Hệ Thống', 'admin@kltn2026.com', hashedPassword, 'admin', 'active']
            );
            console.log('✅ Đã tạo tài khoản admin mới');
        }
        
        // Kiểm tra lại
        const [admin] = await pool.query('SELECT id, ho_ten, email, vai_tro, trang_thai FROM nguoi_dung WHERE email = ?', ['admin@kltn2026.com']);
        console.log('👤 Thông tin admin:', admin[0]);
        
        // Test đăng nhập
        const isValid = await bcrypt.compare('123456', admin[0].mat_khau || hashedPassword);
        console.log('🔐 Test mật khẩu:', isValid ? '✅ Đúng' : '❌ Sai');
        
        console.log('\n📋 Thông tin đăng nhập:');
        console.log('Email: admin@kltn2026.com');
        console.log('Mật khẩu: 123456');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
}

resetAdminPassword();