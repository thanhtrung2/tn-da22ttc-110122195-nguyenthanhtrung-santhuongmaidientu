const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const shopsData = [
    {
        email: 'vipo_electronics@kltn2026.com',
        username: 'vipo_electronics',
        password: 'password123',
        fullName: 'Vipo Electronics',
        phone: '0988777666',
        shopName: 'Vipo Electronics & Gadgets',
        shopDesc: 'Chuyên cung cấp các thiết bị điện tử, điện thoại di động chính hãng với giá cả cạnh tranh nhất thị trường. Bảo hành uy tín 24 tháng.',
        address: '222 Điện Biên Phủ, Phường 7, Quận 3, TP. Hồ Chí Minh',
        taxCode: '0312345688',
        logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=150',
        shippingMethods: ['giao_hang_nhanh', 'giao_hang_tiet_kiem'],
        products: [
            {
                ten: 'Điện thoại thông minh Apple iPhone 15 Pro (Titanium)',
                moTa: `<p>Siêu phẩm điện thoại thế hệ mới với vỏ Titanium siêu nhẹ và bền bỉ. Màn hình Super Retina XDR hiển thị sắc nét đỉnh cao.</p>
                       <p><img src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800" style="width:100%;border-radius:12px;margin:10px 0;"/></p>
                       <p>Camera chính 48MP hỗ trợ chụp ảnh chân dung thế hệ mới với độ chi tiết và màu sắc đáng kinh ngạc.</p>
                       <p><img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=800" style="width:100%;border-radius:12px;margin:10px 0;"/></p>
                       <p>Trang bị chip A17 Pro mạnh mẽ nhất hiện nay, cho hiệu năng chơi game mượt mà như console.</p>
                       <p><img src="https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=800" style="width:100%;border-radius:12px;margin:10px 0;"/></p>`,
                danhMucId: 1, // Điện thoại & Phụ kiện
                gia: 28990000,
                giaKhuyenMai: 27500000,
                tonKho: 150,
                hinhAnh: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Tai nghe Bluetooth Không dây Sony WH-1000XM5 Chống Ồn',
                moTa: `<p>Đắm chìm trong không gian âm nhạc tuyệt hảo với tai nghe Sony WH-1000XM5. Công nghệ chống ồn chủ động (ANC) dẫn đầu ngành.</p>
                       <p><img src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800" style="width:100%;border-radius:12px;margin:10px 0;"/></p>
                       <p>Chất âm High-Resolution Audio Wireless đỉnh cao cùng củ loa thiết kế đặc biệt 30mm.</p>
                       <p><img src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800" style="width:100%;border-radius:12px;margin:10px 0;"/></p>`,
                danhMucId: 1, // Điện thoại & Phụ kiện
                gia: 7990000,
                giaKhuyenMai: 6990000,
                tonKho: 80,
                hinhAnh: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=500'
            }
        ]
    },
    {
        email: 'vipo_fashion@kltn2026.com',
        username: 'vipo_fashion',
        password: 'password123',
        fullName: 'Vipo Fashion',
        phone: '0977888999',
        shopName: 'Vipo Fashion Trendy',
        shopDesc: 'Xu hướng thời trang mới nhất dành cho phái đẹp. Các mẫu mã đa dạng, chất lượng vải cao cấp mang lại sự thoải mái tối đa.',
        address: '88 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        taxCode: '0312345699',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=150',
        shippingMethods: ['giao_hang_nhanh', 'giao_hang_tiet_kiem'],
        products: [
            {
                ten: 'Đầm Lụa Dạ Hội Nữ Kiểu Dáng Thanh Lịch Quý Phái',
                moTa: `<p>Thiết kế đầm lụa satin cao cấp, mềm mại và rủ nhẹ tạo cảm giác vô cùng thanh thoát và sang trọng khi dự tiệc.</p>
                       <p><img src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800" style="width:100%;border-radius:12px;margin:10px 0;"/></p>
                       <p>Kiểu dáng ôm nhẹ phần eo, tôn lên đường cong tự nhiên đầy quyến rũ.</p>
                       <p><img src="https://images.unsplash.com/photo-1515347619253-1200b3e10bd5?auto=format&fit=crop&q=80&w=800" style="width:100%;border-radius:12px;margin:10px 0;"/></p>`,
                danhMucId: 4, // Thời trang Nữ
                gia: 1250000,
                giaKhuyenMai: 890000,
                tonKho: 45,
                hinhAnh: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Túi Xách Nữ Da Thật Cao Cấp Phong Cách Châu Âu',
                moTa: `<p>Chất liệu da bò tự nhiên 100%, càng dùng càng bóng đẹp. Ngăn chứa rộng rãi, tiện lợi mang theo mọi đồ vật thiết yếu.</p>
                       <p><img src="https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800" style="width:100%;border-radius:12px;margin:10px 0;"/></p>
                       <p>Khóa kim loại chống gỉ mạ vàng sang trọng, làm nổi bật đẳng cấp của người sử dụng.</p>
                       <p><img src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=800" style="width:100%;border-radius:12px;margin:10px 0;"/></p>`,
                danhMucId: 4, // Thời trang Nữ
                gia: 3450000,
                giaKhuyenMai: 2890000,
                tonKho: 25,
                hinhAnh: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=500'
            }
        ]
    }
];

