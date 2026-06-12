const fs = require('fs');

// Patch profile.js
let profileContent = fs.readFileSync('d:/KHOALUANTN2026/frontend/public/js/profile.js', 'utf8');

// 1. Update displayNotifications to include Delete button and correct onclick
const displayNotifOld = `    let html = '';
    notifications.forEach(notif => {
        const isRead = notif.trang_thai === 'read';
        html += \`
            <div class="notification-item \${isRead ? 'read' : 'unread'}" onclick="handleNotificationClick(\${notif.id}, '\${notif.url_lien_ket || ''}')" style="cursor: pointer;">
                <div class="notification-icon">
                    <i class="fas fa-\${getNotificationIcon(notif.loai)}"></i>
                </div>
                <div class="notification-content">
                    <h5>\${notif.tieu_de}</h5>
                    <p>\${notif.noi_dung}</p>
                    <small>\${formatDate(notif.ngay_tao)}</small>
                </div>
                \${!isRead ? '<div class="notification-dot"></div>' : ''}
            </div>
        \`;
    });`;

const displayNotifNew = `    let html = '';
    notifications.forEach(notif => {
        const isRead = notif.trang_thai === 'read';
        html += \`
            <div class="notification-item \${isRead ? 'read' : 'unread'}" style="cursor: pointer; position: relative; padding-right: 2.5rem;">
                <div onclick="handleNotificationClick(\${notif.id}, '\${notif.url_lien_ket || ''}')" style="display: flex; gap: 1rem; flex: 1;">
                    <div class="notification-icon">
                        <i class="fas fa-\${getNotificationIcon(notif.loai)}"></i>
                    </div>
                    <div class="notification-content">
                        <h5>\${notif.tieu_de}</h5>
                        <p>\${notif.noi_dung}</p>
                        <small>\${formatDate(notif.ngay_tao)}</small>
                    </div>
                </div>
                <button onclick="deleteNotification(\${notif.id}, event)" style="position: absolute; right: 1rem; top: 1rem; background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 1.1rem; padding: 0.5rem;" title="Xóa thông báo">
                    <i class="fas fa-trash"></i>
                </button>
                \${!isRead ? '<div class="notification-dot"></div>' : ''}
            </div>
        \`;
    });`;

profileContent = profileContent.replace(displayNotifOld, displayNotifNew);

// 2. Add deleteNotification and updateNotificationBadge call in markNotificationAsRead
const markAsReadOld = `async function markNotificationAsRead(notificationId) {
    try {
        const result = await api.put(\`/notifications/\${notificationId}\`, { da_doc: true });
        if (result.success) {
            await loadNotifications();
        }
    } catch (error) {
        console.error('Mark notification error:', error);
    }
}`;

const markAsReadNew = `async function markNotificationAsRead(notificationId) {
    try {
        const result = await api.put(\`/notifications/\${notificationId}\`, { da_doc: true });
        if (result.success) {
            await loadNotifications();
            if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
        }
    } catch (error) {
        console.error('Mark notification error:', error);
    }
}

window.deleteNotification = async function(notificationId, event) {
    event.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
        const result = await api.delete(\`/notifications/\${notificationId}\`);
        if (result.success) {
            await loadNotifications();
            if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
            showToast('Đã xóa thông báo');
        }
    } catch (error) {
        console.error('Delete notification error:', error);
        showToast('Lỗi khi xóa thông báo', 'error');
    }
};`;

profileContent = profileContent.replace(markAsReadOld, markAsReadNew);

// 3. Update updateSellerSection for unregistered users to show policy text
const unregisteredOld = `    } else {
        // Giao diện cho khách hàng chưa đăng ký
        container.innerHTML = \`
            <div class="glass-card" style="padding:3rem;text-align:center;">
                <div style="font-size:4rem;margin-bottom:1.5rem;">🚀</div>
                <h2 style="margin-bottom:1rem;">Bắt đầu kinh doanh cùng Vipo</h2>
                <p style="color:var(--dark-400);margin-bottom:2rem;max-width:500px;margin-inline:auto;">Tiếp cận hàng triệu khách hàng và quản lý gian hàng của bạn một cách chuyên nghiệp.</p>
                <button onclick="openSellerRegistration()" class="btn btn-primary btn-lg">
                    <i class="fas fa-rocket"></i> Đăng ký ngay
                </button>
            </div>
        \`;
    }`;

