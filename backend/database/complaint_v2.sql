-- =====================================================
-- NÂNG CẤP BẢNG KHIẾU NẠI - KHIẾU NẠI 3 BÊN (v2)
-- Chạy script này 1 lần để migrate DB
-- =====================================================

USE KLTN2026;

-- Thêm gian_hang_id để seller truy vấn dễ hơn
ALTER TABLE khieu_nai
  ADD COLUMN gian_hang_id INT NULL AFTER don_hang_id,
  ADD FOREIGN KEY fk_kn_gian_hang (gian_hang_id) REFERENCES gian_hang(id) ON DELETE SET NULL;

-- Ảnh minh chứng của khách (JSON array paths)
ALTER TABLE khieu_nai
  ADD COLUMN anh_minh_chung JSON NULL AFTER mo_ta;

-- Kết quả thỏa thuận seller đề xuất
ALTER TABLE khieu_nai
  ADD COLUMN de_xuat_seller ENUM('bu_hang','doi_tra','hoan_tien') NULL AFTER anh_minh_chung,
  ADD COLUMN ghi_chu_seller TEXT NULL AFTER de_xuat_seller;

-- Xác nhận từ khách hàng
ALTER TABLE khieu_nai
  ADD COLUMN ket_qua_thuong_luong ENUM('dong_y','khong_dong_y') NULL AFTER ghi_chu_seller;

-- Admin xử lý
ALTER TABLE khieu_nai
  ADD COLUMN xu_ly_admin_id INT NULL AFTER phan_hoi_admin,
  ADD COLUMN quyet_dinh_admin ENUM('chot_ho_so','cuong_che_hoan_tien') NULL AFTER xu_ly_admin_id,
  ADD COLUMN ngay_xu_ly TIMESTAMP NULL AFTER quyet_dinh_admin;

-- Mở rộng ENUM trang_thai
-- MySQL không cho ALTER ENUM trực tiếp, cần MODIFY COLUMN
ALTER TABLE khieu_nai
  MODIFY COLUMN trang_thai ENUM(
    'cho_xu_ly',
    'dang_thuong_luong',
    'da_giai_quyet',
    'tranh_chap',
    'da_xu_ly',
    'tu_choi'
  ) DEFAULT 'cho_xu_ly' NOT NULL;

-- Thêm loại khiếu nại mới nếu chưa có
ALTER TABLE khieu_nai
  MODIFY COLUMN loai_khieu_nai ENUM(
    'san_pham_loi',
    'khong_dung_mo_ta',
    'cham_giao',
    'thanh_toan',
    'hang_gia',
    'khong_nhan_duoc_hang',
    'khac'
  ) NOT NULL;

-- Populate gian_hang_id cho các bản ghi cũ
UPDATE khieu_nai kn
JOIN don_hang dh ON kn.don_hang_id = dh.id
SET kn.gian_hang_id = dh.gian_hang_id
WHERE kn.gian_hang_id IS NULL;

-- Thêm type thông báo khiếu nại vào thong_bao nếu chưa có
ALTER TABLE thong_bao
  MODIFY COLUMN loai ENUM(
    'system', 'order', 'seller_registration',
    'seller_registration_received', 'seller_approved',
    'seller_rejected', 'promotion', 'complaint', 'other'
  ) DEFAULT 'system';

-- Index tối ưu query
CREATE INDEX idx_kn_gian_hang ON khieu_nai(gian_hang_id);
CREATE INDEX idx_kn_trang_thai ON khieu_nai(trang_thai);
CREATE INDEX idx_kn_nguoi_gui ON khieu_nai(nguoi_gui_id);

SELECT 'Migration complaint_v2 hoàn thành!' AS result;
