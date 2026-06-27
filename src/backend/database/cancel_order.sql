-- =====================================================
-- BỔ SUNG: HỦY ĐƠN HÀNG THEO QUY TRÌNH 2 CẤP
-- - Nếu đơn đang 'cho_xac_nhan': khách hủy trực tiếp kèm lý do
-- - Nếu đơn đang 'da_xac_nhan': khách gửi yêu cầu hủy,
--   người bán phải duyệt/từ chối mới hoàn tất
-- - Nếu đơn 'dang_giao' trở đi: không thể hủy
-- =====================================================

-- 1. Bổ sung cột lý do hủy & người hủy trên đơn hàng
ALTER TABLE don_hang
    ADD COLUMN IF NOT EXISTS ly_do_huy TEXT NULL,
    ADD COLUMN IF NOT EXISTS nguoi_huy ENUM('khach_hang','nguoi_ban','he_thong') NULL,
    ADD COLUMN IF NOT EXISTS nguoi_huy_id INT NULL,
    ADD COLUMN IF NOT EXISTS ngay_huy TIMESTAMP NULL;

-- 2. Bảng yêu cầu hủy đơn (chỉ phát sinh khi đơn đã được người bán xác nhận)
CREATE TABLE IF NOT EXISTS yeu_cau_huy_don (
    id INT AUTO_INCREMENT PRIMARY KEY,
    don_hang_id INT NOT NULL,
    nguoi_yeu_cau_id INT NOT NULL,
    ly_do TEXT NOT NULL,
    trang_thai ENUM('cho_duyet','chap_nhan','tu_choi') DEFAULT 'cho_duyet',
    phan_hoi TEXT NULL,
    nguoi_xu_ly_id INT NULL,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_xu_ly TIMESTAMP NULL,
    FOREIGN KEY (don_hang_id) REFERENCES don_hang(id) ON DELETE CASCADE,
    FOREIGN KEY (nguoi_yeu_cau_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
    FOREIGN KEY (nguoi_xu_ly_id) REFERENCES nguoi_dung(id) ON DELETE SET NULL,
    INDEX idx_don_hang (don_hang_id),
    INDEX idx_trang_thai (trang_thai),
    INDEX idx_nguoi_yeu_cau (nguoi_yeu_cau_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
