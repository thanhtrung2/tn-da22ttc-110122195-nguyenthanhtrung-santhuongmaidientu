const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =====================================================
// MULTER CONFIG - Upload ảnh minh chứng
// =====================================================
const complaintsUploadDir = path.join(__dirname, '../uploads/complaints');
if (!fs.existsSync(complaintsUploadDir)) fs.mkdirSync(complaintsUploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, complaintsUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `complaint_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 5 } });

// =====================================================
// HELPERS
// =====================================================
const getIO = () => { try { return require('../server').io; } catch { return null; } };

const pushNotification = async (nguoi_nhan_id, tieu_de, noi_dung, url_lien_ket = null) => {
    await pool.query(
        `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
         VALUES (?, ?, ?, 'complaint', 'unread', ?)`,
        [nguoi_nhan_id, tieu_de, noi_dung, url_lien_ket]
    );
    const io = getIO();
    if (io) io.to(`user_${nguoi_nhan_id}`).emit('new_notification', { tieu_de, noi_dung, loai: 'complaint', url_lien_ket });
};

const loaiLabels = {
    san_pham_loi: 'Sản phẩm lỗi',
    khong_dung_mo_ta: 'Không đúng mô tả',
    cham_giao: 'Chậm giao hàng',
    thanh_toan: 'Vấn đề thanh toán',
    hang_gia: 'Hàng giả/nhái',
    khong_nhan_duoc_hang: 'Không nhận được hàng',
    khac: 'Khác'
};

// =====================================================
// 1. KHÁCH HÀNG - Gửi khiếu nại + upload ảnh
// =====================================================
const createComplaint = [
    upload.array('anh_minh_chung', 5),
    async (req, res) => {
        try {
            const { don_hang_id, loai_khieu_nai, mo_ta } = req.body;

            if (!don_hang_id || !loai_khieu_nai || !mo_ta) {
                return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
            }

            // Kiểm tra đơn hàng thuộc khách
            const [order] = await pool.query(
                `SELECT dh.id, dh.gian_hang_id, dh.trang_thai, gh.nguoi_ban_id, gh.ten_gian_hang
                 FROM don_hang dh
                 JOIN gian_hang gh ON dh.gian_hang_id = gh.id
                 WHERE dh.id = ? AND dh.nguoi_mua_id = ?`,
                [don_hang_id, req.user.id]
            );

            if (order.length === 0) {
                return res.status(400).json({ success: false, message: 'Đơn hàng không tồn tại hoặc không thuộc về bạn' });
            }

            if (!['hoan_thanh', 'dang_giao'].includes(order[0].trang_thai)) {
                return res.status(400).json({ success: false, message: 'Chỉ có thể khiếu nại đơn hàng đang giao hoặc đã hoàn thành' });
            }

            // Kiểm tra đã có khiếu nại chưa giải quyết
            const [existing] = await pool.query(
                `SELECT id FROM khieu_nai WHERE don_hang_id = ? AND nguoi_gui_id = ? AND trang_thai NOT IN ('da_xu_ly','tu_choi')`,
                [don_hang_id, req.user.id]
            );
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Đơn hàng này đã có khiếu nại đang được xử lý' });
            }

            // Lưu đường dẫn ảnh
            const anhPaths = (req.files || []).map(f => `/uploads/complaints/${f.filename}`);

            const [result] = await pool.query(
                `INSERT INTO khieu_nai (nguoi_gui_id, don_hang_id, gian_hang_id, loai_khieu_nai, mo_ta, anh_minh_chung, trang_thai)
                 VALUES (?, ?, ?, ?, ?, ?, 'cho_xu_ly')`,
                [req.user.id, don_hang_id, order[0].gian_hang_id, loai_khieu_nai, mo_ta, JSON.stringify(anhPaths)]
            );

            // Thông báo cho Seller
            const loaiStr = loaiLabels[loai_khieu_nai] || loai_khieu_nai;
            await pushNotification(
                order[0].nguoi_ban_id,
                `🚩 Khiếu nại mới - Đơn #${don_hang_id}`,
                `Khách hàng vừa gửi khiếu nại về đơn #${don_hang_id}. Loại: ${loaiStr}. Vui lòng xem ảnh minh chứng và liên hệ khách để thỏa thuận.`,
                `/pages/seller/complaints.html`
            );

            res.status(201).json({ success: true, message: 'Gửi khiếu nại thành công', data: { id: result.insertId } });
        } catch (error) {
            console.error('createComplaint error:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    }
];

// =====================================================
// 2. KHÁCH HÀNG - Xem danh sách khiếu nại của mình
// =====================================================
const getMyComplaints = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT kn.*, dh.ma_giao_dich, dh.tong_tien, gh.ten_gian_hang, gh.nguoi_ban_id, nd_ban.ho_ten as ten_nguoi_ban
             FROM khieu_nai kn
             JOIN don_hang dh ON kn.don_hang_id = dh.id
             JOIN gian_hang gh ON kn.gian_hang_id = gh.id
             JOIN nguoi_dung nd_ban ON gh.nguoi_ban_id = nd_ban.id
             WHERE kn.nguoi_gui_id = ?
             ORDER BY kn.ngay_tao DESC`,
            [req.user.id]
        );
        // Parse JSON anh_minh_chung
        rows.forEach(r => {
            if (r.anh_minh_chung && typeof r.anh_minh_chung === 'string') {
                try { r.anh_minh_chung = JSON.parse(r.anh_minh_chung); } catch { r.anh_minh_chung = []; }
            }
            r.anh_minh_chung = r.anh_minh_chung || [];
        });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getMyComplaints error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =====================================================
// 3. XEM CHI TIẾT 1 KHIẾU NẠI (3 bên)
// =====================================================
const getComplaintById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT kn.*,
                    dh.ma_giao_dich, dh.tong_tien, dh.trang_thai as trang_thai_don,
                    gh.ten_gian_hang, gh.nguoi_ban_id,
                    nd_khach.ho_ten as ten_khach, nd_khach.email as email_khach,
                    nd_ban.ho_ten as ten_nguoi_ban
             FROM khieu_nai kn
             JOIN don_hang dh ON kn.don_hang_id = dh.id
             JOIN gian_hang gh ON kn.gian_hang_id = gh.id
             JOIN nguoi_dung nd_khach ON kn.nguoi_gui_id = nd_khach.id
             JOIN nguoi_dung nd_ban ON gh.nguoi_ban_id = nd_ban.id
             WHERE kn.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại' });

        const kn = rows[0];
        // Kiểm tra quyền truy cập
        const isCustomer = kn.nguoi_gui_id === req.user.id;
        const isSeller = kn.nguoi_ban_id === req.user.id;
        const isAdmin = req.user.vai_tro === 'admin';
        if (!isCustomer && !isSeller && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Không có quyền xem khiếu nại này' });
        }

        if (kn.anh_minh_chung && typeof kn.anh_minh_chung === 'string') {
            try { kn.anh_minh_chung = JSON.parse(kn.anh_minh_chung); } catch { kn.anh_minh_chung = []; }
        }
        kn.anh_minh_chung = kn.anh_minh_chung || [];

        res.json({ success: true, data: kn });
    } catch (error) {
        console.error('getComplaintById error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =====================================================
// 4. NGƯỜI BÁN - Xem danh sách khiếu nại gian hàng
// =====================================================
const sellerGetComplaints = async (req, res) => {
    try {
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) return res.json({ success: true, data: [] });

        const { trang_thai } = req.query;
        let sql = `SELECT kn.*, dh.ma_giao_dich, dh.tong_tien,
                          nd_khach.ho_ten as ten_khach, nd_khach.email as email_khach, nd_khach.id as khach_id
                   FROM khieu_nai kn
                   JOIN don_hang dh ON kn.don_hang_id = dh.id
                   JOIN nguoi_dung nd_khach ON kn.nguoi_gui_id = nd_khach.id
                   WHERE kn.gian_hang_id = ?`;
        const params = [shop[0].id];

        if (trang_thai) { sql += ' AND kn.trang_thai = ?'; params.push(trang_thai); }
        sql += ' ORDER BY kn.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        rows.forEach(r => {
            if (r.anh_minh_chung && typeof r.anh_minh_chung === 'string') {
                try { r.anh_minh_chung = JSON.parse(r.anh_minh_chung); } catch { r.anh_minh_chung = []; }
            }
            r.anh_minh_chung = r.anh_minh_chung || [];
        });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('sellerGetComplaints error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =====================================================
// 5. NGƯỜI BÁN - Đề xuất giải pháp thỏa thuận
// =====================================================
const sellerRespondComplaint = async (req, res) => {
    try {
        const { de_xuat, ghi_chu } = req.body;
        const validDeXuat = ['bu_hang', 'doi_tra', 'hoan_tien'];
        if (!validDeXuat.includes(de_xuat)) {
            return res.status(400).json({ success: false, message: 'Đề xuất không hợp lệ' });
        }

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) return res.status(403).json({ success: false, message: 'Không có quyền' });

        const [kn] = await pool.query(
            'SELECT * FROM khieu_nai WHERE id = ? AND gian_hang_id = ?',
            [req.params.id, shop[0].id]
        );
        if (kn.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại' });

        if (!['cho_xu_ly', 'dang_thuong_luong'].includes(kn[0].trang_thai)) {
            return res.status(400).json({ success: false, message: 'Khiếu nại không thể đề xuất ở trạng thái hiện tại' });
        }

        await pool.query(
            `UPDATE khieu_nai SET de_xuat_seller = ?, ghi_chu_seller = ?, trang_thai = 'dang_thuong_luong' WHERE id = ?`,
            [de_xuat, ghi_chu || null, req.params.id]
        );

        const deXuatLabels = { bu_hang: 'Gửi bù hàng', doi_tra: 'Đổi/Trả hàng', hoan_tien: 'Hoàn tiền' };
        await pushNotification(
            kn[0].nguoi_gui_id,
            `💬 Người bán đề xuất giải pháp - Đơn #${kn[0].don_hang_id}`,
            `Người bán đề xuất: ${deXuatLabels[de_xuat]}. ${ghi_chu ? 'Ghi chú: ' + ghi_chu : ''} Vui lòng xác nhận đồng ý hoặc leo thang lên Admin.`,
            `/pages/complaint.html`
        );

        res.json({ success: true, message: 'Đã gửi đề xuất giải pháp cho khách hàng' });
    } catch (error) {
        console.error('sellerRespondComplaint error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =====================================================
// 6. KHÁCH HÀNG - Xác nhận kết quả thỏa thuận
// =====================================================
const customerConfirmResolution = async (req, res) => {
    try {
        const { dong_y } = req.body; // true = đồng ý, false = không đồng ý (leo thang admin)

        const [kn] = await pool.query(
            'SELECT kn.*, gh.nguoi_ban_id FROM khieu_nai kn JOIN gian_hang gh ON kn.gian_hang_id = gh.id WHERE kn.id = ? AND kn.nguoi_gui_id = ?',
            [req.params.id, req.user.id]
        );
        if (kn.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại' });

        if (kn[0].trang_thai !== 'dang_thuong_luong') {
            return res.status(400).json({ success: false, message: 'Khiếu nại chưa có đề xuất từ người bán' });
        }

        if (dong_y) {
            // Khách đồng ý → đóng hồ sơ
            await pool.query(
                `UPDATE khieu_nai SET ket_qua_thuong_luong = 'dong_y', trang_thai = 'da_giai_quyet' WHERE id = ?`,
                [req.params.id]
            );
            await pushNotification(
                kn[0].nguoi_ban_id,
                `✅ Khách đồng ý giải pháp - Đơn #${kn[0].don_hang_id}`,
                `Khách hàng đã đồng ý với đề xuất của bạn. Hồ sơ khiếu nại đơn #${kn[0].don_hang_id} đã được giải quyết.`,
                `/pages/seller/complaints.html`
            );
            res.json({ success: true, message: 'Đã xác nhận. Khiếu nại được đánh dấu giải quyết thành công!' });
        } else {
            // Khách không đồng ý → leo thang admin
            await pool.query(
                `UPDATE khieu_nai SET ket_qua_thuong_luong = 'khong_dong_y', trang_thai = 'tranh_chap' WHERE id = ?`,
                [req.params.id]
            );
            await pushNotification(
                kn[0].nguoi_ban_id,
                `⚠️ Khách leo thang tranh chấp - Đơn #${kn[0].don_hang_id}`,
                `Khách hàng không đồng ý với đề xuất và đã yêu cầu Admin can thiệp. Vui lòng chờ quyết định từ Admin.`,
                `/pages/seller/complaints.html`
            );
            res.json({ success: true, message: 'Đã chuyển lên Admin xử lý. Admin sẽ xem xét ảnh minh chứng và đưa ra quyết định.' });
        }
    } catch (error) {
        console.error('customerConfirmResolution error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =====================================================
// 7. ADMIN - Xem tất cả khiếu nại
// =====================================================
const getAllComplaints = async (req, res) => {
    try {
        const { trang_thai } = req.query;
        let sql = `SELECT kn.*,
                          nd_khach.ho_ten as ten_nguoi_gui, nd_khach.email,
                          dh.ma_giao_dich, dh.tong_tien,
                          gh.ten_gian_hang,
                          nd_ban.ho_ten as ten_nguoi_ban, nd_ban.email as email_ban
                   FROM khieu_nai kn
                   JOIN nguoi_dung nd_khach ON kn.nguoi_gui_id = nd_khach.id
                   JOIN don_hang dh ON kn.don_hang_id = dh.id
                   JOIN gian_hang gh ON kn.gian_hang_id = gh.id
                   JOIN nguoi_dung nd_ban ON gh.nguoi_ban_id = nd_ban.id`;
        const params = [];

        if (trang_thai) { sql += ' WHERE kn.trang_thai = ?'; params.push(trang_thai); }
        sql += ' ORDER BY kn.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        rows.forEach(r => {
            if (r.anh_minh_chung && typeof r.anh_minh_chung === 'string') {
                try { r.anh_minh_chung = JSON.parse(r.anh_minh_chung); } catch { r.anh_minh_chung = []; }
            }
            r.anh_minh_chung = r.anh_minh_chung || [];
        });
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getAllComplaints error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// =====================================================
// 8. ADMIN - Xử lý khiếu nại (chốt / cưỡng chế)
// =====================================================
const adminHandleComplaint = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { quyet_dinh, phan_hoi_admin } = req.body;
        const validQuyetDinh = ['chot_ho_so', 'cuong_che_hoan_tien'];
        if (!validQuyetDinh.includes(quyet_dinh)) {
            return res.status(400).json({ success: false, message: 'Quyết định không hợp lệ' });
        }

        const [kn] = await connection.query(
            `SELECT kn.*, gh.nguoi_ban_id, dh.nguoi_mua_id, dh.tong_tien as tien_don, dh.trang_thai_thanh_toan
             FROM khieu_nai kn
             JOIN gian_hang gh ON kn.gian_hang_id = gh.id
             JOIN don_hang dh ON kn.don_hang_id = dh.id
             WHERE kn.id = ?`,
            [req.params.id]
        );
        if (kn.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại' });
        }

        if (['da_xu_ly', 'tu_choi'].includes(kn[0].trang_thai)) {
            return res.status(400).json({ success: false, message: 'Khiếu nại đã được xử lý rồi' });
        }

        // Cập nhật khiếu nại
        await connection.query(
            `UPDATE khieu_nai SET
                trang_thai = 'da_xu_ly',
                phan_hoi_admin = ?,
                quyet_dinh_admin = ?,
                xu_ly_admin_id = ?,
                ngay_xu_ly = NOW()
             WHERE id = ?`,
            [phan_hoi_admin || null, quyet_dinh, req.user.id, req.params.id]
        );

        // Nếu cưỡng chế hoàn tiền → cập nhật đơn hàng
        if (quyet_dinh === 'cuong_che_hoan_tien') {
            await connection.query(
                `UPDATE don_hang SET trang_thai_thanh_toan = 'refunded' WHERE id = ?`,
                [kn[0].don_hang_id]
            );
            // Cập nhật bảng thanh_toan nếu có
            await connection.query(
                `UPDATE thanh_toan SET trang_thai = 'refunded' WHERE don_hang_id = ? AND trang_thai = 'completed'`,
                [kn[0].don_hang_id]
            );
        }

        const deXuatMsg = quyet_dinh === 'cuong_che_hoan_tien'
            ? 'Admin đã cưỡng chế hoàn tiền cho đơn hàng này.'
            : 'Admin đã chốt hồ sơ khiếu nại.';

        // Thông báo cho cả khách và seller
        const notifContent = `${deXuatMsg}${phan_hoi_admin ? ' Ghi chú: ' + phan_hoi_admin : ''}`;
        await pushNotification(kn[0].nguoi_mua_id, `📋 Kết quả xử lý khiếu nại - Đơn #${kn[0].don_hang_id}`, notifContent, `/pages/complaint.html`);
        await pushNotification(kn[0].nguoi_ban_id, `📋 Admin xử lý khiếu nại - Đơn #${kn[0].don_hang_id}`, notifContent, `/pages/seller/complaints.html`);

        await connection.commit();
        res.json({ success: true, message: 'Đã xử lý khiếu nại thành công' });
    } catch (error) {
        await connection.rollback();
        console.error('adminHandleComplaint error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// Export multer middleware for use in routes
const uploadMiddleware = upload.array('anh_minh_chung', 5);

module.exports = {
    createComplaint,
    getMyComplaints,
    getComplaintById,
    sellerGetComplaints,
    sellerRespondComplaint,
    customerConfirmResolution,
    getAllComplaints,
    adminHandleComplaint,
    uploadMiddleware
};
