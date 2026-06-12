-- =====================================================
-- SÀN THƯƠNG MẠI ĐIỆN TỬ ĐA NGƯỜI BÁN - KLTN2026
-- Bổ sung các bảng còn thiếu
-- =====================================================

USE KLTN2026;

-- Bảng danh mục sản phẩm (nếu chưa có)
CREATE TABLE IF NOT EXISTS danh_muc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ten_danh_muc VARCHAR(100) NOT NULL,
    mo_ta TEXT,
    hinh_anh VARCHAR(500),
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng người dùng (nếu chưa có)
CREATE TABLE IF NOT EXISTS nguoi_dung (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mat_khau VARCHAR(255),
    so_dien_thoai VARCHAR(15),
    dia_chi TEXT,
    avatar VARCHAR(500),
    vai_tro ENUM('admin', 'seller', 'customer') DEFAULT 'customer',
    trang_thai ENUM('active', 'locked') DEFAULT 'active',
    -- Google OAuth
    google_id VARCHAR(100) UNIQUE,
    -- Thông tin xác thực người bán
    cccd_mat_truoc VARCHAR(500),
    cccd_mat_sau VARCHAR(500),
    giay_phep_kinh_doanh VARCHAR(500),
    anh_guong_mat VARCHAR(500),
    trang_thai_xac_thuc ENUM('pending', 'verified', 'rejected') DEFAULT NULL,
    ly_do_tu_choi TEXT,
    ngay_xac_thuc TIMESTAMP NULL,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng gian hàng (nếu chưa có)
CREATE TABLE IF NOT EXISTS gian_hang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nguoi_ban_id INT NOT NULL,
    ten_gian_hang VARCHAR(200) NOT NULL,
    mo_ta TEXT,
    logo VARCHAR(500),
    dia_chi VARCHAR(255),
    trang_thai ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoi_ban_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng sản phẩm (nếu chưa có)
CREATE TABLE IF NOT EXISTS san_pham (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gian_hang_id INT NOT NULL,
    danh_muc_id INT,
    ten_san_pham VARCHAR(200) NOT NULL,
    mo_ta TEXT,
    gia DECIMAL(15,2) NOT NULL,
    gia_khuyen_mai DECIMAL(15,2),
    so_luong_ton INT DEFAULT 0,
    hinh_anh VARCHAR(500),
    thuoc_tinh JSON,
    trang_thai ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    trang_thai_duyet ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    ly_do_tu_choi TEXT,
    luot_xem INT DEFAULT 0,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (gian_hang_id) REFERENCES gian_hang(id) ON DELETE CASCADE,
    FOREIGN KEY (danh_muc_id) REFERENCES danh_muc(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng giỏ hàng (nếu chưa có)
CREATE TABLE IF NOT EXISTS gio_hang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nguoi_mua_id INT NOT NULL,
    san_pham_id INT NOT NULL,
    so_luong INT DEFAULT 1,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoi_mua_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
    FOREIGN KEY (san_pham_id) REFERENCES san_pham(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng đơn hàng (nếu chưa có)
CREATE TABLE IF NOT EXISTS don_hang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nguoi_mua_id INT NOT NULL,
    gian_hang_id INT NOT NULL,
    tong_tien DECIMAL(15,2) NOT NULL,
    dia_chi_giao VARCHAR(500) NOT NULL,
    so_dien_thoai VARCHAR(15) NOT NULL,
    phuong_thuc_thanh_toan ENUM('cod', 'bank_transfer', 'vnpay', 'momo') DEFAULT 'cod',
    trang_thai_thanh_toan ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    trang_thai ENUM('cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'hoan_thanh', 'da_huy') DEFAULT 'cho_xac_nhan',
    ma_giao_dich VARCHAR(100),
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoi_mua_id) REFERENCES nguoi_dung(id),
    FOREIGN KEY (gian_hang_id) REFERENCES gian_hang(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng chi tiết đơn hàng (nếu chưa có)
CREATE TABLE IF NOT EXISTS chi_tiet_don_hang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    don_hang_id INT NOT NULL,
    san_pham_id INT NOT NULL,
    so_luong INT NOT NULL,
    gia DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (don_hang_id) REFERENCES don_hang(id) ON DELETE CASCADE,
    FOREIGN KEY (san_pham_id) REFERENCES san_pham(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng đánh giá (nếu chưa có)
CREATE TABLE IF NOT EXISTS danh_gia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    san_pham_id INT NOT NULL,
    nguoi_mua_id INT NOT NULL,
    don_hang_id INT NOT NULL,
    so_sao INT NOT NULL,
    binh_luan TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (san_pham_id) REFERENCES san_pham(id) ON DELETE CASCADE,
    FOREIGN KEY (nguoi_mua_id) REFERENCES nguoi_dung(id),
    FOREIGN KEY (don_hang_id) REFERENCES don_hang(id),
    UNIQUE KEY unique_review (nguoi_mua_id, san_pham_id, don_hang_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng khiếu nại (nếu chưa có)
CREATE TABLE IF NOT EXISTS khieu_nai (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nguoi_gui_id INT NOT NULL,
    don_hang_id INT NOT NULL,
    loai_khieu_nai ENUM('san_pham_loi', 'khong_dung_mo_ta', 'cham_giao', 'thanh_toan', 'khac') NOT NULL,
    mo_ta TEXT NOT NULL,
    trang_thai ENUM('cho_xu_ly', 'dang_xu_ly', 'da_xu_ly', 'tu_choi') DEFAULT 'cho_xu_ly',
    phan_hoi_admin TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoi_gui_id) REFERENCES nguoi_dung(id),
    FOREIGN KEY (don_hang_id) REFERENCES don_hang(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng tin nhắn (nếu chưa có)
CREATE TABLE IF NOT EXISTS tin_nhan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nguoi_gui_id INT NOT NULL,
    nguoi_nhan_id INT NOT NULL,
    noi_dung TEXT NOT NULL,
    da_doc BOOLEAN DEFAULT FALSE,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoi_gui_id) REFERENCES nguoi_dung(id),
    FOREIGN KEY (nguoi_nhan_id) REFERENCES nguoi_dung(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng khuyến mãi (nếu chưa có)
CREATE TABLE IF NOT EXISTS khuyen_mai (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gian_hang_id INT NOT NULL,
    ten_khuyen_mai VARCHAR(200) NOT NULL,
    mo_ta TEXT,
    loai ENUM('phan_tram', 'co_dinh') NOT NULL,
    gia_tri DECIMAL(15,2) NOT NULL,
    ngay_bat_dau DATE NOT NULL,
    ngay_ket_thuc DATE NOT NULL,
    trang_thai ENUM('active', 'inactive') DEFAULT 'active',
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gian_hang_id) REFERENCES gian_hang(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- DỮ LIỆU MẪU
-- =====================================================

-- Tạo tài khoản Admin mặc định (password: admin123)
INSERT IGNORE INTO nguoi_dung (ho_ten, email, mat_khau, vai_tro, trang_thai)
VALUES ('Admin Hệ Thống', 'admin@kltn2026.com', '$2a$10$8K1p/a0dR1xqM8K7MQ9oE.9FqN5K8b3i7CbZmLg3j0Q4HpVFR7xW2', 'admin', 'active');

-- Danh mục mẫu
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

-- Bảng shop (thông tin chi tiết shop của seller)
CREATE TABLE IF NOT EXISTS shop (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nguoi_ban_id INT NOT NULL,
    ten_shop VARCHAR(200) NOT NULL,
    mo_ta TEXT,
    logo VARCHAR(500),
    dia_chi_kho VARCHAR(500) NOT NULL,
    phuong_thuc_van_chuyen TEXT, -- JSON array: ["giao_hang_nhanh", "giao_hang_tiet_kiem", "tu_den_lay"]
    ma_so_thue VARCHAR(20) NOT NULL,
    dong_y_chinh_sach BOOLEAN DEFAULT FALSE,
    trang_thai ENUM('pending', 'active', 'suspended', 'rejected') DEFAULT 'pending',
    ly_do_tu_choi TEXT,
    ngay_duyet TIMESTAMP NULL,
    admin_duyet_id INT NULL,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoi_ban_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_duyet_id) REFERENCES nguoi_dung(id) ON DELETE SET NULL,
    UNIQUE KEY unique_seller (nguoi_ban_id),
    UNIQUE KEY unique_tax_code (ma_so_thue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng thông báo
CREATE TABLE IF NOT EXISTS thong_bao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nguoi_nhan_id INT NOT NULL,
    tieu_de VARCHAR(255) NOT NULL,
    noi_dung TEXT NOT NULL,
    loai ENUM('system', 'order', 'seller_registration', 'seller_registration_received', 'seller_approved', 'seller_rejected', 'promotion', 'other') DEFAULT 'system',
    trang_thai ENUM('unread', 'read') DEFAULT 'unread',
    url_lien_ket VARCHAR(500), -- Link để chuyển đến trang liên quan
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_doc TIMESTAMP NULL,
    FOREIGN KEY (nguoi_nhan_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
    INDEX idx_nguoi_nhan_trang_thai (nguoi_nhan_id, trang_thai),
    INDEX idx_ngay_tao (ngay_tao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cập nhật bảng gian_hang để liên kết với shop
ALTER TABLE gian_hang ADD COLUMN IF NOT EXISTS shop_id INT NULL;
ALTER TABLE gian_hang ADD FOREIGN KEY IF NOT EXISTS (shop_id) REFERENCES shop(id) ON DELETE SET NULL;

-- Thêm index để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_vai_tro ON nguoi_dung(vai_tro);
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_trang_thai_xac_thuc ON nguoi_dung(trang_thai_xac_thuc);
CREATE INDEX IF NOT EXISTS idx_shop_trang_thai ON shop(trang_thai);
CREATE INDEX IF NOT EXISTS idx_san_pham_trang_thai_duyet ON san_pham(trang_thai_duyet);

-- =====================================================
-- BỔ SUNG BẢNG THANH TOÁN VÀ HÓA ĐƠN (KLTN2026)
-- =====================================================

-- Bảng thanh toán
CREATE TABLE IF NOT EXISTS thanh_toan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    don_hang_id INT NOT NULL,
    nguoi_mua_id INT NOT NULL,
    so_tien DECIMAL(15,2) NOT NULL,
    phuong_thuc ENUM('cod', 'bank_transfer', 'vnpay', 'momo') NOT NULL,
    ma_giao_dich VARCHAR(100) NULL,
    ma_giao_dich_he_thong VARCHAR(100) UNIQUE NOT NULL,
    trang_thai ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ghi_chu TEXT,
    FOREIGN KEY (don_hang_id) REFERENCES don_hang(id) ON DELETE CASCADE,
    FOREIGN KEY (nguoi_mua_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng hóa đơn
CREATE TABLE IF NOT EXISTS hoa_don (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_hoa_don VARCHAR(50) UNIQUE NOT NULL,
    don_hang_id INT NOT NULL,
    nguoi_mua_id INT NOT NULL,
    ngay_lap TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tong_tien DECIMAL(15,2) NOT NULL,
    tien_giam_gia DECIMAL(15,2) DEFAULT 0.00,
    thue DECIMAL(15,2) DEFAULT 0.00,
    thanh_tien DECIMAL(15,2) NOT NULL,
    trang_thai ENUM('chua_thanh_toan', 'da_thanh_toan', 'da_huy') DEFAULT 'chua_thanh_toan',
    ngay_thanh_toan TIMESTAMP NULL,
    FOREIGN KEY (don_hang_id) REFERENCES don_hang(id) ON DELETE CASCADE,
    FOREIGN KEY (nguoi_mua_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Thêm cột bằng ALTER TABLE để hỗ trợ cập nhật DB cũ
ALTER TABLE san_pham ADD COLUMN IF NOT EXISTS thuoc_tinh JSON;
ALTER TABLE shop ADD COLUMN IF NOT EXISTS dong_y_chinh_sach BOOLEAN DEFAULT FALSE;