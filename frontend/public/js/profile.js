// ==========================================
// Profile Management
// ==========================================

let currentUser = null;
let currentOrderFilter = 'all';
let currentNotificationFilter = 'all';
let currentVoucherFilter = 'available';

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

    // Load addresses
    await loadAddresses();

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

    // Show shop name in sidebar if seller
    const shopNameEl = document.getElementById('sidebar-shop-name');
    const shopNameText = document.getElementById('sidebar-shop-name-text');
    if (shopNameEl && shopNameText) {
        if (user.vai_tro === 'seller' && (user.ten_gian_hang || user.ten_shop)) {
            const shopName = user.ten_gian_hang || user.ten_shop;
            shopNameText.textContent = shopName;
            shopNameEl.style.display = 'block';
            if (user.gian_hang_id) {
                shopNameEl.style.cursor = 'pointer';
                shopNameEl.onclick = () => window.open(`/pages/shop.html?id=${user.gian_hang_id}`, '_blank');
                shopNameEl.title = 'Xem shop công khai';
            }
        } else {
            shopNameEl.style.display = 'none';
        }
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
    const ly_do = prompt('Vui lòng nhập lý do hủy đơn hàng:');
    if (ly_do === null) return;
    if (!ly_do.trim()) {
        showToast('Vui lòng nhập lý do hủy đơn', 'error');
        return;
    }

    const result = await api.put(`/orders/${orderId}/cancel`, { ly_do: ly_do.trim() });
    if (result.success) {
        showToast(result.message || 'Hủy đơn hàng thành công');
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
            currentVoucherFilter = tab.dataset.type;
            loadVouchers();
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
    } else if (sectionName === 'addresses') {
        loadAddresses();
    } else if (sectionName === 'vouchers') {
        loadVouchers();
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
            const shopName = user.ten_gian_hang || user.ten_shop || 'Gian hàng của tôi';
            const shopId = user.gian_hang_id || user.shop_id;
            const moTa = user.mo_ta_gian_hang || user.mo_ta_shop || '';
            const trangThai = user.trang_thai_gian_hang || user.trang_thai_shop || 'active';
            const shopLink = shopId ? `/pages/shop.html?id=${shopId}` : '#';
            container.innerHTML = `
                <div class="glass-card" style="padding:2.5rem;">
                    <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;">
                        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg, var(--primary), var(--secondary));display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-store" style="font-size:2rem;color:white;"></i>
                        </div>
                        <div style="flex:1;min-width:200px;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                                <h2 style="color:var(--success);font-size:1.3rem;margin:0;">${shopName}</h2>
                                <span class="status-badge status-approved"><i class="fas fa-check-circle"></i> Đã xác thực</span>
                            </div>
                            <p style="color:var(--dark-400);margin:0 0 0.5rem 0;font-size:0.9rem;">${moTa || 'Gian hàng chính thức trên Vipo'}</p>
                            <div style="font-size:0.8rem;color:var(--dark-500);">Mã shop: #${shopId || 'N/A'} · Trạng thái: <span style="color:${trangThai === 'active' ? 'var(--success)' : 'var(--warning)'};font-weight:600;">${trangThai === 'active' ? 'Đang hoạt động' : trangThai}</span></div>
                        </div>
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap;">
                        <a href="/pages/seller/dashboard.html" class="btn btn-primary" style="flex:1;min-width:160px;">
                            <i class="fas fa-tachometer-alt"></i> Kênh Người Bán
                        </a>
                        <a href="${shopLink}" target="_blank" class="btn btn-outline" style="flex:1;min-width:160px;">
                            <i class="fas fa-external-link-alt"></i> Xem Shop Công Khai
                        </a>
                    </div>
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

// Cache địa chỉ
let addressesCache = [];

// Tải danh sách địa chỉ của người dùng
async function loadAddresses() {
    try {
        const container = document.getElementById('profile-addresses-container');
        if (!container) return;
        
        container.innerHTML = '<div class="spinner" style="margin:2rem auto;"></div>';

        const result = await api.get('/addresses');
        if (result.success) {
            addressesCache = result.data;
            if (addressesCache.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:3rem;color:var(--dark-400);">
                        <i class="fas fa-map-marker-alt" style="font-size:3rem;color:var(--dark-600);opacity:0.5;margin-bottom:1rem;display:block;"></i>
                        Bạn chưa lưu địa chỉ nhận hàng nào.
                    </div>
                `;
                return;
            }

            let html = '';
            addressesCache.forEach(addr => {
                html += `
                    <div class="glass-card" style="padding:1.5rem; display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <div style="flex:1; text-align:left;">
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                                <strong style="font-size:0.95rem; color:var(--white);">${addr.ho_ten}</strong>
                                <span style="color:var(--dark-400); font-size:0.85rem;">|</span>
                                <span style="color:var(--dark-300); font-size:0.85rem;">${addr.so_dien_thoai}</span>
                                ${addr.la_mac_dinh ? '<span style="background:rgba(239, 68, 68, 0.15); color:var(--danger); border: 1px solid var(--danger); font-size:0.7rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:8px;">MẶC ĐỊNH</span>' : ''}
                            </div>
                            <div style="color:var(--dark-300); font-size:0.85rem; line-height:1.4;">${addr.dia_chi}</div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:10px; margin-left:1.5rem;">
                            <div style="display:flex; gap:10px;">
                                <button class="btn btn-outline btn-sm" onclick="openAddressModal(${addr.id})">Sửa</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteAddress(${addr.id})">Xóa</button>
                            </div>
                            ${!addr.la_mac_dinh ? `<button class="btn btn-outline btn-sm" style="font-size:0.75rem; padding:4px 8px; border-color:var(--dark-500); color:var(--dark-300);" onclick="setDefaultAddr(${addr.id})">Thiết lập mặc định</button>` : ''}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `<p style="color:var(--danger);text-align:center;">${result.message || 'Lỗi khi tải địa chỉ'}</p>`;
        }
    } catch (error) {
        console.error('Load addresses error:', error);
    }
}

// Load location data from API
let locationDataProfile = [];
async function loadProvincesDataProfile() {
    if (locationDataProfile.length > 0) return;
    try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=3');
        locationDataProfile = await response.json();
    } catch (e) {
        console.error('Lỗi khi tải danh sách địa giới hành chính', e);
    }
}

window.loadDistrictsProfile = function() {
    const provinceCode = document.getElementById('addr-province').value;
    const districtSelect = document.getElementById('addr-district');
    const wardSelect = document.getElementById('addr-ward');
    if (!districtSelect || !wardSelect) return;
    
    districtSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
    wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
    
    if (provinceCode && locationDataProfile.length > 0) {
        const province = locationDataProfile.find(p => p.code == provinceCode);
        if (province && province.districts) {
            districtSelect.innerHTML += province.districts.map(d => `<option value="${d.code}">${d.name}</option>`).join('');
        }
    }
};

window.loadWardsProfile = function() {
    const provinceCode = document.getElementById('addr-province').value;
    const districtCode = document.getElementById('addr-district').value;
    const wardSelect = document.getElementById('addr-ward');
    if (!wardSelect) return;
    
    wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
    
    if (provinceCode && districtCode && locationDataProfile.length > 0) {
        const province = locationDataProfile.find(p => p.code == provinceCode);
        if (province) {
            const district = province.districts.find(d => d.code == districtCode);
            if (district && district.wards) {
                wardSelect.innerHTML += district.wards.map(w => `<option value="${w.code}">${w.name}</option>`).join('');
            }
        }
    }
};

// Mở modal địa chỉ
async function openAddressModal(id = null) {
    const modal = document.getElementById('address-modal');
    const title = document.getElementById('address-modal-title');
    const inputId = document.getElementById('address-id');
    const name = document.getElementById('addr-name');
    const phone = document.getElementById('addr-phone');
    const detail = document.getElementById('addr-detail');
    const isDefault = document.getElementById('addr-default');
    
    const provinceSelect = document.getElementById('addr-province');
    const districtSelect = document.getElementById('addr-district');
    const wardSelect = document.getElementById('addr-ward');

    if (!modal || !name || !phone || !detail) return;

    // Load location data first
    await loadProvincesDataProfile();

    // Reset selectors
    if (provinceSelect) {
        provinceSelect.innerHTML = '<option value="">Chọn Tỉnh/Thành phố</option>' + 
            locationDataProfile.map(p => `<option value="${p.code}">${p.name}</option>`).join('');
    }
    if (districtSelect) districtSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
    if (wardSelect) wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';

    if (id) {
        title.textContent = 'Cập Nhật Địa Chỉ';
        inputId.value = id;
        const addr = addressesCache.find(a => a.id == id);
        if (addr) {
            name.value = addr.ho_ten;
            phone.value = addr.so_dien_thoai;
            isDefault.checked = addr.la_mac_dinh === 1;
            isDefault.disabled = addr.la_mac_dinh === 1; // Khóa checkbox nếu đang là mặc định
            
            // Parse saved address
            let detailVal = addr.dia_chi;
            const parts = addr.dia_chi.split(',').map(p => p.trim());
            if (parts.length >= 4 && locationDataProfile.length > 0) {
                const provName = parts[parts.length - 1];
                const distName = parts[parts.length - 2];
                const wardName = parts[parts.length - 3];
                detailVal = parts.slice(0, parts.length - 3).join(', ');

                // Find province
                const province = locationDataProfile.find(p => p.name.toLowerCase() === provName.toLowerCase());
                if (province) {
                    provinceSelect.value = province.code;
                    
                    // Populate and select district
                    districtSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>' + 
                        province.districts.map(d => `<option value="${d.code}">${d.name}</option>`).join('');
                    
                    const district = province.districts.find(d => d.name.toLowerCase() === distName.toLowerCase());
                    if (district) {
                        districtSelect.value = district.code;
                        
                        // Populate and select ward
                        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>' + 
                            district.wards.map(w => `<option value="${w.code}">${w.name}</option>`).join('');
                        
                        const ward = district.wards.find(w => w.name.toLowerCase() === wardName.toLowerCase());
                        if (ward) {
                            wardSelect.value = ward.code;
                        }
                    }
                }
            }
            detail.value = detailVal;
        }
    } else {
        title.textContent = 'Thêm Địa Chỉ Mới';
        inputId.value = '';
        name.value = '';
        phone.value = '';
        detail.value = '';
        isDefault.checked = addressesCache.length === 0; // Địa chỉ đầu tiên auto là mặc định
        isDefault.disabled = addressesCache.length === 0;
    }

    modal.style.display = 'flex';
}

// Đóng modal địa chỉ
function closeAddressModal() {
    const modal = document.getElementById('address-modal');
    if (modal) modal.style.display = 'none';
}

// Lưu địa chỉ (Thêm mới/Cập nhật)
async function saveAddress() {
    const id = document.getElementById('address-id').value;
    const name = document.getElementById('addr-name').value.trim();
    const phone = document.getElementById('addr-phone').value.trim();
    const detail = document.getElementById('addr-detail').value.trim();
    const isDefault = document.getElementById('addr-default').checked;
    
    const provSelect = document.getElementById('addr-province');
    const distSelect = document.getElementById('addr-district');
    const wardSelect = document.getElementById('addr-ward');

    if (!name || !phone || !detail || !provSelect || !distSelect || !wardSelect || !provSelect.value || !distSelect.value || !wardSelect.value) {
        showToast('Vui lòng nhập đầy đủ thông tin và chọn địa chỉ', 'error');
        return;
    }

    if (!/^[0-9]{10}$/.test(phone.replace(/\D/g, ''))) {
        showToast('Số điện thoại không hợp lệ (yêu cầu 10 chữ số)', 'error');
        return;
    }

    const pName = provSelect.options[provSelect.selectedIndex].text;
    const dName = distSelect.options[distSelect.selectedIndex].text;
    const wName = wardSelect.options[wardSelect.selectedIndex].text;
    const fullAddress = `${detail}, ${wName}, ${dName}, ${pName}`;

    const payload = {
        ho_ten: name,
        so_dien_thoai: phone,
        dia_chi: fullAddress,
        la_mac_dinh: isDefault
    };

    try {
        let result;
        if (id) {
            result = await api.put(`/addresses/${id}`, payload);
        } else {
            result = await api.post('/addresses', payload);
        }

        if (result.success) {
            showToast(id ? 'Cập nhật địa chỉ thành công' : 'Thêm địa chỉ thành công');
            closeAddressModal();
            await loadAddresses();
        } else {
            showToast(result.message || 'Lỗi khi lưu địa chỉ', 'error');
        }
    } catch (error) {
        console.error('Save address error:', error);
        showToast('Lỗi server khi lưu địa chỉ', 'error');
    }
}

// Xóa địa chỉ
async function deleteAddress(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;

    try {
        const result = await api.delete(`/addresses/${id}`);
        if (result.success) {
            showToast('Xóa địa chỉ thành công');
            await loadAddresses();
        } else {
            showToast(result.message || 'Lỗi khi xóa địa chỉ', 'error');
        }
    } catch (error) {
        console.error('Delete address error:', error);
    }
}

// Thiết lập địa chỉ mặc định
async function setDefaultAddr(id) {
    try {
        const result = await api.put(`/addresses/${id}/default`, {});
        if (result.success) {
            showToast('Đã đặt làm địa chỉ mặc định');
            await loadAddresses();
        } else {
            showToast(result.message || 'Lỗi khi đặt địa chỉ mặc định', 'error');
        }
    } catch (error) {
        console.error('Set default address error:', error);
    }
}

// Load Vouchers
async function loadVouchers() {
    try {
        const container = document.getElementById('vouchers-container');
        if (!container) return;
        
        container.innerHTML = '<div class="spinner" style="margin:2rem auto;"></div>';

        const result = await api.get('/promotions/wallet');
        if (!result.success) {
            container.innerHTML = `<p style="color:var(--danger);text-align:center;">${result.message || 'Lỗi tải mã giảm giá'}</p>`;
            return;
        }

        const now = new Date();
        let vouchers = result.data;
        
        // Lọc theo currentVoucherFilter
        if (currentVoucherFilter === 'available') {
            vouchers = vouchers.filter(v => v.trang_thai_vi === 'chua_dung' && new Date(v.ngay_ket_thuc) >= now);
        } else if (currentVoucherFilter === 'used') {
            vouchers = vouchers.filter(v => v.trang_thai_vi === 'da_dung');
        } else if (currentVoucherFilter === 'expired') {
            vouchers = vouchers.filter(v => v.trang_thai_vi === 'chua_dung' && new Date(v.ngay_ket_thuc) < now);
        }

        if (vouchers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt" style="font-size: 3rem; color: #d1d5db; margin-bottom: 1rem;"></i>
                    <h3 style="color: #6b7280; margin-bottom: 0.5rem;">Không có mã giảm giá nào</h3>
                    <p style="color: #9ca3af;">Hãy mua sắm để nhận thêm nhiều ưu đãi!</p>
                </div>
            `;
            return;
        }

        let html = '';
        vouchers.forEach(v => {
            const isPercent = v.loai === 'phan_tram';
            const isFreeship = v.loai === 'mien_phi_van_chuyen';
            const discountText = isPercent ? `Giảm ${v.gia_tri}%` : (isFreeship ? 'Miễn phí vận chuyển' : `Giảm ${formatPrice(v.gia_tri)}`);
            const iconClass = isFreeship ? 'fas fa-truck' : (isPercent ? 'fas fa-percent' : 'fas fa-tag');
            const minOrderText = v.don_toi_thieu > 0 ? `Đơn tối thiểu ${formatPrice(v.don_toi_thieu)}` : 'Áp dụng cho mọi đơn hàng';
            const expired = new Date(v.ngay_ket_thuc) < now;
            const filterClass = (currentVoucherFilter !== 'available') ? 'grayscale' : '';

            html += `
                <div class="voucher-card ${filterClass}" style="position: relative; margin-bottom: 1rem; border: 1px dashed var(--primary); background: linear-gradient(135deg, rgba(238,77,45,0.05) 0%, rgba(15,23,42,0.95) 100%);">
                    <div class="voucher-icon" style="background: var(--gradient-primary); color: white; border-radius: 8px 0 0 8px; width: 80px; display: flex; align-items: center; justify-content: center;">
                        ${v.logo ? `<img src="${v.logo}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` : `<i class="${iconClass}" style="font-size: 2rem;"></i>`}
                    </div>
                    <div class="voucher-info" style="padding: 1rem; flex: 1;">
                        <h4 style="margin: 0 0 0.25rem 0; color: var(--white); font-size: 1.1rem;">${discountText}</h4>
                        <p style="margin: 0 0 0.5rem 0; color: var(--dark-300); font-size: 0.85rem;">${minOrderText} - ${v.ten_gian_hang}</p>
                        <div class="voucher-code" style="display: inline-block; background: var(--dark-700); padding: 0.2rem 0.6rem; border-radius: 4px; color: var(--primary-light); font-weight: bold; font-family: 'Outfit'; font-size: 0.8rem; margin-bottom: 0.5rem;">Mã: ${v.ten_khuyen_mai}</div>
                        <div class="voucher-expiry" style="color: ${expired ? 'var(--danger)' : 'var(--dark-400)'}; font-size: 0.75rem;">
                            ${expired ? 'Đã hết hạn' : `HSD: ${v.ngay_ket_thuc.split('T')[0]}`}
                        </div>
                    </div>
                    <div class="voucher-action" style="padding: 1rem; display: flex; align-items: center; justify-content: center; border-left: 1px dashed rgba(238,77,45,0.3);">
                        <button class="btn ${currentVoucherFilter === 'available' ? 'btn-primary' : 'btn-outline'}" ${currentVoucherFilter !== 'available' ? 'disabled' : ''} onclick="window.location.href='/pages/shop.html?id=${v.gian_hang_id}'">
                            ${currentVoucherFilter === 'available' ? 'Dùng ngay' : (currentVoucherFilter === 'used' ? 'Đã dùng' : 'Hết hạn')}
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Load vouchers error:', error);
    }
}


// Init on page load
document.addEventListener('DOMContentLoaded', () => {
    initProfile();
});
