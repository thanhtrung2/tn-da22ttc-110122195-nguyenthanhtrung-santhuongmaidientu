-- =====================================================
-- DỮ LIỆU MẪU - SÀN THƯƠNG MẠI ĐIỆN TỬ KLTN2026
-- Chạy file này SAU khi đã chạy schema.sql
-- =====================================================

USE KLTN2026;

-- ===== NGƯỜI DÙNG MẪU =====
-- Password cho tất cả: 123456
-- Hash bcrypt của '123456': $2a$10$rQZ8K5.mH3PQeY3H1F9vDOr8hKvL5xM0nH.J3vL5QqM2H9K5xN0Oy

-- Admin (nếu chưa có)
INSERT IGNORE INTO nguoi_dung (id, ho_ten, email, mat_khau, so_dien_thoai, vai_tro, trang_thai)
VALUES (1, 'Admin Hệ Thống', 'admin@kltn2026.com', '$2a$10$8K1p/a0dR1xqM8K7MQ9oE.9FqN5K8b3i7CbZmLg3j0Q4HpVFR7xW2', '0900000001', 'admin', 'active');

-- Seller 1
INSERT IGNORE INTO nguoi_dung (id, ho_ten, email, mat_khau, so_dien_thoai, vai_tro, trang_thai)
VALUES (2, 'Nguyễn Văn Bán', 'seller1@kltn2026.com', '$2a$10$8K1p/a0dR1xqM8K7MQ9oE.9FqN5K8b3i7CbZmLg3j0Q4HpVFR7xW2', '0900000002', 'seller', 'active');

-- Seller 2
INSERT IGNORE INTO nguoi_dung (id, ho_ten, email, mat_khau, so_dien_thoai, vai_tro, trang_thai)
VALUES (3, 'Trần Thị Shop', 'seller2@kltn2026.com', '$2a$10$8K1p/a0dR1xqM8K7MQ9oE.9FqN5K8b3i7CbZmLg3j0Q4HpVFR7xW2', '0900000003', 'seller', 'active');

-- Customer 1
INSERT IGNORE INTO nguoi_dung (id, ho_ten, email, mat_khau, so_dien_thoai, dia_chi, vai_tro, trang_thai)
VALUES (4, 'Lê Văn Mua', 'customer1@kltn2026.com', '$2a$10$8K1p/a0dR1xqM8K7MQ9oE.9FqN5K8b3i7CbZmLg3j0Q4HpVFR7xW2', '0900000004', '123 Nguyễn Du, Q.1, TP.HCM', 'customer', 'active');

-- Customer 2
INSERT IGNORE INTO nguoi_dung (id, ho_ten, email, mat_khau, so_dien_thoai, dia_chi, vai_tro, trang_thai)
VALUES (5, 'Phạm Thị Khách', 'customer2@kltn2026.com', '$2a$10$8K1p/a0dR1xqM8K7MQ9oE.9FqN5K8b3i7CbZmLg3j0Q4HpVFR7xW2', '0900000005', '456 Lê Lợi, Q.3, TP.HCM', 'customer', 'active');


-- ===== DANH MỤC (nếu chưa có) =====
INSERT IGNORE INTO danh_muc (id, ten_danh_muc, mo_ta) VALUES
(1, 'Điện thoại & Phụ kiện', 'Điện thoại di động, phụ kiện điện thoại'),
(2, 'Máy tính & Laptop', 'Máy tính bàn, laptop, linh kiện máy tính'),
(3, 'Thời trang Nam', 'Quần áo, giày dép, phụ kiện nam'),
(4, 'Thời trang Nữ', 'Quần áo, giày dép, phụ kiện nữ'),
(5, 'Nhà cửa & Đời sống', 'Đồ gia dụng, nội thất, trang trí'),
(6, 'Sức khỏe & Làm đẹp', 'Mỹ phẩm, chăm sóc cá nhân'),
(7, 'Sách & Văn phòng phẩm', 'Sách, vở, dụng cụ văn phòng'),
(8, 'Thể thao & Du lịch', 'Dụng cụ thể thao, đồ du lịch'),
(9, 'Đồ ăn & Thực phẩm', 'Thực phẩm, đồ uống, gia vị'),
(10, 'Mẹ & Bé', 'Đồ dùng cho mẹ và bé');

-- ===== GIAN HÀNG =====
INSERT IGNORE INTO gian_hang (id, nguoi_ban_id, ten_gian_hang, mo_ta, dia_chi, trang_thai) VALUES
(1, 2, 'Tech Store VN', 'Chuyên cung cấp các sản phẩm công nghệ chính hãng, giá tốt nhất thị trường. Bảo hành uy tín.', '789 Trần Hưng Đạo, Q.5, TP.HCM', 'active'),
(2, 3, 'Fashion Queen', 'Thời trang nữ cao cấp, phong cách hiện đại. Cam kết chất lượng, đổi trả trong 7 ngày.', '321 Cách Mạng Tháng 8, Q.10, TP.HCM', 'active');