const unregisteredNew = `    } else {
        // Giao diện cho khách hàng chưa đăng ký
        container.innerHTML = \`
            <div class="glass-card" style="padding:3rem;text-align:center;">
                <div style="font-size:4rem;margin-bottom:1.5rem;">🚀</div>
                <h2 style="margin-bottom:1rem;">Bắt đầu kinh doanh cùng Vipo</h2>
                <p style="color:var(--dark-400);margin-bottom:2rem;max-width:500px;margin-inline:auto;">Tiếp cận hàng triệu khách hàng và quản lý gian hàng của bạn một cách chuyên nghiệp.</p>
                
                <div style="text-align:left; background: var(--dark-900); padding: 2rem; border-radius: 12px; margin: 0 auto 2.5rem auto; max-width: 600px; border: 1px solid var(--dark-700);">
                    <h4 style="margin-bottom: 1rem; color: var(--primary-dark);"><i class="fas fa-book-open"></i> Trước khi đăng ký, bạn cần biết:</h4>
                    <ul style="color: var(--text-secondary); line-height: 1.8; margin-left: 1.5rem; margin-bottom: 0;">
                        <li>Bạn cần chuẩn bị sẵn hình ảnh <strong>CCCD/CMND (mặt trước, mặt sau)</strong> và <strong>ảnh chân dung</strong>.</li>
                        <li>Nếu là hình thức công ty/doanh nghiệp, cần có <strong>Giấy phép kinh doanh</strong> hợp lệ.</li>
                        <li>Thông tin cung cấp phải chính xác, trùng khớp với các giấy tờ tùy thân.</li>
                        <li>Thời gian xét duyệt hồ sơ thường kéo dài từ <strong>1 đến 3 ngày làm việc</strong>.</li>
                        <li>Vui lòng đọc kỹ và tuân thủ <a href="/pages/complaint-policy.html" target="_blank" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Chính sách & Điều khoản Người bán</a> của Vipo.</li>
                    </ul>
                </div>
                
                <button onclick="openSellerRegistration()" class="btn btn-primary btn-lg" style="padding: 15px 40px; font-size: 1.1rem;">
                    <i class="fas fa-rocket"></i> Đăng ký ngay
                </button>
            </div>
        \`;
    }`;

profileContent = profileContent.replace(unregisteredOld, unregisteredNew);

fs.writeFileSync('d:/KHOALUANTN2026/frontend/public/js/profile.js', profileContent, 'utf8');

// Patch shopee-nav.js
let navContent = fs.readFileSync('d:/KHOALUANTN2026/frontend/public/js/shopee-nav.js', 'utf8');

const notifHtmlOld = `onclick="window.location.href='/pages/profile.html#notifications'"`;
const notifHtmlNew = `onclick="handleNotificationClickGlobal(\${notif.id}, '\${notif.url_lien_ket || ''}')"`;

navContent = navContent.replace(notifHtmlOld, notifHtmlNew);

if (!navContent.includes('window.handleNotificationClickGlobal')) {
    navContent += `
window.handleNotificationClickGlobal = async function(notificationId, url) {
    try {
        await api.put(\`/notifications/\${notificationId}\`, { da_doc: true });
        if (typeof updateNotificationBadge === 'function') {
            await updateNotificationBadge();
        }
    } catch (e) {
        console.error(e);
    }
    
    if (url && url !== 'undefined' && url !== 'null' && url.trim() !== '') {
        window.location.href = url;
    } else {
        window.location.href = '/pages/profile.html#notifications';
    }
};
`;
}

fs.writeFileSync('d:/KHOALUANTN2026/frontend/public/js/shopee-nav.js', navContent, 'utf8');

console.log('Done fixing JS');
