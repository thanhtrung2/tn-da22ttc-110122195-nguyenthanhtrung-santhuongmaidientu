const fs = require('fs');
let content = fs.readFileSync('d:/KHOALUANTN2026/frontend/public/js/profile.js', 'utf8');

// 1. Update displayNotifications
content = content.replace(
    /onclick="markNotificationAsRead\(\$\{notif\.id\}\)"/g,
    `onclick="handleNotificationClick(\${notif.id}, '\${notif.url_lien_ket || ''}')" style="cursor: pointer;"`
);

// 2. Add handleNotificationClick
if (!content.includes('window.handleNotificationClick')) {
    content = content.replace(
        /\/\/ Đánh dấu tất cả thông báo đã đọc/,
        `window.handleNotificationClick = async function(notificationId, url) {
    await markNotificationAsRead(notificationId);
    if (url && url !== 'undefined' && url !== 'null') {
        window.location.href = url;
    }
};

// Đánh dấu tất cả thông báo đã đọc`
    );
}

// 3. Update updateSellerSection
const rejectBlockOld = `<div style="margin-top:2rem;padding:1.5rem;background:rgba(239,68,68,0.1);border:1px solid var(--danger);border-radius:12px;text-align:left;">
                        <h4 style="color:var(--danger);margin-bottom:0.5rem;"><i class="fas fa-exclamation-circle"></i> Lý do từ chối:</h4>
                        <p style="margin:0;">\${user.ly_do_tu_choi || 'Không có lý do cụ thể'}</p>
                    </div>
                    <button onclick="openSellerRegistration()" class="btn btn-primary" style="margin-top:2rem;">
                        <i class="fas fa-redo"></i> Đăng ký lại
                    </button>`;
const rejectBlockNew = `<div style="margin-top:2rem;padding:1.5rem;background:rgba(239,68,68,0.1);border:1px solid var(--danger);border-radius:12px;text-align:left;">
                        <h4 style="color:var(--danger);margin-bottom:0.5rem;"><i class="fas fa-exclamation-circle"></i> Lý do từ chối:</h4>
                        <p style="margin:0;">\${user.ly_do_tu_choi || 'Không có lý do cụ thể'}</p>
                    </div>
                    <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 2rem;">
                        <button onclick="cancelSellerRegistration()" class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);">
                            <i class="fas fa-trash"></i> Xóa & Làm lại
                        </button>
                        <button onclick="openSellerRegistration()" class="btn btn-primary">
                            <i class="fas fa-redo"></i> Đăng ký lại
                        </button>
                    </div>`;
content = content.replace(rejectBlockOld, rejectBlockNew);

// 4. Add cancelSellerRegistration
if (!content.includes('window.cancelSellerRegistration')) {
    content += `

window.cancelSellerRegistration = async function() {
    if(!confirm("Bạn có chắc chắn muốn xóa hồ sơ bị từ chối và trở về trạng thái ban đầu?")) return;
    try {
        const result = await api.delete('/users/seller-registration');
        if(result.success) {
            showToast('Đã xóa hồ sơ đăng ký cũ. Bạn có thể đăng ký lại.', 'success');
            const user = getUser();
            user.vai_tro = 'customer';
            user.trang_thai_xac_thuc = 'unverified';
            localStorage.setItem('user', JSON.stringify(user));
            currentUser = user;
            updateSellerSection();
        } else {
            showToast(result.message || 'Lỗi khi xóa hồ sơ', 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('Lỗi kết nối', 'error');
    }
};
`;
}

fs.writeFileSync('d:/KHOALUANTN2026/frontend/public/js/profile.js', content, 'utf8');
console.log('Done fixing profile.js');