async function seedData() {
    console.log('🔄 BẮT ĐẦU QUÁ TRÌNH SEED GIAN HÀNG & SẢN PHẨM MỚI...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        charset: 'utf8mb4'
    });

    try {
        await connection.beginTransaction();

        for (const s of shopsData) {
            console.log(`🤖 Xử lý Shop: ${s.shopName}`);

            const [existingUsers] = await connection.query('SELECT id FROM nguoi_dung WHERE email = ?', [s.email]);

            if (existingUsers.length > 0) {
                const userId = existingUsers[0].id;
                const [existingShops] = await connection.query('SELECT id FROM shop WHERE nguoi_ban_id = ?', [userId]);
                if (existingShops.length > 0) {
                    const shopId = existingShops[0].id;
                    const [existingGhs] = await connection.query('SELECT id FROM gian_hang WHERE shop_id = ?', [shopId]);
                    if (existingGhs.length > 0) {
                        const ghId = existingGhs[0].id;
                        await connection.query('DELETE FROM san_pham WHERE gian_hang_id = ?', [ghId]);
                        await connection.query('DELETE FROM gian_hang WHERE id = ?', [ghId]);
                    }
                    await connection.query('DELETE FROM shop WHERE id = ?', [shopId]);
                }
                await connection.query('DELETE FROM nguoi_dung WHERE id = ?', [userId]);
            }

            const hashedPassword = await bcrypt.hash(s.password, 10);
            
            const [userInsert] = await connection.query(
                `INSERT INTO nguoi_dung (ho_ten, email, mat_khau, so_dien_thoai, vai_tro, trang_thai, ten_dang_nhap, trang_thai_xac_thuc, ngay_xac_thuc) 
                 VALUES (?, ?, ?, ?, 'seller', 'active', ?, 'verified', NOW())`,
                [s.fullName, s.email, hashedPassword, s.phone, s.username]
            );
            const newUserId = userInsert.insertId;

            const shippingJson = JSON.stringify(s.shippingMethods);
            const [shopInsert] = await connection.query(
                `INSERT INTO shop (nguoi_ban_id, ten_shop, mo_ta, logo, dia_chi_kho, phuong_thuc_van_chuyen, ma_so_thue, trang_thai, ngay_duyet, admin_duyet_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), 1)`,
                [newUserId, s.shopName, s.shopDesc, s.logo, s.address, shippingJson, s.taxCode]
            );
            const newShopId = shopInsert.insertId;

            const [ghInsert] = await connection.query(
                `INSERT INTO gian_hang (nguoi_ban_id, ten_gian_hang, mo_ta, logo, dia_chi, trang_thai, shop_id) 
                 VALUES (?, ?, ?, ?, ?, 'active', ?)`,
                [newUserId, s.shopName, s.shopDesc, s.logo, s.address, newShopId]
            );
            const newGhId = ghInsert.insertId;

            for (const p of s.products) {
                await connection.query(
                    `INSERT INTO san_pham (gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'approved')`,
                    [newGhId, p.danhMucId, p.ten, p.moTa, p.gia, p.giaKhuyenMai || null, p.tonKho, p.hinhAnh]
                );
            }
            console.log(`✅ Đã thêm toàn bộ sản phẩm của ${s.shopName} thành công.`);
        }

        await connection.commit();
        console.log('🌱 TRANSACTION THÀNH CÔNG: SẢN PHẨM MÔ TẢ ĐA HÌNH ẢNH ĐÃ ĐƯỢC THÊM VÀO!');

    } catch (err) {
        await connection.rollback();
        console.error('❌ LỖI:', err.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

seedData();
