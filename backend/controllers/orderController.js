const pool = require('../config/database');
const crypto = require('crypto');

// Helper: lấy io instance (real-time) nếu server đã sẵn sàng
const getIO = () => {
    try { return require('../server').io; } catch { return null; }
};

// Helper: tạo thông báo + đẩy realtime
const pushNotification = async (nguoi_nhan_id, tieu_de, noi_dung, loai, url_lien_ket = null) => {
    await pool.query(
        `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
         VALUES (?, ?, ?, ?, 'unread', ?)`,
        [nguoi_nhan_id, tieu_de, noi_dung, loai, url_lien_ket]
    );
    const io = getIO();
    if (io) io.to(`user_${nguoi_nhan_id}`).emit('new_notification', { tieu_de, noi_dung, loai, url_lien_ket });
};

// Tạo đơn hàng từ giỏ hàng
const createOrder = async (req, res) => {
    const { dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan, ghi_chu, vi_voucher_id } = req.body;

    if (!dia_chi_giao || !so_dien_thoai) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ và số điện thoại' });
    }

    // Get cart items grouped by shop
    const [cartItems] = await pool.query(
        `SELECT gh.*, sp.ten_san_pham, sp.gia, sp.gia_khuyen_mai, sp.so_luong_ton, sp.gian_hang_id,
        bt.mau_sac, bt.kich_thuoc, bt.gia_them, bt.so_luong_ton as variant_stock
        FROM gio_hang gh
        JOIN san_pham sp ON gh.san_pham_id = sp.id
        LEFT JOIN san_pham_bien_the bt ON gh.bien_the_id = bt.id
        WHERE gh.nguoi_mua_id = ? AND sp.trang_thai = 'active'`,
        [req.user.id]
    );

    if (cartItems.length === 0) {
        return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }

    for (const item of cartItems) {
        const stock = item.bien_the_id ? item.variant_stock : item.so_luong_ton;
        if (item.so_luong > stock) {
            const label = item.mau_sac || item.kich_thuoc
                ? `${item.ten_san_pham} (${item.mau_sac || ''}${item.mau_sac && item.kich_thuoc ? '/' : ''}${item.kich_thuoc || ''})`
                : item.ten_san_pham;
            return res.status(400).json({ success: false, message: `${label} không đủ số lượng (còn ${stock})` });
        }
    }

    // Group by shop
    const shopGroups = {};
    cartItems.forEach(item => {
        if (!shopGroups[item.gian_hang_id]) shopGroups[item.gian_hang_id] = [];
        shopGroups[item.gian_hang_id].push(item);
    });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const orderIds = [];
        const maGiaoDich = Number(String(Date.now()).slice(-5) + Math.floor(1000 + Math.random() * 9000));

        let validVoucher = null;
        if (vi_voucher_id) {
            const [viVouchers] = await connection.query(
                `SELECT vv.*, km.gia_tri, km.loai, km.don_toi_thieu, km.so_luong, km.da_dung as km_da_dung, km.gian_hang_id
                 FROM vi_voucher vv
                 JOIN khuyen_mai km ON vv.khuyen_mai_id = km.id
                 WHERE vv.id = ? AND vv.nguoi_dung_id = ? AND vv.trang_thai = 'chua_dung'
                 AND km.trang_thai = 'active' AND CURDATE() >= km.ngay_bat_dau AND CURDATE() <= km.ngay_ket_thuc`,
                [vi_voucher_id, req.user.id]
            );
            if (viVouchers.length > 0) validVoucher = viVouchers[0];
        }

        let totalEligible = 0;
        let eligibleShopCount = 0;
        if (validVoucher) {
            for (const [shopId, items] of Object.entries(shopGroups)) {
                if (!validVoucher.gian_hang_id || shopId == validVoucher.gian_hang_id) {
                    let shopTotal = 0;
                    items.forEach(item => {
                        const price = (item.gia_khuyen_mai && item.gia_khuyen_mai < item.gia) ? item.gia_khuyen_mai : item.gia;
                        shopTotal += (parseFloat(price) + parseFloat(item.gia_them || 0)) * item.so_luong;
                    });
                    totalEligible += shopTotal;
                    eligibleShopCount++;
                }
            }
            if (totalEligible < validVoucher.don_toi_thieu || validVoucher.km_da_dung >= validVoucher.so_luong) {
                validVoucher = null;
            } else {
                await connection.query('UPDATE vi_voucher SET trang_thai = ?, ngay_dung = CURRENT_TIMESTAMP WHERE id = ?', ['da_dung', validVoucher.id]);
                await connection.query('UPDATE khuyen_mai SET da_dung = da_dung + 1 WHERE id = ?', [validVoucher.khuyen_mai_id]);
            }
        }

        for (const [shopId, items] of Object.entries(shopGroups)) {
            let tienHang = 0;
            items.forEach(item => {
                const basePrice = (item.gia_khuyen_mai && item.gia_khuyen_mai < item.gia) ? item.gia_khuyen_mai : item.gia;
                const variantExtra = parseFloat(item.gia_them || 0);
                const price = basePrice + variantExtra;
                tienHang += price * item.so_luong;
            });

            let phiVanChuyen = 30000; // Flat shipping fee per shop order

            if (validVoucher && (!validVoucher.gian_hang_id || validVoucher.gian_hang_id == shopId)) {
                let discount = 0;
                if (validVoucher.loai === 'phan_tram') {
                    discount = tienHang * (validVoucher.gia_tri / 100);
                    if (discount > (tienHang + phiVanChuyen)) discount = tienHang + phiVanChuyen;
                    if (discount > tienHang) {
                        phiVanChuyen = Math.max(0, phiVanChuyen - (discount - tienHang));
                        tienHang = 0;
                    } else {
                        tienHang = Math.max(0, tienHang - discount);
                    }
                } else if (validVoucher.loai === 'co_dinh') {
                    discount = validVoucher.gia_tri * (tienHang / totalEligible);
                    if (discount > (tienHang + phiVanChuyen)) discount = tienHang + phiVanChuyen;
                    if (discount > tienHang) {
                        phiVanChuyen = Math.max(0, phiVanChuyen - (discount - tienHang));
                        tienHang = 0;
                    } else {
                        tienHang = Math.max(0, tienHang - discount);
                    }
                } else if (validVoucher.loai === 'mien_phi_van_chuyen') {
                    discount = validVoucher.gia_tri / eligibleShopCount;
                    if (discount > phiVanChuyen) discount = phiVanChuyen;
                    phiVanChuyen = Math.max(0, phiVanChuyen - discount);
                }
            }

            // Calculate fees and VAT
            const thueVat = Math.round(tienHang * 0.08); // 8% VAT
            const phiAdmin = Math.round(tienHang * 0.15); // 15% Admin platform fee / commission
            const tongTien = tienHang + phiVanChuyen + thueVat;

            // Create order with new columns
            const [orderResult] = await connection.query(
                `INSERT INTO don_hang (nguoi_mua_id, gian_hang_id, tien_hang, phi_van_chuyen, thue_vat, phi_admin, tong_tien, dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan, ma_giao_dich, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.user.id, shopId, tienHang, phiVanChuyen, thueVat, phiAdmin, tongTien, dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan || 'cod', maGiaoDich, ghi_chu]
            );

            for (const item of items) {
                const basePrice = (item.gia_khuyen_mai && item.gia_khuyen_mai < item.gia) ? item.gia_khuyen_mai : item.gia;
                const variantExtra = parseFloat(item.gia_them || 0);
                const price = basePrice + variantExtra;
                const tenBienThe = (item.mau_sac || item.kich_thuoc)
                    ? `${item.mau_sac || ''}${item.mau_sac && item.kich_thuoc && item.kich_thuoc !== 'Mặc định' ? ' / ' : ''}${item.kich_thuoc && item.kich_thuoc !== 'Mặc định' ? item.kich_thuoc : ''}`.trim()
                    : null;
                await connection.query(
                    'INSERT INTO chi_tiet_don_hang (don_hang_id, san_pham_id, bien_the_id, so_luong, gia, ten_bien_the) VALUES (?, ?, ?, ?, ?, ?)',
                    [orderResult.insertId, item.san_pham_id, item.bien_the_id || null, item.so_luong, price, tenBienThe]
                );

                await connection.query(
                    'UPDATE san_pham SET so_luong_ton = so_luong_ton - ? WHERE id = ?',
                    [item.so_luong, item.san_pham_id]
                );
                if (item.bien_the_id) {
                    await connection.query(
                        'UPDATE san_pham_bien_the SET so_luong_ton = so_luong_ton - ? WHERE id = ?',
                        [item.so_luong, item.bien_the_id]
                    );
                }
            }

            orderIds.push(orderResult.insertId);

            // Gửi thông báo cho người bán có đơn hàng mới
            const [shopOwner] = await connection.query(
                'SELECT gian_hang.nguoi_ban_id, gian_hang.ten_gian_hang FROM gian_hang WHERE gian_hang.id = ?',
                [shopId]
            );
            const [buyer] = await connection.query(
                'SELECT ho_ten FROM nguoi_dung WHERE id = ?',
                [req.user.id]
            );
            if (shopOwner.length > 0) {
                await connection.query(
                    `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
                     VALUES (?, ?, ?, 'order', 'unread', ?)`,
                    [
                        shopOwner[0].nguoi_ban_id,
                        'Đơn hàng mới',
                        `Bạn có đơn hàng mới #${orderResult.insertId} từ khách ${buyer[0]?.ho_ten || 'khách hàng'} - Tổng: ${new Intl.NumberFormat('vi-VN').format(tongTien)}đ`,
                        '/pages/seller/orders.html?trang_thai=cho_xac_nhan'
                    ]
                );
            }
        }

        // Clear cart
        await connection.query('DELETE FROM gio_hang WHERE nguoi_mua_id = ?', [req.user.id]);

        await connection.commit();

        // Phát realtime notification tới các seller (sau khi commit để tránh gửi khi rollback)
        const io = getIO();
        if (io) {
            // Lấy lại danh sách đơn hàng vừa tạo
            const [createdOrders] = await pool.query('SELECT id, gian_hang_id, tong_tien FROM don_hang WHERE id IN (?)', [orderIds]);
            const [buyer] = await pool.query('SELECT ho_ten FROM nguoi_dung WHERE id = ?', [req.user.id]);
            
            for (const order of createdOrders) {
                const [shopOwner] = await pool.query(
                    'SELECT nguoi_ban_id FROM gian_hang WHERE id = ?',
                    [order.gian_hang_id]
                );
                if (shopOwner.length > 0) {
                    io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_notification', {
                        noi_dung: `Bạn có đơn hàng mới #${order.id} từ khách ${buyer[0]?.ho_ten || 'khách hàng'} - Tổng: ${new Intl.NumberFormat('vi-VN').format(order.tong_tien)}đ`,
                        loai: 'order',
                        url_lien_ket: '/pages/seller/orders.html?trang_thai=cho_xac_nhan'
                    });
                    io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_order', { shop_id: order.gian_hang_id });
                }
            }
        }

        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công',
            data: { orderIds }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// Lấy đơn hàng của tôi (customer)
