-- Thêm trường ten_dang_nhap vào bảng nguoi_dung
ALTER TABLE nguoi_dung ADD COLUMN ten_dang_nhap VARCHAR(100) UNIQUE;

-- Cập nhật ten_dang_nhap từ email nếu chưa có
UPDATE nguoi_dung SET ten_dang_nhap = SUBSTRING_INDEX(email, '@', 1) WHERE ten_dang_nhap IS NULL;

-- Thêm trường gioi_tinh nếu chưa có
ALTER TABLE nguoi_dung ADD COLUMN gioi_tinh ENUM('Nam', 'Nữ', 'Khác') DEFAULT NULL;

-- Thêm index cho ten_dang_nhap
CREATE INDEX idx_ten_dang_nhap ON nguoi_dung(ten_dang_nhap);
