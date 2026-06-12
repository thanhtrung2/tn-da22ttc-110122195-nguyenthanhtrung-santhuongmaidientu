-- Phản hồi đánh giá của người bán
-- MySQL 8.0: IF NOT EXISTS is not supported for ADD COLUMN

-- Check and add phan_hoi
SET @exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'danh_gia' AND column_name = 'phan_hoi');
SET @sql = IF(@exists = 0, 'ALTER TABLE danh_gia ADD COLUMN phan_hoi TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Check and add nguoi_phan_hoi_id
SET @exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'danh_gia' AND column_name = 'nguoi_phan_hoi_id');
SET @sql = IF(@exists = 0, 'ALTER TABLE danh_gia ADD COLUMN nguoi_phan_hoi_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Check and add ngay_phan_hoi
SET @exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'danh_gia' AND column_name = 'ngay_phan_hoi');
SET @sql = IF(@exists = 0, 'ALTER TABLE danh_gia ADD COLUMN ngay_phan_hoi TIMESTAMP NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
