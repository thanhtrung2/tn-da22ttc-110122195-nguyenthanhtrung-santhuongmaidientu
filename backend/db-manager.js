const pool = require('./config/database');

async function showTables() {
    try {
        console.log('📊 DANH SÁCH CÁC BẢNG:');
        const [tables] = await pool.query('SHOW TABLES');
        tables.forEach((table, index) => {
            console.log(`${index + 1}. ${Object.values(table)[0]}`);
        });
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

async function showUsers() {
    try {
        console.log('\n👥 DANH SÁCH NGƯỜI DÙNG:');
        const [users] = await pool.query('SELECT id, ho_ten, email, vai_tro, trang_thai FROM nguoi_dung');
        console.table(users);
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

async function showProducts() {
    try {
        console.log('\n📦 DANH SÁCH SẢN PHẨM:');
        const [products] = await pool.query(`
            SELECT sp.id, sp.ten_san_pham, sp.gia, gh.ten_gian_hang, dm.ten_danh_muc 
            FROM san_pham sp 
            LEFT JOIN gian_hang gh ON sp.gian_hang_id = gh.id 
            LEFT JOIN danh_muc dm ON sp.danh_muc_id = dm.id 
            LIMIT 10
        `);
        console.table(products);
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

async function showOrders() {
    try {
        console.log('\n🛒 DANH SÁCH ĐỚN HÀNG:');
        const [orders] = await pool.query(`
            SELECT dh.id, nd.ho_ten, dh.tong_tien, dh.trang_thai, dh.ngay_tao 
            FROM don_hang dh 
            LEFT JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id 
            ORDER BY dh.ngay_tao DESC 
            LIMIT 10
        `);
        console.table(orders);
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

async function main() {
    console.log('🗄️  KLTN2026 DATABASE MANAGER\n');
    console.log('📋 Thông tin kết nối:');
    console.log('Host: 127.0.0.1:3306');
    console.log('Database: KLTN2026');
    console.log('User: root\n');
    
    await showTables();
    await showUsers();
    await showProducts();
    await showOrders();
    
    process.exit(0);
}

main();