USE KLTN2026;

-- ===== CẬP NHẬT SẢN PHẨM CŨ THÀNH 'approved' =====
UPDATE san_pham SET trang_thai_duyet = 'approved' WHERE trang_thai_duyet IS NULL OR trang_thai_duyet = 'pending';
UPDATE nguoi_dung SET trang_thai_xac_thuc = 'verified' WHERE vai_tro = 'seller';

-- ===== THÊM SẢN PHẨM MỚI THEO TỪNG DANH MỤC =====

-- Danh mục 1: Điện thoại & Phụ kiện
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(17, 1, 1, 'Xiaomi 14 Pro 5G 256GB', 'Xiaomi 14 Pro chip Snapdragon 8 Gen 3, camera Leica 50MP, sạc siêu nhanh 120W, màn hình LTPO AMOLED 6.73 inch.', 20990000, 18490000, 40, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&h=500&fit=crop', 'active', 'approved', 870),
(18, 1, 1, 'Ốp lưng iPhone 15 Pro chính hãng', 'Ốp lưng silicon chính hãng Apple cho iPhone 15 Pro, chất liệu silicone cao cấp, nhiều màu sắc.', 890000, 690000, 150, 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=500&h=500&fit=crop', 'active', 'approved', 430),
(19, 1, 1, 'Kính cường lực iPhone 15 Series', 'Kính cường lực AGC Nhật Bản, độ cứng 9H, viền đen, bảo vệ màn hình tối đa. Phù hợp iPhone 15/15 Pro/15 Pro Max.', 150000, 99000, 500, 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=500&h=500&fit=crop', 'active', 'approved', 1200);

-- Danh mục 2: Máy tính & Laptop
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(20, 1, 2, 'Màn hình Gaming LG 27GP850 27 inch', 'Màn hình 27 inch QHD 165Hz, 1ms, IPS, G-Sync Compatible, lý tưởng cho gaming và thiết kế.', 8490000, 7290000, 25, 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=500&h=500&fit=crop', 'active', 'approved', 560),
(21, 1, 2, 'SSD Samsung 970 EVO Plus 1TB', 'Ổ cứng SSD NVMe M.2, tốc độ đọc 3500MB/s, ghi 3300MB/s. Nâng cấp hiệu năng máy tính vượt trội.', 2190000, 1790000, 60, 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&h=500&fit=crop', 'active', 'approved', 780),
(22, 1, 2, 'RAM DDR5 Kingston Fury 32GB', 'RAM DDR5 32GB (2x16GB) 5600MHz CL36, dành cho nền tảng Intel 12th/13th gen và AMD Ryzen 7000.', 2890000, 2390000, 45, 'https://images.unsplash.com/photo-1562976540-1502c2145901?w=500&h=500&fit=crop', 'active', 'approved', 340);

-- Danh mục 3: Thời trang Nam
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(23, 2, 3, 'Áo polo nam Oxford cao cấp', 'Áo polo nam chất liệu Oxford premium, form slim fit hiện đại, cổ bẻ, thoáng mát và lịch sự.', 450000, 320000, 120, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&h=500&fit=crop', 'active', 'approved', 650),
(24, 2, 3, 'Áo khoác bomber nam Hàn Quốc', 'Áo khoác bomber nam phong cách Hàn Quốc, chất liệu gió kết hợp lót lông, giữ ấm tốt, thiết kế trẻ trung.', 590000, 420000, 80, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&h=500&fit=crop', 'active', 'approved', 490),
(25, 2, 3, 'Quần short nam thể thao Nike', 'Quần short nam thể thao Nike Dri-FIT, thoáng khí, thấm hút mồ hôi tốt. Phù hợp tập gym, chạy bộ.', 390000, 290000, 150, 'https://images.unsplash.com/photo-1562183241-840b8af0721e?w=500&h=500&fit=crop', 'active', 'approved', 380);

-- Danh mục 4: Thời trang Nữ
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(26, 2, 4, 'Váy midi hoa nhí Vintage', 'Váy midi dáng xòe hoa nhí phong cách vintage, vải voan mềm mại, thích hợp dạo phố và đi chơi cuối tuần.', 380000, 280000, 90, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&h=500&fit=crop', 'active', 'approved', 520),
(27, 2, 4, 'Áo sơ mi nữ lụa cao cấp', 'Áo sơ mi nữ chất liệu lụa mềm mại, dáng suông thanh lịch, phù hợp đi làm và các buổi gặp gỡ quan trọng.', 520000, 380000, 70, 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=500&h=500&fit=crop', 'active', 'approved', 410);

-- Danh mục 5: Nhà cửa & Đời sống
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(28, 2, 5, 'Đèn LED thông minh Philips Hue', 'Bóng đèn LED thông minh Philips Hue, điều khiển qua app, 16 triệu màu sắc, tương thích Alexa & Google Home.', 890000, 720000, 100, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop', 'active', 'approved', 460),
(29, 2, 5, 'Nồi cơm điện Panasonic 1.8L', 'Nồi cơm điện Panasonic 1.8L, nấu cơm ngon, giữ ấm tự động, dễ vệ sinh. Phù hợp gia đình 4-6 người.', 1290000, 990000, 55, 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=500&h=500&fit=crop', 'active', 'approved', 320),
(30, 2, 5, 'Máy lọc không khí Xiaomi 4 Pro', 'Máy lọc không khí Xiaomi 4 Pro, lọc bụi mịn PM2.5, diệt khuẩn, khử mùi, phòng đến 48m². Kết nối WiFi.', 3490000, 2890000, 30, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&h=500&fit=crop', 'active', 'approved', 580);

-- Danh mục 6: Sức khỏe & Làm đẹp
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(31, 2, 6, 'Kem chống nắng Anessa SPF50+ 90ml', 'Kem chống nắng Anessa Perfect UV Sunscreen SPF50+ PA++++, chống nắng vật lý và hóa học, không dầu.', 490000, 390000, 200, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=500&fit=crop', 'active', 'approved', 1100),
(32, 2, 6, 'Son môi Laneige Lip Sleeping Mask', 'Mặt nạ son ngủ Laneige, dưỡng ẩm và phục hồi môi thâm, nhiều hương thơm tự nhiên. 20g.', 380000, 299000, 180, 'https://images.unsplash.com/photo-1631214524020-3c69f3c0e6cb?w=500&h=500&fit=crop', 'active', 'approved', 890);

-- Danh mục 7: Sách & Văn phòng phẩm
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(33, 2, 7, 'Sách Đắc Nhân Tâm - Dale Carnegie', 'Cuốn sách kinh điển về kỹ năng giao tiếp và ảnh hưởng con người. Bản dịch tiếng Việt chất lượng cao, bìa cứng.', 125000, 89000, 300, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop', 'active', 'approved', 750),
(34, 2, 7, 'Bộ bút bi Thiên Long xanh 20c', 'Bộ 20 bút bi Thiên Long TL-027, mực xanh, ngòi 0.7mm, viết mượt, không lem. Dùng cho học sinh và văn phòng.', 45000, 35000, 1000, 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&h=500&fit=crop', 'active', 'approved', 430);

-- Danh mục 8: Thể thao & Du lịch
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(35, 2, 8, 'Vợt cầu lông Yonex Nanoflare 1000Z', 'Vợt cầu lông Yonex Nanoflare 1000Z, khung carbon, nhẹ 62g, phù hợp cầu thủ tấn công tốc độ cao.', 4590000, 3990000, 20, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500&h=500&fit=crop', 'active', 'approved', 290),
(36, 2, 8, 'Giày chạy bộ Adidas Ultraboost 22', 'Giày chạy bộ Adidas Ultraboost 22, đế BOOST êm ái, upper Primeknit thoáng khí, ôm chân hoàn hảo.', 3290000, 2590000, 35, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop', 'active', 'approved', 680);

-- Danh mục 9: Đồ ăn & Thực phẩm
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(37, 2, 9, 'Cà phê rang xay Trung Nguyên Legend', 'Cà phê rang xay Trung Nguyên Legend hộp 500g, pha phin hoặc máy pha. Hương thơm đặc trưng vùng Tây Nguyên.', 185000, 155000, 500, 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=500&h=500&fit=crop', 'active', 'approved', 920),
(38, 2, 9, 'Trà xanh Thái Nguyên túi lọc 50 gói', 'Trà xanh Thái Nguyên tự nhiên, không phẩm màu, hộp 50 túi lọc tiện lợi. Tốt cho sức khỏe và giải nhiệt.', 95000, 75000, 800, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&h=500&fit=crop', 'active', 'approved', 560);

-- Danh mục 10: Mẹ & Bé
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, trang_thai_duyet, luot_xem) VALUES
(39, 2, 10, 'Xe đẩy em bé Joie Litetrax 4', 'Xe đẩy em bé Joie Litetrax 4, gấp gọn một tay, bánh xe địa hình, trọng lượng 7.7kg. An toàn cho bé từ 0-25kg.', 5290000, 4290000, 15, 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=500&h=500&fit=crop', 'active', 'approved', 240),
(40, 2, 10, 'Sữa Aptamil Profutura số 3 900g', 'Sữa bột Aptamil Profutura số 3 dành cho trẻ 1-3 tuổi, bổ sung DHA, ARA, Prebiotics hỗ trợ phát triển trí não.', 620000, 520000, 80, 'https://images.unsplash.com/photo-1632349558560-5b9f38f06ad3?w=500&h=500&fit=crop', 'active', 'approved', 410);

SELECT CONCAT('Đã cập nhật và thêm sản phẩm thành công! Tổng sản phẩm: ', COUNT(*)) as result FROM san_pham WHERE trang_thai_duyet = 'approved';