const getMyOrders = async (req, res) => {
    try {
        const { trang_thai } = req.query;
        let sql = `SELECT dh.*, gh.ten_gian_hang,
            (SELECT COUNT(*) FROM chi_tiet_don_hang WHERE don_hang_id = dh.id) as so_san_pham
            FROM don_hang dh JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            WHERE dh.nguoi_mua_id = ?`;
        const params = [req.user.id];

        if (trang_thai) {
            sql += ' AND dh.trang_thai = ?';
            params.push(trang_thai);
        }

        sql += ' ORDER BY dh.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Chi tiết đơn hàng
const getOrderById = async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT dh.*, gh.ten_gian_hang, gh.logo as shop_logo, gh.nguoi_ban_id,
            nd.ho_ten as ten_nguoi_mua, nd.email as email_nguoi_mua
            FROM don_hang dh 
            JOIN gian_hang gh ON dh.gian_hang_id = gh.id
            JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            WHERE dh.id = ? AND (dh.nguoi_mua_id = ? OR gh.nguoi_ban_id = ?)`,
            [req.params.id, req.user.id, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        const [items] = await pool.query(
            `SELECT ct.*, sp.ten_san_pham, sp.hinh_anh FROM chi_tiet_don_hang ct
            JOIN san_pham sp ON ct.san_pham_id = sp.id WHERE ct.don_hang_id = ?`,
            [req.params.id]
        );

        // Lấy yêu cầu hủy gần nhất (nếu có) để hiển thị trạng thái phê duyệt
        const [ycRows] = await pool.query(
            `SELECT id, ly_do, trang_thai, phan_hoi, ngay_tao, ngay_xu_ly
             FROM yeu_cau_huy_don
             WHERE don_hang_id = ?
             ORDER BY ngay_tao DESC LIMIT 1`,
            [req.params.id]
        );
        const yeu_cau_huy = ycRows[0] || null;

        res.json({ success: true, data: { ...orders[0], items, yeu_cau_huy } });
    } catch (error) {
        console.error('getOrderById error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};

/**
 * Hủy đơn hàng theo quy trình 2 cấp
 * - Body: { ly_do: string (bắt buộc) }
 * - Nếu trạng thái là 'cho_xac_nhan': hủy trực tiếp
 * - Nếu trạng thái là 'da_xac_nhan': tạo yêu cầu hủy, chờ người bán duyệt
 * - Nếu >= 'dang_giao': từ chối
 */
const cancelOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { ly_do } = req.body;
        if (!ly_do || !String(ly_do).trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do hủy đơn' });
        }

        const [orders] = await connection.query(
            `SELECT dh.*, gh.nguoi_ban_id, gh.ten_gian_hang
             FROM don_hang dh JOIN gian_hang gh ON dh.gian_hang_id = gh.id
             WHERE dh.id = ? AND dh.nguoi_mua_id = ?`,
            [req.params.id, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        const order = orders[0];

        if (['da_huy', 'hoan_thanh'].includes(order.trang_thai)) {
            return res.status(400).json({ success: false, message: 'Đơn hàng không thể hủy ở trạng thái hiện tại' });
        }

        if (order.trang_thai === 'dang_giao') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đang được giao, không thể hủy. Vui lòng liên hệ người bán hoặc từ chối nhận hàng' });
        }

        // CASE 1: chờ xác nhận -> hủy trực tiếp
        if (order.trang_thai === 'cho_xac_nhan') {
            // Restore stock
            const [items] = await connection.query('SELECT * FROM chi_tiet_don_hang WHERE don_hang_id = ?', [req.params.id]);
            for (const item of items) {
                await connection.query('UPDATE san_pham SET so_luong_ton = so_luong_ton + ? WHERE id = ?', [item.so_luong, item.san_pham_id]);
            }

            await connection.query(
                `UPDATE don_hang
                 SET trang_thai = 'da_huy',
                     ly_do_huy = ?,
                     nguoi_huy = 'khach_hang',
                     nguoi_huy_id = ?,
                     ngay_huy = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [ly_do.trim(), req.user.id, req.params.id]
            );

            // Thông báo cho người bán
            await connection.query(
                `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
                 VALUES (?, ?, ?, 'order', 'unread', ?)`,
                [order.nguoi_ban_id, 'Khách hàng đã hủy đơn', `Đơn hàng #${order.id} vừa bị khách hàng hủy. Lý do: ${ly_do.trim()}`, `/pages/seller/orders.html`]
            );

            await connection.commit();

            const io = getIO();
            if (io) io.to(`user_${order.nguoi_ban_id}`).emit('new_notification', { loai: 'order' });

            return res.json({ success: true, message: 'Hủy đơn hàng thành công', data: { action: 'cancelled' } });
        }

        // CASE 2: đã xác nhận -> tạo yêu cầu hủy, chờ seller duyệt
        if (order.trang_thai === 'da_xac_nhan') {
            // Nếu đã có yêu cầu đang chờ duyệt thì không cho tạo thêm
            const [pending] = await connection.query(
                `SELECT id FROM yeu_cau_huy_don WHERE don_hang_id = ? AND trang_thai = 'cho_duyet'`,
                [order.id]
            );
            if (pending.length > 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Đơn hàng đang có yêu cầu hủy chờ người bán duyệt' });
            }

            const [ycResult] = await connection.query(
                `INSERT INTO yeu_cau_huy_don (don_hang_id, nguoi_yeu_cau_id, ly_do, trang_thai)
                 VALUES (?, ?, ?, 'cho_duyet')`,
                [order.id, req.user.id, ly_do.trim()]
            );

            await connection.query(
                `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
                 VALUES (?, ?, ?, 'order', 'unread', ?)`,
                [order.nguoi_ban_id, 'Yêu cầu hủy đơn mới', `Khách hàng yêu cầu hủy đơn #${order.id}. Lý do: ${ly_do.trim()}. Vui lòng phản hồi.`, `/pages/seller/orders.html`]
            );

            await connection.commit();

            const io = getIO();
            if (io) {
                io.to(`user_${order.nguoi_ban_id}`).emit('new_notification', { loai: 'order' });
                io.to(`user_${order.nguoi_ban_id}`).emit('cancel_request_created', { don_hang_id: order.id });
            }

            return res.json({
                success: true,
                message: 'Đã gửi yêu cầu hủy đơn, vui lòng chờ người bán phản hồi',
                data: { action: 'requested', yeu_cau_huy_id: ycResult.insertId }
            });
        }

        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ' });
    } catch (error) {
        await connection.rollback();
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

/**
 * Người bán duyệt yêu cầu hủy
 * Body: { yeu_cau_id }
 */
const approveCancelRequest = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { yeu_cau_id } = req.body;
        if (!yeu_cau_id) {
            return res.status(400).json({ success: false, message: 'Thiếu mã yêu cầu' });
        }

        // Lấy yêu cầu + kiểm tra quyền
        const [ycRows] = await connection.query(
            `SELECT yc.id AS yc_id, yc.don_hang_id, yc.nguoi_yeu_cau_id, yc.ly_do,
                    yc.trang_thai AS yc_trang_thai, yc.phan_hoi,
                    dh.gian_hang_id, dh.trang_thai AS don_trang_thai, dh.nguoi_mua_id
             FROM yeu_cau_huy_don yc
             JOIN don_hang dh ON yc.don_hang_id = dh.id
             WHERE yc.id = ?`,
            [yeu_cau_id]
        );
        if (ycRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Yêu cầu không tồn tại' });
        }
        const yc = ycRows[0];

        const [shop] = await connection.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0 || shop[0].id !== yc.gian_hang_id) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xử lý yêu cầu này' });
        }

        if (yc.yc_trang_thai !== 'cho_duyet') {
            return res.status(400).json({ success: false, message: 'Yêu cầu đã được xử lý trước đó' });
        }
        if (yc.don_trang_thai !== 'da_xac_nhan') {
            return res.status(400).json({ success: false, message: 'Đơn hàng không ở trạng thái có thể hủy' });
        }

        // Hoàn trả tồn kho
        const [items] = await connection.query('SELECT * FROM chi_tiet_don_hang WHERE don_hang_id = ?', [yc.don_hang_id]);
        for (const item of items) {
            await connection.query('UPDATE san_pham SET so_luong_ton = so_luong_ton + ? WHERE id = ?', [item.so_luong, item.san_pham_id]);
        }

        // Cập nhật đơn -> đã hủy
        await connection.query(
            `UPDATE don_hang
             SET trang_thai = 'da_huy',
                 ly_do_huy = ?,
                 nguoi_huy = 'khach_hang',
                 nguoi_huy_id = ?,
                 ngay_huy = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [yc.ly_do, yc.nguoi_yeu_cau_id, yc.don_hang_id]
        );

        await connection.query(
            `UPDATE yeu_cau_huy_don
             SET trang_thai = 'chap_nhan',
                 nguoi_xu_ly_id = ?,
                 ngay_xu_ly = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [req.user.id, yeu_cau_id]
        );

        // Thông báo cho khách
        await connection.query(
            `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
             VALUES (?, ?, ?, 'order', 'unread', ?)`,
            [yc.nguoi_mua_id, 'Yêu cầu hủy đơn được chấp nhận', `Người bán đã chấp nhận yêu cầu hủy đơn #${yc.don_hang_id} của bạn.`, `/pages/orders.html`]
        );

        await connection.commit();

        const io = getIO();
        if (io) {
            io.to(`user_${yc.nguoi_mua_id}`).emit('new_notification', { loai: 'order' });
            io.to(`user_${yc.nguoi_mua_id}`).emit('order_cancelled', { don_hang_id: yc.don_hang_id });
        }

        res.json({ success: true, message: 'Đã chấp nhận yêu cầu hủy đơn' });
    } catch (error) {
        await connection.rollback();
        console.error('Approve cancel request error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

/**
 * Người bán từ chối yêu cầu hủy
 * Body: { yeu_cau_id, phan_hoi }
 */
const rejectCancelRequest = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { yeu_cau_id, phan_hoi } = req.body;
        if (!yeu_cau_id) {
            return res.status(400).json({ success: false, message: 'Thiếu mã yêu cầu' });
        }

        const [ycRows] = await connection.query(
            `SELECT yc.*, dh.gian_hang_id, dh.nguoi_mua_id
             FROM yeu_cau_huy_don yc
             JOIN don_hang dh ON yc.don_hang_id = dh.id
             WHERE yc.id = ?`,
            [yeu_cau_id]
        );
        if (ycRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Yêu cầu không tồn tại' });
        }
        const yc = ycRows[0];

        const [shop] = await connection.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0 || shop[0].id !== yc.gian_hang_id) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xử lý yêu cầu này' });
        }

        if (yc.trang_thai !== 'cho_duyet') {
            return res.status(400).json({ success: false, message: 'Yêu cầu đã được xử lý trước đó' });
        }

        await connection.query(
            `UPDATE yeu_cau_huy_don
             SET trang_thai = 'tu_choi',
                 phan_hoi = ?,
                 nguoi_xu_ly_id = ?,
                 ngay_xu_ly = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [phan_hoi ? String(phan_hoi).trim() : null, req.user.id, yeu_cau_id]
        );

        await connection.query(
            `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
             VALUES (?, ?, ?, 'order', 'unread', ?)`,
            [yc.nguoi_mua_id, 'Yêu cầu hủy đơn bị từ chối', `Người bán đã từ chối yêu cầu hủy đơn #${yc.don_hang_id} của bạn${phan_hoi ? `. Lý do: ${phan_hoi}` : ''}.`, `/pages/order-detail.html?id=${yc.don_hang_id}`]
        );

        await connection.commit();

        const io = getIO();
        if (io) {
            io.to(`user_${yc.nguoi_mua_id}`).emit('new_notification', { loai: 'order' });
            io.to(`user_${yc.nguoi_mua_id}`).emit('cancel_request_rejected', { don_hang_id: yc.don_hang_id });
        }

        res.json({ success: true, message: 'Đã từ chối yêu cầu hủy đơn' });
    } catch (error) {
        await connection.rollback();
        console.error('Reject cancel request error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

/**
 * Seller lấy danh sách yêu cầu hủy (mặc định: chờ duyệt)
 */
const getCancelRequests = async (req, res) => {
    try {
        const { trang_thai } = req.query;
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.json({ success: true, data: [] });
        }

        let sql = `SELECT yc.*, dh.tong_tien, dh.ma_giao_dich, dh.trang_thai as trang_thai_don, nd.ho_ten as ten_khach, nd.so_dien_thoai as sdt_khach
                   FROM yeu_cau_huy_don yc
                   JOIN don_hang dh ON yc.don_hang_id = dh.id
                   JOIN nguoi_dung nd ON yc.nguoi_yeu_cau_id = nd.id
                   WHERE dh.gian_hang_id = ?`;
        const params = [shop[0].id];
        if (trang_thai) {
            sql += ' AND yc.trang_thai = ?';
            params.push(trang_thai);
        }
        sql += ' ORDER BY yc.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get cancel requests error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

/**
 * Seller chủ động hủy đơn (ví dụ hết hàng, không liên lạc được khách...)
 * Body: { ly_do }
 */
const sellerCancelOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { ly_do } = req.body;
        if (!ly_do || !String(ly_do).trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do hủy' });
        }

        const [shop] = await connection.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.status(403).json({ success: false, message: 'Không có quyền' });
        }

        const [orders] = await connection.query(
            `SELECT * FROM don_hang WHERE id = ? AND gian_hang_id = ?`,
            [req.params.id, shop[0].id]
        );
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }
        const order = orders[0];

        if (!['cho_xac_nhan', 'da_xac_nhan'].includes(order.trang_thai)) {
            return res.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn ở trạng thái chờ xác nhận hoặc đã xác nhận' });
        }

        const [items] = await connection.query('SELECT * FROM chi_tiet_don_hang WHERE don_hang_id = ?', [order.id]);
        for (const item of items) {
            await connection.query('UPDATE san_pham SET so_luong_ton = so_luong_ton + ? WHERE id = ?', [item.so_luong, item.san_pham_id]);
        }

        await connection.query(
            `UPDATE don_hang
             SET trang_thai = 'da_huy',
                 ly_do_huy = ?,
                 nguoi_huy = 'nguoi_ban',
                 nguoi_huy_id = ?,
                 ngay_huy = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [ly_do.trim(), req.user.id, order.id]
        );

        // Nếu đơn đang có yêu cầu hủy chờ duyệt -> đóng
        await connection.query(
            `UPDATE yeu_cau_huy_don
             SET trang_thai = 'chap_nhan',
                 phan_hoi = CONCAT('Người bán tự hủy đơn. Lý do: ', ?),
                 nguoi_xu_ly_id = ?,
                 ngay_xu_ly = CURRENT_TIMESTAMP
             WHERE don_hang_id = ? AND trang_thai = 'cho_duyet'`,
            [ly_do.trim(), req.user.id, order.id]
        );

        await connection.query(
            `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
             VALUES (?, ?, ?, 'order', 'unread', ?)`,
            [order.nguoi_mua_id, 'Đơn hàng đã bị hủy bởi người bán', `Đơn hàng #${order.id} đã bị người bán hủy. Lý do: ${ly_do.trim()}`, `/pages/orders.html`]
        );

        await connection.commit();

        const io = getIO();
        if (io) {
            io.to(`user_${order.nguoi_mua_id}`).emit('new_notification', { loai: 'order' });
            io.to(`user_${order.nguoi_mua_id}`).emit('order_cancelled', { don_hang_id: order.id });
        }

        res.json({ success: true, message: 'Đã hủy đơn hàng' });
    } catch (error) {
        await connection.rollback();
        console.error('Seller cancel order error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// Cập nhật trạng thái đơn hàng (seller)
const updateOrderStatus = async (req, res) => {
    try {
        const { trang_thai } = req.body;
        const validStatuses = ['da_xac_nhan', 'dang_giao', 'hoan_thanh'];

        if (!validStatuses.includes(trang_thai)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.status(403).json({ success: false, message: 'Không có quyền' });
        }

        const [result] = await pool.query(
            'UPDATE don_hang SET trang_thai = ? WHERE id = ? AND gian_hang_id = ?',
            [trang_thai, req.params.id, shop[0].id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        // If completed and payment is COD, mark as paid
        if (trang_thai === 'hoan_thanh') {
            // Check if it's COD
            const [orderCheck] = await pool.query(
                "SELECT tong_tien, thue_vat, nguoi_mua_id, phuong_thuc_thanh_toan, trang_thai_thanh_toan, ma_giao_dich FROM don_hang WHERE id = ?",
                [req.params.id]
            );
            if (orderCheck.length > 0) {
                const order = orderCheck[0];
                if (order.phuong_thuc_thanh_toan === 'cod') {
                    // Update order
                    await pool.query(
                        "UPDATE don_hang SET trang_thai_thanh_toan = 'paid' WHERE id = ?",
                        [req.params.id]
                    );

                    // Insert into thanh_toan
                    const sysTxnRef = 'COD_' + Date.now() + '_' + req.params.id;
                    await pool.query(
                        `INSERT INTO thanh_toan (don_hang_id, nguoi_mua_id, so_tien, phuong_thuc, ma_giao_dich, ma_giao_dich_he_thong, trang_thai)
                         VALUES (?, ?, ?, 'cod', ?, ?, 'completed')
                         ON DUPLICATE KEY UPDATE trang_thai = 'completed'`,
                        [req.params.id, order.nguoi_mua_id, order.tong_tien, order.ma_giao_dich || sysTxnRef, sysTxnRef]
                    );

                    // Create invoice with VAT
                    const maInvoice = 'HD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                    await pool.query(
                        `INSERT INTO hoa_don (ma_hoa_don, don_hang_id, nguoi_mua_id, tong_tien, tien_giam_gia, thue, thanh_tien, trang_thai, ngay_thanh_toan)
                         VALUES (?, ?, ?, ?, 0.00, ?, ?, 'da_thanh_toan', CURRENT_TIMESTAMP)
                         ON DUPLICATE KEY UPDATE trang_thai = 'da_thanh_toan', ngay_thanh_toan = CURRENT_TIMESTAMP`,
                        [maInvoice, req.params.id, order.nguoi_mua_id, order.tong_tien, order.thue_vat || 0, order.tong_tien]
                    );
                }
            }
        }

        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy đơn hàng của gian hàng (seller)
const getShopOrders = async (req, res) => {
    try {
        const { trang_thai, from, to } = req.query;
        const [shop] = await pool.query('SELECT id FROM gian_hang WHERE nguoi_ban_id = ?', [req.user.id]);
        if (shop.length === 0) {
            return res.json({ success: true, data: [] });
        }

        let sql = `SELECT dh.*, nd.ho_ten as ten_nguoi_mua, nd.so_dien_thoai as sdt_nguoi_mua,
            CASE WHEN dh.phi_admin > 0 THEN dh.phi_admin ELSE ROUND(dh.tien_hang * 0.15) END as phi_admin,
            CASE WHEN dh.thue_vat > 0 THEN dh.thue_vat ELSE ROUND(dh.tien_hang * 0.08) END as thue_vat,
            (SELECT COUNT(*) FROM chi_tiet_don_hang WHERE don_hang_id = dh.id) as so_san_pham
            FROM don_hang dh JOIN nguoi_dung nd ON dh.nguoi_mua_id = nd.id
            WHERE dh.gian_hang_id = ?`;
        const params = [shop[0].id];

        if (from) { sql += ' AND dh.ngay_tao >= ?'; params.push(from); }
        if (to) { sql += ' AND dh.ngay_tao <= ?'; params.push(to + ' 23:59:59'); }

        if (trang_thai) {
            sql += ' AND dh.trang_thai = ?';
            params.push(trang_thai);
        }

        sql += ' ORDER BY dh.ngay_tao DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Khách hàng xác nhận đã nhận hàng (hoàn thành đơn)
const completeOrderCustomer = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Check if order belongs to buyer and is active
        const [order] = await pool.query(
            "SELECT * FROM don_hang WHERE id = ? AND nguoi_mua_id = ? AND trang_thai IN ('cho_xac_nhan', 'da_xac_nhan', 'dang_giao')",
            [orderId, req.user.id]
        );

        if (order.length === 0) {
            return res.status(400).json({ success: false, message: 'Đơn hàng không ở trạng thái có thể hoàn thành' });
        }

        // Get order details before complete to check payment method and total
        const [orderCheck] = await pool.query(
            "SELECT tong_tien, thue_vat, nguoi_mua_id, phuong_thuc_thanh_toan, ma_giao_dich FROM don_hang WHERE id = ? AND nguoi_mua_id = ?",
            [orderId, req.user.id]
        );

        // Update status to 'hoan_thanh' and mark payment as 'paid'
        await pool.query(
            "UPDATE don_hang SET trang_thai = 'hoan_thanh', trang_thai_thanh_toan = 'paid' WHERE id = ? AND nguoi_mua_id = ?",
            [orderId, req.user.id]
        );

        if (orderCheck.length > 0) {
            const order = orderCheck[0];
            // Insert into thanh_toan (especially for COD, but good to ensure a record exists for all methods)
            const sysTxnRef = (order.phuong_thuc_thanh_toan === 'cod' ? 'COD_' : 'ONLINE_') + Date.now() + '_' + orderId;
            await pool.query(
                `INSERT INTO thanh_toan (don_hang_id, nguoi_mua_id, so_tien, phuong_thuc, ma_giao_dich, ma_giao_dich_he_thong, trang_thai)
                 VALUES (?, ?, ?, ?, ?, ?, 'completed')
                 ON DUPLICATE KEY UPDATE trang_thai = 'completed'`,
                [orderId, order.nguoi_mua_id, order.tong_tien, order.phuong_thuc_thanh_toan, order.ma_giao_dich || sysTxnRef, sysTxnRef]
            );

            // Create invoice with VAT
            const maInvoice = 'HD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
            await pool.query(
                `INSERT INTO hoa_don (ma_hoa_don, don_hang_id, nguoi_mua_id, tong_tien, tien_giam_gia, thue, thanh_tien, trang_thai, ngay_thanh_toan)
                 VALUES (?, ?, ?, ?, 0.00, ?, ?, 'da_thanh_toan', CURRENT_TIMESTAMP)
                 ON DUPLICATE KEY UPDATE trang_thai = 'da_thanh_toan', ngay_thanh_toan = CURRENT_TIMESTAMP`,
                [maInvoice, orderId, order.nguoi_mua_id, order.tong_tien, order.thue_vat || 0, order.tong_tien]
            );
        }

        res.json({ success: true, message: 'Xác nhận đã nhận hàng thành công. Hãy đánh giá sản phẩm nhé!' });
    } catch (error) {
        console.error('Complete order customer error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đặt hàng ngay (Mua ngay - không dùng giỏ hàng)
const createOrderBuyNow = async (req, res) => {
    const { san_pham_id, so_luong, bien_the_id, dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan, ghi_chu, vi_voucher_id } = req.body;

    if (!san_pham_id || !so_luong || !dia_chi_giao || !so_dien_thoai) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin đặt hàng' });
    }

    const qty = parseInt(so_luong);
    if (isNaN(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ' });
    }

    try {
        const [products] = await pool.query(
            `SELECT sp.*, gh.id as shop_id FROM san_pham sp JOIN gian_hang gh ON sp.gian_hang_id = gh.id WHERE sp.id = ? AND sp.trang_thai = 'active'`,
            [san_pham_id]
        );
        if (products.length === 0) return res.status(404).json({ success: false, message: 'Sản phẩm không tìm thấy' });
        const product = products[0];

        let variant = null;
        let stock = product.so_luong_ton;
        let variantExtra = 0;
        if (bien_the_id) {
            const [variants] = await pool.query('SELECT * FROM san_pham_bien_the WHERE id = ? AND san_pham_id = ?', [bien_the_id, san_pham_id]);
            if (variants.length === 0) return res.status(404).json({ success: false, message: 'Biến thể không tồn tại' });
            variant = variants[0];
            stock = variant.so_luong_ton;
            variantExtra = parseFloat(variant.gia_them || 0);
        }

        if (qty > stock) {
            return res.status(400).json({ success: false, message: `Sản phẩm không đủ số lượng (còn ${stock})` });
        }

        const basePrice = (product.gia_khuyen_mai && product.gia_khuyen_mai < product.gia) ? product.gia_khuyen_mai : product.gia;
        const price = parseFloat(basePrice) + variantExtra;
        let tienHang = price * qty;
        let phiVanChuyen = 30000;

        // Áp dụng voucher nếu có
        if (vi_voucher_id) {
            const [viVouchers] = await pool.query(
                `SELECT vv.*, km.gia_tri, km.loai, km.don_toi_thieu, km.so_luong, km.da_dung as km_da_dung, km.gian_hang_id
                 FROM vi_voucher vv JOIN khuyen_mai km ON vv.khuyen_mai_id = km.id
                 WHERE vv.id = ? AND vv.nguoi_dung_id = ? AND vv.trang_thai = 'chua_dung'
                 AND km.trang_thai = 'active' AND CURDATE() >= km.ngay_bat_dau AND CURDATE() <= km.ngay_ket_thuc`,
                [vi_voucher_id, req.user.id]
            );
            if (viVouchers.length > 0) {
                const vv = viVouchers[0];
                if ((vv.gian_hang_id == product.gian_hang_id || !vv.gian_hang_id) && vv.km_da_dung < vv.so_luong && tienHang >= vv.don_toi_thieu) {
                    if (vv.loai === 'phan_tram') {
                        let disc = tienHang * (vv.gia_tri / 100);
                        if (disc > (tienHang + phiVanChuyen)) disc = tienHang + phiVanChuyen;
                        if (disc > tienHang) {
                            phiVanChuyen = Math.max(0, phiVanChuyen - (disc - tienHang));
                            tienHang = 0;
                        } else {
                            tienHang = Math.max(0, tienHang - disc);
                        }
                    } else if (vv.loai === 'co_dinh') {
                        let disc = vv.gia_tri;
                        if (disc > (tienHang + phiVanChuyen)) disc = tienHang + phiVanChuyen;
                        if (disc > tienHang) {
                            phiVanChuyen = Math.max(0, phiVanChuyen - (disc - tienHang));
                            tienHang = 0;
                        } else {
                            tienHang = Math.max(0, tienHang - disc);
                        }
                    } else if (vv.loai === 'mien_phi_van_chuyen') {
                        phiVanChuyen = Math.max(0, phiVanChuyen - vv.gia_tri);
                    }
                    await pool.query('UPDATE vi_voucher SET trang_thai = ?, ngay_dung = CURRENT_TIMESTAMP WHERE id = ?', ['da_dung', vv.id]);
                    await pool.query('UPDATE khuyen_mai SET da_dung = da_dung + 1 WHERE id = ?', [vv.khuyen_mai_id]);
                }
            }
        }

        const thueVat = Math.round(tienHang * 0.08);
        const phiAdmin = Math.round(tienHang * 0.15);
        const tongTien = tienHang + phiVanChuyen;
        const maGiaoDich = Number(String(Date.now()).slice(-5) + Math.floor(1000 + Math.random() * 9000));

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [orderResult] = await connection.query(
                `INSERT INTO don_hang (nguoi_mua_id, gian_hang_id, tien_hang, phi_van_chuyen, thue_vat, phi_admin, tong_tien, dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan, ma_giao_dich, ghi_chu)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.user.id, product.gian_hang_id, tienHang, phiVanChuyen, thueVat, phiAdmin, tongTien,
                 dia_chi_giao, so_dien_thoai, phuong_thuc_thanh_toan || 'cod', maGiaoDich, ghi_chu]
            );

            const tenBienThe = variant
                ? `${variant.mau_sac || ''}${variant.mau_sac && variant.kich_thuoc && variant.kich_thuoc !== 'Mặc định' ? ' / ' : ''}${variant.kich_thuoc && variant.kich_thuoc !== 'Mặc định' ? variant.kich_thuoc : ''}`.trim()
                : null;
            await connection.query(
                'INSERT INTO chi_tiet_don_hang (don_hang_id, san_pham_id, bien_the_id, so_luong, gia, ten_bien_the) VALUES (?, ?, ?, ?, ?, ?)',
                [orderResult.insertId, san_pham_id, variant ? variant.id : null, qty, price, tenBienThe]
            );

            await connection.query('UPDATE san_pham SET so_luong_ton = so_luong_ton - ? WHERE id = ?', [qty, san_pham_id]);
            if (variant) {
                await connection.query('UPDATE san_pham_bien_the SET so_luong_ton = so_luong_ton - ? WHERE id = ?', [qty, variant.id]);
            }

            // Thông báo người bán
            const [shopOwner] = await connection.query('SELECT nguoi_ban_id FROM gian_hang WHERE id = ?', [product.gian_hang_id]);
            const [buyer] = await connection.query('SELECT ho_ten FROM nguoi_dung WHERE id = ?', [req.user.id]);
            if (shopOwner.length > 0) {
                await connection.query(
                    `INSERT INTO thong_bao (nguoi_nhan_id, tieu_de, noi_dung, loai, trang_thai, url_lien_ket)
                     VALUES (?, 'Đơn hàng mới', ?, 'order', 'unread', '/pages/seller/orders.html?trang_thai=cho_xac_nhan')`,
                    [shopOwner[0].nguoi_ban_id, `Bạn có đơn hàng mới #${orderResult.insertId} từ khách ${buyer[0]?.ho_ten || 'khách hàng'} - Tổng: ${new Intl.NumberFormat('vi-VN').format(tongTien)}đ`]
                );
                const io = getIO();
                if (io) {
                    io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_notification', {
                        noi_dung: `Đơn hàng mới #${orderResult.insertId}`,
                        loai: 'order',
                        url_lien_ket: '/pages/seller/orders.html?trang_thai=cho_xac_nhan'
                    });
                    io.to(`user_${shopOwner[0].nguoi_ban_id}`).emit('new_order', { shop_id: product.gian_hang_id });
                }
            }

            await connection.commit();
            res.status(201).json({ success: true, message: 'Đặt hàng thành công', data: { orderIds: [orderResult.insertId] } });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Buy now order error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    createOrder, getMyOrders, getOrderById, cancelOrder, updateOrderStatus,
    getShopOrders, completeOrderCustomer,
    approveCancelRequest, rejectCancelRequest, getCancelRequests, sellerCancelOrder,
    createOrderBuyNow
};