-- ===== SẢN PHẨM =====

-- Sản phẩm của Tech Store VN (gian_hang_id = 1)
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, luot_xem) VALUES
(1, 1, 1, 'iPhone 15 Pro Max 256GB', 'iPhone 15 Pro Max với chip A17 Pro, camera 48MP, màn hình Super Retina XDR 6.7 inch. Thiết kế titan cao cấp, pin trâu cả ngày.', 32990000, 29990000, 50, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop', 'active', 1250),

(2, 1, 1, 'Samsung Galaxy S24 Ultra', 'Galaxy S24 Ultra với AI tích hợp, camera 200MP, bút S Pen, màn hình Dynamic AMOLED 2X 6.8 inch. Hiệu năng đỉnh cao.', 31990000, 28490000, 35, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&h=500&fit=crop', 'active', 980),

(3, 1, 2, 'Laptop MacBook Air M3 15 inch', 'MacBook Air M3 chip mới nhất, 16GB RAM, 512GB SSD, màn hình Liquid Retina 15.3 inch. Siêu mỏng, siêu nhẹ.', 37990000, 34990000, 20, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop', 'active', 750),

(4, 1, 2, 'Laptop ASUS ROG Strix G16', 'Laptop gaming ASUS ROG Strix G16, Intel i7-13650HX, RTX 4060, RAM 16GB, SSD 512GB. Hiệu năng mạnh mẽ cho game thủ.', 28990000, 25990000, 15, 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&h=500&fit=crop', 'active', 620),

(5, 1, 1, 'Tai nghe AirPods Pro 2 USB-C', 'AirPods Pro 2 với cổng USB-C, chống ồn chủ động, âm thanh không gian. Pin 6 giờ, hộp sạc 30 giờ.', 6790000, 5990000, 100, 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&h=500&fit=crop', 'active', 1500),

(6, 1, 1, 'Sạc dự phòng Anker 20000mAh', 'Pin sạc dự phòng Anker PowerCore 20000mAh, sạc nhanh 22.5W, 2 cổng USB-A + USB-C. Nhỏ gọn, bền bỉ.', 790000, 590000, 200, 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&h=500&fit=crop', 'active', 2100),

(7, 1, 2, 'Chuột Gaming Logitech G502 X', 'Chuột gaming Logitech G502 X LIGHTSPEED, sensor HERO 25K, switch LIGHTFORCE hybrid, 13 nút lập trình.', 2490000, 1990000, 80, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&h=500&fit=crop', 'active', 890),

(8, 1, 2, 'Bàn phím cơ Keychron K8 Pro', 'Bàn phím cơ Keychron K8 Pro 87 phím, switch Gateron G Pro, đèn RGB, kết nối Bluetooth 5.1 + USB-C.', 2390000, NULL, 60, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&h=500&fit=crop', 'active', 670);


-- Sản phẩm của Fashion Queen (gian_hang_id = 2)
INSERT IGNORE INTO san_pham (id, gian_hang_id, danh_muc_id, ten_san_pham, mo_ta, gia, gia_khuyen_mai, so_luong_ton, hinh_anh, trang_thai, luot_xem) VALUES
(9, 2, 4, 'Đầm dạ hội satin cao cấp', 'Đầm dạ hội satin mềm mại, thiết kế sang trọng, phù hợp cho các buổi tiệc và sự kiện quan trọng. Màu đen thanh lịch.', 1290000, 890000, 30, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=500&fit=crop', 'active', 450),

(10, 2, 4, 'Áo blazer nữ Hàn Quốc', 'Áo blazer nữ phong cách Hàn Quốc, chất liệu tweed cao cấp. Phù hợp đi làm, đi chơi. Nhiều màu sắc.', 650000, 490000, 80, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&h=500&fit=crop', 'active', 380),

(11, 2, 4, 'Túi xách nữ da PU thời trang', 'Túi xách nữ da PU cao cấp, thiết kế thanh lịch, nhiều ngăn tiện dụng. Phù hợp đi làm và đi chơi.', 450000, 350000, 120, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop', 'active', 520),

(12, 2, 6, 'Set skincare dưỡng da ban đêm', 'Bộ sản phẩm dưỡng da ban đêm gồm: Sữa rửa mặt, toner, serum, kem dưỡng. Chiết xuất thiên nhiên, phù hợp mọi loại da.', 890000, 690000, 45, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&h=500&fit=crop', 'active', 720),

(13, 2, 4, 'Giày cao gót nữ 7cm thanh lịch', 'Giày cao gót nữ 7cm, chất liệu da mềm, đế cao su chống trượt. Thiết kế mũi nhọn sang trọng.', 550000, 420000, 60, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&h=500&fit=crop', 'active', 340),

(14, 2, 3, 'Áo thun nam Premium Cotton', 'Áo thun nam chất liệu 100% cotton Premium, mềm mại thoáng khí. Form regular fit, phù hợp mọi dáng người.', 290000, 190000, 200, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop', 'active', 890),

(15, 2, 3, 'Quần jean nam slim fit', 'Quần jean nam slim fit, chất liệu denim co giãn nhẹ, thoải mái khi vận động. Wash nhẹ trẻ trung.', 490000, 390000, 100, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&h=500&fit=crop', 'active', 560),

(16, 2, 8, 'Ba lô du lịch chống nước 40L', 'Ba lô du lịch chống nước 40L, nhiều ngăn tiện dụng, đệm lưng thoáng khí, dây đai chịu lực tốt.', 690000, 490000, 40, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop', 'active', 410);


-- ===== ĐƠN HÀNG MẪU =====
INSERT IGNORE INTO don_hang (id, nguoi_mua_id, gian_hang_id, tong_tien, dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan, trang_thai_thanh_toan, trang_thai, ma_giao_dich, ghi_chu) VALUES
(1, 4, 1, 35980000, '123 Nguyễn Du, Q.1, TP.HCM', '0900000004', 'cod', 'paid', 'hoan_thanh', 'DH20260401001', 'Giao giờ hành chính'),
(2, 5, 2, 1380000, '456 Lê Lợi, Q.3, TP.HCM', '0900000005', 'vnpay', 'paid', 'hoan_thanh', 'DH20260402001', NULL),
(3, 4, 2, 490000, '123 Nguyễn Du, Q.1, TP.HCM', '0900000004', 'cod', 'pending', 'cho_xac_nhan', 'DH20260405001', 'Giao buổi sáng'),
(4, 5, 1, 5990000, '456 Lê Lợi, Q.3, TP.HCM', '0900000005', 'momo', 'paid', 'dang_giao', 'DH20260406001', NULL);


-- ===== CHI TIẾT ĐƠN HÀNG =====
INSERT IGNORE INTO chi_tiet_don_hang (id, don_hang_id, san_pham_id, so_luong, gia) VALUES
(1, 1, 1, 1, 29990000),  -- iPhone 15 Pro Max
(2, 1, 5, 1, 5990000),   -- AirPods Pro 2
(3, 2, 9, 1, 890000),    -- Đầm dạ hội
(4, 2, 10, 1, 490000),   -- Áo blazer
(5, 3, 10, 1, 490000),   -- Áo blazer (đơn mới)
(6, 4, 5, 1, 5990000);   -- AirPods Pro 2


-- ===== ĐÁNH GIÁ MẪU =====
INSERT IGNORE INTO danh_gia (id, san_pham_id, nguoi_mua_id, don_hang_id, so_sao, binh_luan) VALUES
(1, 1, 4, 1, 5, 'Sản phẩm chính hãng, đóng gói cẩn thận, giao hàng nhanh. Rất hài lòng!'),
(2, 5, 4, 1, 4, 'Tai nghe chất lượng tốt, chống ồn hiệu quả. Trừ 1 sao vì giao hơi chậm.'),
(3, 9, 5, 2, 5, 'Đầm đẹp lắm, chất vải mềm mịn. Mặc lên sang trọng. Sẽ ủng hộ shop tiếp!'),
(4, 10, 5, 2, 4, 'Áo blazer đẹp, đúng mẫu. Form hơi rộng 1 chút nhưng vẫn ok.');


-- ===== KHUYẾN MÃI MẪU =====
INSERT IGNORE INTO khuyen_mai (id, gian_hang_id, ten_khuyen_mai, mo_ta, loai, gia_tri, ngay_bat_dau, ngay_ket_thuc, trang_thai) VALUES
(1, 1, 'Flash Sale Công Nghệ', 'Giảm giá sốc cho tất cả sản phẩm công nghệ', 'phan_tram', 15, '2026-04-01', '2026-04-30', 'active'),
(2, 2, 'Mua 2 Giảm 10%', 'Áp dụng khi mua từ 2 sản phẩm thời trang trở lên', 'phan_tram', 10, '2026-04-01', '2026-05-31', 'active');

SELECT 'Dữ liệu mẫu đã được thêm thành công!' AS result;
