/**
 * SCRIPT SEED DỮ LIỆU CÁC GIAN HÀNG VÀ SẢN PHẨM MẪU PHÂN LOẠI
 * File: backend/seed-shops.js
 * Cách chạy: node backend/seed-shops.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Định nghĩa dữ liệu các Shop
const shopsData = [
    {
        email: 'vipotech@kltn2026.com',
        username: 'vipotech',
        password: 'tech123456',
        fullName: 'Vipo Tech Store',
        phone: '0911222333',
        shopName: 'Vipo Tech - Siêu Thị Công Nghệ',
        shopDesc: 'Chuyên cung cấp điện thoại di động, laptop, phụ kiện công nghệ chính hãng, uy tín hàng đầu với giá cả cạnh tranh nhất thị trường.',
        address: '123 Đường Ba Tháng Hai, Phường 11, Quận 10, TP. Hồ Chí Minh',
        taxCode: '0312345678',
        logo: 'https://images.unsplash.com/photo-1516841273335-e39b37888115?auto=format&fit=crop&q=80&w=150',
        shippingMethods: ['giao_hang_nhanh', 'giao_hang_tiet_kiem'],
        products: [
            {
                ten: 'iPhone 15 Pro Max 256GB Chính Hãng VNA',
                moTa: 'Siêu phẩm iPhone 15 Pro Max với khung sườn Titan cấp vũ trụ, nút Action mới, chip A17 Pro mạnh mẽ nhất hiện nay và hệ thống camera zoom quang học 5x đẳng cấp.',
                danhMucId: 1, // Điện thoại & Phụ kiện
                gia: 29990000,
                giaKhuyenMai: 28490000,
                tonKho: 50,
                hinhAnh: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Samsung Galaxy S24 Ultra 512GB AI Phone',
                moTa: 'Trải nghiệm đỉnh cao công nghệ với Galaxy AI thế hệ mới: Khoanh tròn để tìm kiếm, Phiên dịch trực tiếp cuộc gọi, Trợ lý ghi chú quyền năng cùng camera mắt thần bóng đêm 200MP.',
                danhMucId: 1, // Điện thoại & Phụ kiện
                gia: 31990000,
                giaKhuyenMai: 27990000,
                tonKho: 35,
                hinhAnh: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Tai nghe chụp tai Bluetooth AirPods Max Premium',
                moTa: 'Sự kết hợp hoàn hảo giữa âm thanh trung thực vượt trội và sự tối giản đặc trưng của nhà Táo. Khử tiếng ồn chủ động (ANC) hàng đầu kết hợp Chế độ xuyên âm tinh tế.',
                danhMucId: 1, // Điện thoại & Phụ kiện
                gia: 12490000,
                giaKhuyenMai: 11290000,
                tonKho: 20,
                hinhAnh: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Sạc Dự Phòng Anker PowerCore Sense 20000mAh PD 20W',
                moTa: 'Dung lượng khủng 20.000mAh giúp sạc đầy iPhone 15 hơn 4 lần. Hỗ trợ sạc nhanh chuẩn Power Delivery (PD) công suất 20W, tương thích đa thiết bị, an toàn tuyệt đối.',
                danhMucId: 1, // Điện thoại & Phụ kiện
                gia: 1250000,
                giaKhuyenMai: 890000,
                tonKho: 120,
                hinhAnh: 'https://images.unsplash.com/photo-1609592424085-fe6400a086cf?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Laptop MacBook Air M3 2024 (8GB RAM / 256GB SSD)',
                moTa: 'Siêu mỏng nhẹ đột phá với sức mạnh vượt trội của chip Apple M3 thế hệ mới. Thời lượng pin cực khủng lên đến 18 tiếng liên tục, màn hình Liquid Retina sắc nét từng chi tiết.',
                danhMucId: 2, // Máy tính & Laptop
                gia: 27990000,
                giaKhuyenMai: 26490000,
                tonKho: 25,
                hinhAnh: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Laptop Gaming ASUS ROG Zephyrus G14 OLED 2024',
                moTa: 'Laptop chơi game mỏng nhẹ đỉnh cao với màn hình ROG Nebula OLED 120Hz siêu sống động. Trang bị AMD Ryzen 9 kết hợp card đồ họa mạnh mẽ RTX 4060 chiến mượt mọi tựa game AAA.',
                danhMucId: 2, // Máy tính & Laptop
                gia: 44990000,
                giaKhuyenMai: 39990000,
                tonKho: 15,
                hinhAnh: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Bàn phím cơ không dây Keychron K2 Pro QMK/VIA Hotswap',
                moTa: 'Bàn phím cơ Custom layout 75% gọn gàng hỗ trợ tùy chỉnh qua phần mềm QMK/VIA. Switch Gateron G Pro Pre-lubed mượt mà, Keycap PBT Double-shot bền bỉ.',
                danhMucId: 2, // Máy tính & Laptop
                gia: 2450000,
                giaKhuyenMai: 1990000,
                tonKho: 80,
                hinhAnh: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Chuột không dây Logitech MX Master 3S Ergonomic',
                moTa: 'Chuột công thái học cao cấp dành cho lập trình viên và nhà thiết kế. Cảm biến 8000 DPI hoạt động trên mọi bề mặt, kể cả kính, cùng con lăn MagSpeed siêu nhanh không tiếng ồn.',
                danhMucId: 2, // Máy tính & Laptop
                gia: 2990000,
                giaKhuyenMai: 2490000,
                tonKho: 65,
                hinhAnh: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=500'
            }
        ]
    },
    {
        email: 'mocfashion@kltn2026.com',
        username: 'mocfashion',
        password: 'fashion123456',
        fullName: 'Mộc Fashion',
        phone: '0922333444',
        shopName: 'Mộc Fashion - Phong Cách Basic',
        shopDesc: 'Mộc Fashion tôn vinh nét đẹp giản đơn, tinh tế với các dòng trang phục tối giản (Basic), chất liệu tự nhiên như Cotton 100%, lanh organic, thân thiện và thoải mái tối đa.',
        address: '456 Nguyễn Trãi, Phường 8, Quận 5, TP. Hồ Chí Minh',
        taxCode: '0312345679',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=150',
        shippingMethods: ['giao_hang_nhanh', 'giao_hang_tiet_kiem'],
        products: [
            {
                ten: 'Áo thun nam Unisex Mộc Basic Cotton 100% Co Giãn',
                moTa: 'Chất liệu thun cotton 100% định lượng cao dày dặn, thấm hút mồ hôi cực tốt. Thiết kế phom suông rộng trẻ trung năng động, đường may viền cổ bo tròn tinh xảo không bai nhão.',
                danhMucId: 3, // Thời trang Nam
                gia: 250000,
                giaKhuyenMai: 189000,
                tonKho: 300,
                hinhAnh: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Quần Jean Nam Slimfit Co Giãn Cao Cấp Mộc Denim',
                moTa: 'Thiết kế phom ôm nhẹ tôn dáng chân, chất vải denim cao cấp pha sợi co giãn nhẹ giúp bạn thoải mái vận động cả ngày. Màu xanh chàm cổ điển dễ phối đồ.',
                danhMucId: 3, // Thời trang Nam
                gia: 490000,
                giaKhuyenMai: 379000,
                tonKho: 150,
                hinhAnh: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Áo Sơ Mi Nam Tay Dài Vải Oxford Nhập Khẩu Mịn Đẹp',
                moTa: 'Chất liệu vải Oxford dày dặn đặc trưng nhưng vô cùng thoáng mát nhờ dệt từ sợi bông tự nhiên. Thích hợp mặc công sở đi làm thanh lịch hoặc dạo phố giản dị.',
                danhMucId: 3, // Thời trang Nam
                gia: 450000,
                giaKhuyenMai: 345000,
                tonKho: 120,
                hinhAnh: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Áo Khoác Gió Bomber Thể Thao Nam Chống Thấm Nước',
                moTa: 'Trang bị công nghệ màng chống gió nước tiên tiến, lót lưới thông hơi bên trong mát mẻ. Phom dáng bomber năng động trẻ trung cực kỳ tôn dáng.',
                danhMucId: 3, // Thời trang Nam
                gia: 550000,
                giaKhuyenMai: 430000,
                tonKho: 90,
                hinhAnh: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Đầm Lụa Nữ Cổ Yếm Dự Tiệc Sang Trọng Mộc Silk',
                moTa: 'Chất liệu lụa satin cao cấp rủ nhẹ bồng bềnh, bóng nhẹ cực kỳ quý phái. Kiểu dáng cổ yếm hở lưng gợi cảm tinh tế, rất tôn dáng khi dự tiệc hay sự kiện.',
                danhMucId: 4, // Thời trang Nữ
                gia: 850000,
                giaKhuyenMai: 589000,
                tonKho: 80,
                hinhAnh: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Chân Váy Chữ A Dáng Xòe Phong Cách Hàn Quốc Thanh Lịch',
                moTa: 'Thiết kế dáng chữ A tôn eo giấu khuyết điểm hông cực tốt, có quần bảo hộ an toàn bên trong. Phù hợp diện đi làm, đi chơi hay đi học đều xinh xắn.',
                danhMucId: 4, // Thời trang Nữ
                gia: 290000,
                giaKhuyenMai: 219000,
                tonKho: 180,
                hinhAnh: 'https://images.unsplash.com/photo-1583496661160-fb488b2c1a82?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Áo Sơ Mi Voan Nữ Cổ Thắt Nơ Điệu Đà Hàn Quốc',
                moTa: 'Chất liệu voan cát mềm mịn không nhăn, nhẹ nhàng bay bổng. Cổ thắt nơ dài duyên dáng, tay bo phồng tinh tế thích hợp cho quý cô công sở thời thượng.',
                danhMucId: 4, // Thời trang Nữ
                gia: 360000,
                giaKhuyenMai: 265000,
                tonKho: 140,
                hinhAnh: 'https://images.unsplash.com/photo-1548624149-f7b316ce8202?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Bộ Pijama Lụa Satin Cao Cấp Nữ Mặc Nhà Dễ Thương',
                moTa: 'Chất lụa satin mềm như nhung, nhẹ tênh mát lạnh mang lại giấc ngủ ngon và thư thái. Họa tiết tối giản tinh tế cùng đường may vô cùng chắc chắn tỉ mỉ.',
                danhMucId: 4, // Thời trang Nữ
                gia: 390000,
                giaKhuyenMai: 310000,
                tonKho: 100,
                hinhAnh: 'https://images.unsplash.com/photo-1562572159-4ebcd318f4dd?auto=format&fit=crop&q=80&w=500'
            }
        ]
    },
    {
        email: 'greenlife@kltn2026.com',
        username: 'greenlife',
        password: 'green123456',
        fullName: 'Green Life Mart',
        phone: '0933444555',
        shopName: 'Green Life - Cửa Hàng Tiêu Dùng Xanh',
        shopDesc: 'Đồng hành cùng lối sống xanh hữu cơ. Cung cấp thiết bị gia dụng tiết kiệm năng lượng, đồ dùng thân thiện môi trường và các thực phẩm dinh dưỡng lành mạnh, organic tốt cho sức khỏe.',
        address: '789 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        taxCode: '0312345680',
        logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150',
        shippingMethods: ['giao_hang_nhanh', 'tu_den_lay'],
        products: [
            {
                ten: 'Nồi Chiên Không Dầu Philips HD9200/90 (4.1 Lít)',
                moTa: 'Công nghệ Rapid Air độc đáo xoáy không khí nóng đều xung quanh thực phẩm giúp giòn rụm bên ngoài và mềm bên trong với lượng chất béo giảm đến 90%. Dung tích 4.1L tiện lợi.',
                danhMucId: 5, // Nhà cửa & Đời sống
                gia: 2490000,
                giaKhuyenMai: 1890000,
                tonKho: 45,
                hinhAnh: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Bình Giữ Nhiệt Lock&Lock Feather Light Inox 500ml',
                moTa: 'Thép không gỉ 316 an toàn tuyệt đối, trọng lượng siêu nhẹ Feather Light. Khả năng giữ nóng lạnh vượt trội lên đến 12 tiếng liên tục. Thiết kế trang nhã hiện đại.',
                danhMucId: 5, // Nhà cửa & Đời sống
                gia: 450000,
                giaKhuyenMai: 295000,
                tonKho: 120,
                hinhAnh: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Đèn Bàn Học LED Chống Cận Thị Thông Minh Taotronics',
                moTa: 'Đèn học có 5 chế độ sáng và 7 mức độ sáng tùy chỉnh nhẹ nhàng. Ánh sáng dịu nhẹ không nhấp nháy chống mỏi và bảo vệ thị lực cho trẻ em học tập hiệu quả.',
                danhMucId: 5, // Nhà cửa & Đời sống
                gia: 650000,
                giaKhuyenMai: 379000,
                tonKho: 85,
                hinhAnh: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Kệ Sách Gỗ Tự Nhiên 5 Tầng Phân Khu Tối Giản Scandinavian',
                moTa: 'Sử dụng chất liệu gỗ thông tự nhiên đã qua xử lý chống mối mọt cong vênh. Thiết kế tháo lắp thông minh đa năng, giúp không gian phòng khách, phòng ngủ thêm ngăn nắp.',
                danhMucId: 5, // Nhà cửa & Đời sống
                gia: 680000,
                giaKhuyenMai: 449000,
                tonKho: 40,
                hinhAnh: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Hạt Điều Rang Muối Vỏ Lụa Organic Bình Phước (500g)',
                moTa: 'Hạt điều size A+ xuất khẩu hạt to tròn mẩy đều, rang củi thủ công giữ trọn vị bùi ngậy tự nhiên. Đảm bảo an toàn vệ sinh thực phẩm, không phẩm màu hóa chất độc hại.',
                danhMucId: 9, // Đồ ăn & Thực phẩm
                gia: 195000,
                giaKhuyenMai: 145000,
                tonKho: 250,
                hinhAnh: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Trà Ô Long Thuần Chủng Cao Nguyên Bảo Lộc Hộp Thiếc (200g)',
                moTa: 'Được tuyển chọn kỹ lưỡng từ búp trà ô long "một búp hai lá" tươi ngon trên độ cao 1200m tại Bảo Lộc. Trà pha cho nước vàng óng, hương thơm thoang thoảng hoa sứ đặc trưng.',
                danhMucId: 9, // Đồ ăn & Thực phẩm
                gia: 160000,
                giaKhuyenMai: 120000,
                tonKho: 150,
                hinhAnh: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Khô Gà Lá Chanh Sấy Giòn Cay Tự Nhiên Đậm Vị (300g)',
                moTa: 'Sợi ức gà tươi xé tơi đượm gia vị tỏi ớt thơm lừng quyện cùng những chiếc lá chanh thái sợi sấy giòn tan thơm mát. Món ăn vặt thơm ngon không thể chối từ.',
                danhMucId: 9, // Đồ ăn & Thực phẩm
                gia: 110000,
                giaKhuyenMai: 850000,
                tonKho: 300,
                hinhAnh: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Mật Ong Hoa Nhãn Nguyên Chất Tây Nguyên Hộp Thủy Tinh (500ml)',
                moTa: 'Mật ong được thu hoạch thủ công vào mùa hoa nhãn thơm lừng vùng núi rừng Tây Nguyên. Đậm đặc tự nhiên, vị ngọt thanh mát rất tốt để tăng đề kháng hay làm gia vị nấu nướng.',
                danhMucId: 9, // Đồ ăn & Thực phẩm
                gia: 250000,
                giaKhuyenMai: 180000,
                tonKho: 180,
                hinhAnh: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=500'
            }
        ]
    },
    {
        email: 'hanabeauty@kltn2026.com',
        username: 'hanabeauty',
        password: 'beauty123456',
        fullName: 'Hana Beauty & Baby',
        phone: '0944555666',
        shopName: 'Hana Beauty & Baby Care',
        shopDesc: 'Thiên đường mua sắm tin cậy cho Mẹ và Bé. Chuyên cung cấp các sản phẩm dưỡng da, mỹ phẩm organic chính hãng cùng với các đồ dùng sơ sinh an toàn, lành tính tuyệt đối cho làn da nhạy cảm của bé.',
        address: '101 Hai Bà Trưng, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
        taxCode: '0312345681',
        logo: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&q=80&w=150',
        shippingMethods: ['giao_hang_nhanh', 'giao_hang_tiet_kiem'],
        products: [
            {
                ten: 'Sữa Rửa Mặt Dịu Nhẹ Cetaphil Gentle Skin Cleanser (500ml)',
                moTa: 'Sản phẩm rửa mặt dịu nhẹ kinh điển được các bác sĩ da liễu khuyên dùng. Công thức không chứa xà phòng, duy trì độ ẩm tự nhiên cho mọi loại da, đặc biệt là da mụn nhạy cảm.',
                danhMucId: 6, // Sức khỏe & Làm đẹp
                gia: 350000,
                giaKhuyenMai: 285000,
                tonKho: 110,
                hinhAnh: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Kem Chống Nắng La Roche-Posay Anthelios Oil Control (50ml)',
                moTa: 'Công nghệ chống nắng màng lọc độc quyền XL-PROTECT bảo vệ da tối ưu dưới tia UVA/UVB và bụi mịn. Kết cấu gel-cream khô thoáng tức thì, kiềm dầu vượt trội lên tới 8 tiếng.',
                danhMucId: 6, // Sức khỏe & Làm đẹp
                gia: 520000,
                giaKhuyenMai: 425000,
                tonKho: 90,
                hinhAnh: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Serum Phục Hồi Chống Lão Hóa Ban Đêm Estee Lauder Advanced (50ml)',
                moTa: 'Tinh chất phục hồi số 1 thế giới với công nghệ Chronolux Power Signal độc quyền. Đẩy nhanh quá trình tái tạo tế bào, làm mờ nếp nhăn giúp làn da căng bóng mịn màng rõ rệt sau 1 đêm.',
                danhMucId: 6, // Sức khỏe & Làm đẹp
                gia: 2990000,
                giaKhuyenMai: 2150000,
                tonKho: 30,
                hinhAnh: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Son Thỏi Lì Siêu Mịn Môi Dưỡng Ẩm 3CE Velvet Lip Tint',
                moTa: 'Dòng son kem lì Velvet Lip Tint huyền thoại nhà 3CE với tông màu trendy cực đẹp. Chất son xốp mịn lướt mượt như nhung, độ bền màu cao mà không hề gây khô môi.',
                danhMucId: 6, // Sức khỏe & Làm đẹp
                gia: 390000,
                giaKhuyenMai: 310000,
                tonKho: 120,
                hinhAnh: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Tã Dán Sơ Sinh Moony Natural Nội Địa Nhật Size S (58 Miếng)',
                moTa: 'Tã dán Moony siêu cao cấp thế hệ mới sở hữu bề mặt bông hữu cơ organic đầu tiên tại Nhật Bản siêu êm mềm. Có tính axit yếu bảo vệ làn da non nớt nhạy cảm nhất của bé.',
                danhMucId: 10, // Mẹ & Bé
                gia: 450000,
                giaKhuyenMai: 385000,
                tonKho: 100,
                hinhAnh: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Tinh Dầu Tràm Nguyên Chất Mộc Nhiên Cho Em Bé (50ml)',
                moTa: 'Chưng cất lôi cuốn hơi nước từ lá tràm gió tự nhiên 100%. Hương thơm dịu nhẹ ấm nồng giữ ấm lồng ngực bé, tránh gió cảm lạnh, phòng ho và xua đuổi côn trùng đốt.',
                danhMucId: 10, // Mẹ & Bé
                gia: 140000,
                giaKhuyenMai: 95000,
                tonKho: 150,
                hinhAnh: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Sữa Công Thức Similac Newborn Số 1 Phát Triển Trí Não (900g)',
                moTa: 'Dành riêng cho bé sơ sinh từ 0 đến 6 tháng tuổi. Công thức đột phá bổ sung 5HMO và hệ dưỡng chất IQ Plus giúp bé tăng đề kháng vượt trội, tiêu hóa tốt và phát triển não bộ tối ưu.',
                danhMucId: 10, // Mẹ & Bé
                gia: 580000,
                giaKhuyenMai: 520000,
                tonKho: 60,
                hinhAnh: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=500'
            },
            {
                ten: 'Máy Hút Sữa Điện Đôi Không Dây Rảnh Tay FatzBaby Chorus 2',
                moTa: 'Không dây cồng kềnh giúp mẹ vừa hút sữa vừa có thể làm việc nhà vô cùng tiện lợi. Tích hợp 3 chế độ: Massage kích sữa, hút sữa sâu và chế độ hút tự động với lực hút êm ái.',
                danhMucId: 10, // Mẹ & Bé
                gia: 1790000,
                giaKhuyenMai: 1450000,
                tonKho: 25,
                hinhAnh: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=500'
            }
        ]
    }
];

async function seedData() {
    console.log('🔄 BẮT ĐẦU QUÁ TRÌNH SEED DỮ LIỆU CÁC SHOP VÀ SẢN PHẨM MẪU...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        charset: 'utf8mb4'
    });

    console.log('✅ Đã kết nối MySQL thành công.');

    try {
        // Thực hiện trong một transaction để đảm bảo dữ liệu toàn vẹn
        await connection.beginTransaction();
        console.log('🔄 Đang bắt đầu Giao dịch CSDL (Transaction)...');

        for (const s of shopsData) {
            console.log(`\n---------------------------------------------------------`);
            console.log(`🤖 Xử lý Shop: ${s.shopName}`);

            // 1. Kiểm tra tài khoản cũ và dọn dẹp để đảm bảo kịch bản chạy lại nhiều lần (re-runnable)
            const [existingUsers] = await connection.query(
                'SELECT id FROM nguoi_dung WHERE email = ?',
                [s.email]
            );

            if (existingUsers.length > 0) {
                const userId = existingUsers[0].id;
                console.log(`⚠️  Tài khoản ${s.email} đã tồn tại (ID: ${userId}). Tiến hành làm sạch dữ liệu cũ...`);

                // Lấy shop_id để dọn dẹp gian_hang
                const [existingShops] = await connection.query(
                    'SELECT id FROM shop WHERE nguoi_ban_id = ?',
                    [userId]
                );

                if (existingShops.length > 0) {
                    const shopId = existingShops[0].id;

                    // Lấy gian_hang_id để dọn dẹp sản phẩm
                    const [existingGhs] = await connection.query(
                        'SELECT id FROM gian_hang WHERE shop_id = ?',
                        [shopId]
                    );

                    if (existingGhs.length > 0) {
                        const ghId = existingGhs[0].id;
                        // Xóa các sản phẩm
                        await connection.query('DELETE FROM san_pham WHERE gian_hang_id = ?', [ghId]);
                        console.log(`  - Đã xóa sản phẩm cũ của gian hàng ID: ${ghId}`);
                        
                        // Xóa gian hàng
                        await connection.query('DELETE FROM gian_hang WHERE id = ?', [ghId]);
                        console.log(`  - Đã xóa gian hàng cũ ID: ${ghId}`);
                    }

                    // Xóa shop
                    await connection.query('DELETE FROM shop WHERE id = ?', [shopId]);
                    console.log(`  - Đã xóa thông tin shop cũ ID: ${shopId}`);
                }

                // Xóa tài khoản
                await connection.query('DELETE FROM nguoi_dung WHERE id = ?', [userId]);
                console.log(`  - Đã xóa tài khoản cũ ID: ${userId}`);
            }

            // 2. Mã hóa mật khẩu cho tài khoản mới
            const hashedPassword = await bcrypt.hash(s.password, 10);
            
            // 3. Insert tài khoản người dùng vào nguoi_dung
            const [userInsert] = await connection.query(
                `INSERT INTO nguoi_dung (ho_ten, email, mat_khau, so_dien_thoai, vai_tro, trang_thai, ten_dang_nhap, trang_thai_xac_thuc, ngay_xac_thuc) 
                 VALUES (?, ?, ?, ?, 'seller', 'active', ?, 'verified', NOW())`,
                [s.fullName, s.email, hashedPassword, s.phone, s.username]
            );
            const newUserId = userInsert.insertId;
            console.log(`✅ Đã tạo tài khoản người bán thành công (ID: ${newUserId}, Username: ${s.username})`);

            // 4. Insert thông tin chi tiết vào bảng shop
            // Phân vận chuyển là JSON String
            const shippingJson = JSON.stringify(s.shippingMethods);
            const [shopInsert] = await connection.query(
                `INSERT INTO shop (nguoi_ban_id, ten_shop, mo_ta, logo, dia_chi_kho, phuong_thuc_van_chuyen, ma_so_thue, trang_thai, ngay_duyet, admin_duyet_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), 1)`,
                [newUserId, s.shopName, s.shopDesc, s.logo, s.address, shippingJson, s.taxCode]
            );
            const newShopId = shopInsert.insertId;
            console.log(`✅ Đã tạo hồ sơ Shop chi tiết thành công (ID: ${newShopId})`);

            // 5. Insert thông tin gian hàng hiển thị ra public (bảng gian_hang)
            const [ghInsert] = await connection.query(
                `INSERT INTO gian_hang (nguoi_ban_id, ten_gian_hang, mo_ta, logo, dia_chi, trang_thai, shop_id) 
                 VALUES (?, ?, ?, ?, ?, 'active', ?)`,
                [newUserId, s.shopName, s.shopDesc, s.logo, s.address, newShopId]
            );
            const newGhId = ghInsert.insertId;
            console.log(`✅ Đã tạo Gian Hàng công khai hiển thị thành công (ID: ${newGhId})`);

            // 6. Insert hàng loạt sản phẩm phân loại của Shop
            console.log(`📦 Bắt đầu thêm ${s.products.length} sản phẩm mẫu đã phân loại...`);
            for (const p of s.products) {
                await connection.query(
                    `INSERT INTO san_pham (gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'approved')`,
                    [newGhId, p.danhMucId, p.ten, p.moTa, p.gia, p.giaKhuyenMai || null, p.tonKho, p.hinhAnh]
                );
            }
            console.log(`✅ Đã thêm toàn bộ sản phẩm của ${s.shopName} thành công.`);
        }

        // Commit transaction
        await connection.commit();
        console.log('\n=========================================================');
        console.log('🌱 TRANSACTION THÀNH CÔNG: TẤT CẢ GIAN HÀNG & SẢN PHẨM ĐÃ ĐƯỢC THÊM VÀO CSDL VÀ DUYỆT TỰ ĐỘNG! 🎉');

    } catch (err) {
        // Rollback if error occurs
        await connection.rollback();
        console.error('\n❌ LỖI TRONG QUÁ TRÌNH SEED DỮ LIỆU. ĐÃ ROLLBACK GIAO DỊCH CSDL:', err.message);
    } finally {
        await connection.end();
        console.log('🔌 Đã ngắt kết nối MySQL.');
        process.exit(0);
    }
}

seedData();
