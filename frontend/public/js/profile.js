// ==========================================
// Profile Management
// ==========================================

let currentUser = null;
let currentOrderFilter = 'all';
let currentNotificationFilter = 'all';

// Khởi tạo trang profile
async function initProfile() {
    if (!isLoggedIn()) {
        window.location.href = '/pages/login.html';
        return;
    }

    currentUser = getUser();
    if (!currentUser) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Load user info
    await loadUserProfile();

    // Load notifications
    await loadNotifications();

    // Load orders
    await loadOrders();

    // Setup event listeners
    setupProfileEventListeners();

    // Check if user is seller
    checkSellerStatus();
}

// Load thông tin người dùng
async function loadUserProfile() {
    try {
        const result = await api.get('/users/profile');
        if (result.success) {
            currentUser = result.data;
            // Cập nhật localStorage để đồng bộ trạng thái (vd: từ pending sang verified)
            const storedUser = getUser();
            if (storedUser) {
                const updatedUser = { ...storedUser, ...currentUser };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            displayUserProfile(currentUser);
            // Sau khi load xong, cập nhật lại giao diện người bán
            checkSellerStatus();
            if (document.getElementById('seller-section')?.classList.contains('active')) {
                updateSellerSection();
            }
        }
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

// Hiển thị thông tin người dùng
function displayUserProfile(user) {
    // Update sidebar
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarUsername = document.getElementById('sidebar-username');
    
    if (sidebarAvatar) {
        const initials = user.ho_ten.split(' ').map(n => n[0]).join('').toUpperCase();
        sidebarAvatar.textContent = initials;
        if (user.avatar) {
            const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `/${user.avatar}`;
            sidebarAvatar.style.backgroundImage = `url(${avatarUrl})`;
            sidebarAvatar.style.backgroundSize = 'cover';
            sidebarAvatar.textContent = '';
        }
    }
    
    if (sidebarUsername) {
        sidebarUsername.textContent = user.ten_dang_nhap;
    }

    // Update account section
    document.getElementById('ten_dang_nhap').value = user.ten_dang_nhap || '';
    
    const [ho, ten] = user.ho_ten.split(' ').reverse();
    document.getElementById('ten').value = ten || '';
    document.getElementById('ho').value = ho || '';
    
    document.getElementById('email').value = user.email || '';
    document.getElementById('sdt').value = user.so_dien_thoai || '';
    
    if (user.gioi_tinh) {
        document.querySelector(`input[name="gioi_tinh"][value="${user.gioi_tinh}"]`).checked = true;
    }
    
    document.getElementById('dia_chi').value = user.dia_chi || '';

    // Update avatar preview
    const avatarPreview = document.getElementById('avatar-preview');
    if (avatarPreview && user.avatar) {
        const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `/${user.avatar}`;
        avatarPreview.style.backgroundImage = `url(${avatarUrl})`;
        avatarPreview.style.backgroundSize = 'cover';
        avatarPreview.textContent = '';
    }
}

// Cập nhật thông tin hồ sơ
async function updateProfile(event) {
    event.preventDefault();

    const ten = document.getElementById('ten').value.trim();
    const ho = document.getElementById('ho').value.trim();
    const sdt = document.getElementById('sdt').value.trim();
    const gioi_tinh = document.querySelector('input[name="gioi_tinh"]:checked')?.value;
    const dia_chi = document.getElementById('dia_chi').value.trim();

    if (!ten || !ho) {
        showToast('Vui lòng nhập tên và họ', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('ho_ten', `${ho} ${ten}`);
    formData.append('so_dien_thoai', sdt);
    formData.append('gioi_tinh', gioi_tinh);
    formData.append('dia_chi', dia_chi);

    // Check if avatar changed
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput && avatarInput.files.length > 0) {
        formData.append('avatar', avatarInput.files[0]);
    }

    const result = await api.put('/users/profile', formData);
    if (result.success) {
        showToast('Cập nhật thông tin thành công');
        // Update localStorage
        const user = getUser();
        user.ho_ten = `${ho} ${ten}`;
        user.so_dien_thoai = sdt;
        user.gioi_tinh = gioi_tinh;
        user.dia_chi = dia_chi;
        localStorage.setItem('user', JSON.stringify(user));
    } else {
        showToast(result.message || 'Lỗi khi cập nhật', 'error');
    }
}

// Đổi mật khẩu
async function changePw(event) {
    event.preventDefault();

    const oldPw = document.getElementById('old_pw').value;
    const newPw = document.getElementById('new_pw').value;
    const confirmPw = document.getElementById('confirm_pw').value;

    if (newPw.length < 6) {
        showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
        return;
    }

    if (newPw !== confirmPw) {
        showToast('Mật khẩu xác nhận không khớp', 'error');
        return;
    }

    const result = await api.post('/users/change-password', {
        mat_khau_cu: oldPw,
        mat_khau_moi: newPw
    });

    if (result.success) {
        showToast('Đổi mật khẩu thành công');
        document.getElementById('old_pw').value = '';
        document.getElementById('new_pw').value = '';
        document.getElementById('confirm_pw').value = '';
    } else {
        showToast(result.message || 'Lỗi khi đổi mật khẩu', 'error');
    }
}

// Preview avatar
function previewAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('avatar-preview');
            if (preview) {
                preview.style.backgroundImage = `url(${e.target.result})`;
                preview.style.backgroundSize = 'cover';
                preview.textContent = '';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Load thông báo
async function loadNotifications() {
    try {
        const result = await api.get('/notifications');
        if (result.success) {
            displayNotifications(result.data);
        }
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

// Hiển thị thông báo
function displayNotifications(notifications) {
    const container = document.getElementById('profile-notifications-container');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><p style="color:var(--dark-400);">Không có thông báo nào</p></div>';
        return;
    }

    let html = '';
    notifications.forEach(notif => {
        const isRead = notif.trang_thai === 'read';
        html += `
            <div class="notification-item ${isRead ? 'read' : 'unread'}" onclick="markNotificationAsRead(${notif.id})">
                <div class="notification-icon">
                    <i class="fas fa-${getNotificationIcon(notif.loai)}"></i>
                </div>
                <div class="notification-content">
                    <h5>${notif.tieu_de}</h5>
                    <p>${notif.noi_dung}</p>
                    <small>${formatDate(notif.ngay_tao)}</small>
                </div>
                ${!isRead ? '<div class="notification-dot"></div>' : ''}
            </div>
        `;
    });
    container.innerHTML = html;
}

// Lấy icon cho loại thông báo
function getNotificationIcon(type) {
    const icons = {
        'order': 'box',
        'payment': 'credit-card',
        'promotion': 'tag',
        'system': 'bell',
        'message': 'envelope'
    };
    return icons[type] || 'bell';
}

// Đánh dấu thông báo đã đọc
async function markNotificationAsRead(notificationId) {
    try {
        const result = await api.put(`/notifications/${notificationId}`, { da_doc: true });
        if (result.success) {
            await loadNotifications();
        }
    } catch (error) {
        console.error('Mark notification error:', error);
    }
}

// Đánh dấu tất cả thông báo đã đọc
async function markAllNotificationsAsRead() {
    try {
        const result = await api.post('/notifications/mark-all-read', {});
        if (result.success) {
            showToast('Đã đánh dấu tất cả thông báo');
            await loadNotifications();
        }
    } catch (error) {
        console.error('Mark all notifications error:', error);
    }
}

// Load đơn hàng
async function loadOrders() {
    try {
        let endpoint = '/orders';
        if (currentOrderFilter !== 'all') {
            endpoint += `?trang_thai=${currentOrderFilter}`;
        }
        
        const result = await api.get(endpoint);
        if (result.success) {
            displayOrders(result.data);
        }
    } catch (error) {
        console.error('Load orders error:', error);
    }
}

// Hiển thị đơn hàng
function displayOrders(orders) {
    const container = document.getElementById('orders-container');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-bag" style="font-size: 3rem; color: #d1d5db; margin-bottom: 1rem;"></i>
                <h3 style="color: #6b7280; margin-bottom: 0.5rem;">Chưa có đơn hàng nào</h3>
                <p style="color: #9ca3af;">Hãy khám phá và mua sắm những sản phẩm yêu thích!</p>
                <a href="/pages/products.html" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-shopping-cart"></i> Mua sắm ngay
                </a>
            </div>
        `;
        return;
    }

    let html = '';
    orders.forEach(order => {
        const statusLabel = getStatusLabel(order.trang_thai);
        const statusClass = getStatusClass(order.trang_thai);
        
        html += `
            <div class="order-card glass-card" style="padding:1.5rem;margin-bottom:1rem;">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem;">
                    <div>
                        <h4 style="margin:0;margin-bottom:0.5rem;">Đơn hàng #${order.id}</h4>
                        <p style="color:var(--dark-400);margin:0;font-size:0.9rem;">${formatDate(order.ngay_tao)}</p>
                    </div>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--dark-700);">
                    <div>
                        <p style="color:var(--dark-400);font-size:0.85rem;margin:0;">Cửa hàng</p>
                        <p style="margin:0;font-weight:500;">${order.ten_gian_hang}</p>
                    </div>
                    <div>
                        <p style="color:var(--dark-400);font-size:0.85rem;margin:0;">Tổng tiền</p>
                        <p style="margin:0;font-weight:500;color:var(--danger);">${formatPrice(order.tong_tien)}</p>
                    </div>
                </div>
                
                <div style="display:flex;gap:0.5rem;">
                    <a href="/pages/order-detail.html?id=${order.id}" class="btn btn-outline btn-sm">
                        <i class="fas fa-eye"></i> Chi tiết
                    </a>
                    ${order.trang_thai === 'cho_xac_nhan' ? `
                        <button class="btn btn-danger btn-sm" onclick="cancelOrder(${order.id})">
                            <i class="fas fa-times"></i> Hủy
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Hủy đơn hàng
async function cancelOrder(orderId) {
    if (!confirm('Bạn chắc chắn muốn hủy đơn hàng này?')) return;

    const result = await api.post(`/orders/${orderId}/cancel`, {});
    if (result.success) {
        showToast('Hủy đơn hàng thành công');
        await loadOrders();
    } else {
        showToast(result.message || 'Lỗi khi hủy đơn hàng', 'error');
    }
}

// Setup event listeners
function setupProfileEventListeners() {
    // Profile nav items
    document.querySelectorAll('.profile-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showProfileSection(section);
        });
    });

    // Order tabs
    document.querySelectorAll('.order-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentOrderFilter = tab.dataset.status;
            loadOrders();
        });
    });

    // Notification filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentNotificationFilter = btn.dataset.filter;
            loadNotifications();
        });
    });

    // Voucher tabs
    document.querySelectorAll('.voucher-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.voucher-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // TODO: Load vouchers by type
        });
    });
}

// Hiển thị section
function showProfileSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.profile-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active from nav items
    document.querySelectorAll('.profile-nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        section.classList.add('active');
        if (sectionName === 'seller') {
            updateSellerSection();
        }
    }

    // Mark nav item as active
    document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');

    // Reload data if needed
    if (sectionName === 'orders') {
        loadOrders();
    } else if (sectionName === 'notifications') {
        loadNotifications();
    }
}

// Kiểm tra trạng thái người bán
async function checkSellerStatus() {
    const user = currentUser || getUser();
    const sellerNavItem = document.getElementById('seller-nav-item');
    if (!sellerNavItem || !user) return;

    if (user.vai_tro === 'seller') {
        sellerNavItem.style.display = 'flex';
        sellerNavItem.querySelector('span').textContent = 'Kênh Người Bán';
        
        sellerNavItem.onclick = () => {
            if (user.trang_thai_xac_thuc === 'verified') {
                window.location.href = '/pages/seller/dashboard.html';
            } else {
                showProfileSection('seller');
            }
        };
    } else if (user.vai_tro === 'customer') {
        sellerNavItem.style.display = 'flex';
        sellerNavItem.querySelector('span').textContent = 'Trở Thành Người Bán';
        sellerNavItem.onclick = () => showProfileSection('seller');
    }
}


// Mở form đăng ký bán hàng
function openSellerRegistration() {
    const modal = document.getElementById('seller-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Cập nhật giao diện section người bán dựa trên trạng thái
function updateSellerSection() {
    const user = currentUser || getUser();
    const container = document.getElementById('seller-section');
    if (!container || !user) return;

    if (user.vai_tro === 'seller') {
        if (user.trang_thai_xac_thuc === 'pending') {
            container.innerHTML = `
                <div class="glass-card" style="padding:3rem;text-align:center;">
                    <div style="font-size:4rem;margin-bottom:1.5rem;">⏳</div>
                    <h2 style="color:var(--warning);margin-bottom:1rem;">Đang chờ xét duyệt</h2>
                    <p style="color:var(--dark-400);line-height:1.6;">Hồ sơ đăng ký bán hàng của bạn đã được gửi thành công.<br>Vui lòng chờ Admin phê duyệt trong vòng 1-3 ngày làm việc.</p>
                    <div style="margin-top:2rem;padding:1.5rem;background:var(--dark-900);border-radius:12px;text-align:left;">
                        <h4 style="margin-bottom:1rem;"><i class="fas fa-info-circle"></i> Thông tin đăng ký:</h4>
                        <div style="font-size:0.9rem;display:grid;gap:8px;">
                            <div><strong>Trạng thái:</strong> <span class="status-badge status-pending">Đang chờ duyệt</span></div>
                            <div><strong>Ghi chú:</strong> Chúng tôi đang kiểm tra các tài liệu đính kèm của bạn.</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (user.trang_thai_xac_thuc === 'rejected') {
            container.innerHTML = `
                <div class="glass-card" style="padding:3rem;text-align:center;">
                    <div style="font-size:4rem;margin-bottom:1.5rem;">❌</div>
                    <h2 style="color:var(--danger);margin-bottom:1rem;">Hồ sơ bị từ chối</h2>
                    <p style="color:var(--dark-400);line-height:1.6;">Rất tiếc, hồ sơ đăng ký bán hàng của bạn không được phê duyệt.</p>
                    <div style="margin-top:2rem;padding:1.5rem;background:rgba(239,68,68,0.1);border:1px solid var(--danger);border-radius:12px;text-align:left;">
                        <h4 style="color:var(--danger);margin-bottom:0.5rem;"><i class="fas fa-exclamation-circle"></i> Lý do từ chối:</h4>
                        <p style="margin:0;">${user.ly_do_tu_choi || 'Không có lý do cụ thể'}</p>
                    </div>
                    <button onclick="openSellerRegistration()" class="btn btn-primary" style="margin-top:2rem;">
                        <i class="fas fa-redo"></i> Đăng ký lại
                    </button>
                </div>
            `;
        } else if (user.trang_thai_xac_thuc === 'verified') {
            container.innerHTML = `
                <div class="glass-card" style="padding:3rem;text-align:center;">
                    <div style="font-size:4rem;margin-bottom:1.5rem;">✅</div>
                    <h2 style="color:var(--success);margin-bottom:1rem;">Chúc mừng! Bạn đã là Người bán</h2>
                    <p style="color:var(--dark-400);margin-bottom:2rem;">Hồ sơ của bạn đã được Admin phê duyệt. Bây giờ bạn có thể bắt đầu kinh doanh trên Vipo!</p>
                    <a href="/pages/seller/dashboard.html" class="btn btn-primary btn-lg" style="box-shadow: 0 10px 20px rgba(34, 197, 94, 0.3);">
                        <i class="fas fa-store"></i> Truy cập Kênh Người Bán Ngay
                    </a>
                </div>
            `;
        }
    } else {
        // Giao diện cho khách hàng chưa đăng ký
        container.innerHTML = `
            <div class="glass-card" style="padding:3rem;text-align:center;">
                <div style="font-size:4rem;margin-bottom:1.5rem;">🚀</div>
                <h2 style="margin-bottom:1rem;">Bắt đầu kinh doanh cùng Vipo</h2>
                <p style="color:var(--dark-400);margin-bottom:2rem;max-width:500px;margin-inline:auto;">Tiếp cận hàng triệu khách hàng và quản lý gian hàng của bạn một cách chuyên nghiệp.</p>
                <button onclick="openSellerRegistration()" class="btn btn-primary btn-lg">
                    <i class="fas fa-rocket"></i> Đăng ký ngay
                </button>
            </div>
        `;
    }
}

// Đóng modal đăng ký bán hàng
function closeSellerModal() {
    const modal = document.getElementById('seller-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Hiển thị section thông báo
function showNotificationsSection() {
    showProfileSection('notifications');
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
    initProfile();
});
