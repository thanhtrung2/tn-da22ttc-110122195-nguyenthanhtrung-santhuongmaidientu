-- =====================================================
-- DỮ LIỆU MẪU - SÀN THƯƠNG MẠI ĐIỆN TỬ KLTN2026
-- =====================================================

USE KLTN2026;

-- ===== NGƯỜI DÙNG MẪU =====
-- Password: 123456 (hash: $2a$10$8K1p/a0dR1xqM8K7MQ9oE.9FqN5K8b3i7CbZmLg3j0Q4HpVFR7xW2)

-- Admin
INSERT IGNORE INTO nguoi_dung (id, ho_ten, email, mat_khau, so_dien_thoai, vai_tro, trang_thai)
VALUES (1, 'Admin Hệ Thống', 'admin@kltn2026.com', '$2a$10$8K1p/a0dR1xqM8K7MQ9oE.9FqN5K8b3i7CbZmLg3j0Q4HpVFR7xW2', '0900000001', 'admin', 'active');

-- Customer để test đăng ký seller
INSERT IGNORE INTO nguoi_dung (id, ho_ten, email, mat_khau, so_dien_thoai, vai_tro, trang_thai)
VALUES (2, 'Nguyễn Văn Test', 'test@gmail.com', '$2a$10$8K1p/a0dR1xqM8K7MQ9oE.9FqN5K8b3i7CbZmLg3j0Q4HpVFR7xW2', '0900000002', 'customer', 'active');

-- ===== DANH MỤC =====
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

-- ===== NOTE: Sản phẩm và gian hàng sẽ được tạo khi seller đăng ký và đăng sản phẩm =====
-- Admin cần duyệt seller trước khi họ có thể đăng sản phẩm