function loadTopbarUser() {
    const topbarUser = document.getElementById('topbar-user');
    if (!topbarUser) return;
    
    if (isLoggedIn()) {
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const userName = user.ho_ten || 'Tài khoản';

        let sellerLink = '';
        if (user.vai_tro === 'seller') {
            sellerLink = '<a href="/pages/seller/dashboard.html"><i class="fas fa-store"></i> Gian hàng của tôi</a>';
        } else if (user.vai_tro === 'admin') {
            sellerLink = '<a href="/pages/admin/dashboard.html"><i class="fas fa-cog"></i> Quản trị hệ thống</a>';
        }

        topbarUser.innerHTML = `
            <span class="topbar-divider">|</span>
            <div class="topbar-user-dropdown">
                <a href="#" class="topbar-link topbar-user-btn" onclick="toggleTopbarMenu(event)">
                    <i class="fas fa-user"></i> ${userName} <i class="fas fa-chevron-down"></i>
                </a>
                <div class="topbar-dropdown-content" id="topbar-dropdown">
                    <a href="/pages/profile.html"><i class="fas fa-user-circle"></i> Tài khoản của tôi</a>
                    <a href="/pages/orders.html"><i class="fas fa-box"></i> Đơn mua</a>
                    ${sellerLink}
                    <div class="topbar-dropdown-divider"></div>
                    <a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Đăng xuất</a>
                </div>
            </div>
        `;
    } else {
        topbarUser.innerHTML = `
            <span class="topbar-divider">|</span>
            <a href="/pages/register.html" class="topbar-link">Đăng Ký</a>
            <span class="topbar-divider">|</span>
            <a href="/pages/login.html" class="topbar-link">Đăng Nhập</a>
        `;
    }
}

function toggleTopbarMenu(e) {
    e.preventDefault();
    const dd = document.getElementById('topbar-dropdown');
    if (dd) dd.classList.toggle('show');
}

// Close topbar dropdown on outside click
document.addEventListener('click', (e) => {
    const dd = document.getElementById('topbar-dropdown');
    if (dd && !dd.parentElement.contains(e.target)) {
        dd.classList.remove('show');
    }
});

function searchProducts() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    const query = searchInput.value.trim();
    if (typeof applyFilters === 'function') {
        applyFilters();
    } else {
        window.location.href = `/pages/products.html?search=${encodeURIComponent(query)}`;
    }
}

// Update cart count từ API
async function updateNavbarCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (!cartCount) return;

    if (!isLoggedIn()) {
        cartCount.style.display = 'none';
        return;
    }

    const user = getUser();
    // Chỉ hiển thị giỏ hàng cho customer
    if (user && user.vai_tro !== 'customer') {
        cartCount.style.display = 'none';
        return;
    }

    try {
        const result = await api.get('/cart/count');
        if (result.success) {
            const count = result.data.count || 0;
            cartCount.textContent = count;
            cartCount.style.display = count > 0 ? 'flex' : 'none';
        }
    } catch (e) {
        // Fallback to localStorage
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + (item.so_luong || 0), 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function logout() {
    if (window.auth) window.auth.logout();
    else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// Notifications
async function updateNotificationBadge() {
    if (!isLoggedIn()) return;
    try {
        const result = await api.get('/notifications/unread-count');
        if (result.success) {
            const count = result.data.count || 0;
            const badge = document.getElementById('notification-count');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        }
    } catch (e) { console.error('Fetch notifications error:', e); }
}

async function loadNavbarNotifications() {
    if (!isLoggedIn()) return;
    try {
        const result = await api.get('/notifications?limit=5');
        const list = document.getElementById('navbar-notifications-list');
        if (result.success && list) {
            if (result.data.length === 0) {
                list.innerHTML = '<div style="padding: 15px; text-align: center; color: var(--dark-400);">Không có thông báo mới</div>';
                return;
            }
            let html = '';
            result.data.slice(0, 5).forEach(notif => {
                const isRead = notif.trang_thai === 'read';
                html += `
                    <div class="notification-item ${isRead ? 'read' : 'unread'}" style="padding: 12px 15px; border-bottom: 1px solid var(--dark-700); cursor: pointer; display: flex; gap: 10px;" onclick="window.location.href='/pages/profile.html#notifications'">
                        <div style="flex-shrink: 0; color: var(--primary); font-size: 1.2rem;">
                            <i class="fas fa-bell"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500; font-size: 0.9rem; margin-bottom: 4px; color: ${isRead ? 'var(--dark-300)' : 'var(--white)'}">${notif.tieu_de}</div>
                            <div style="font-size: 0.8rem; color: var(--dark-400); margin-bottom: 4px;">${notif.noi_dung}</div>
                            <div style="font-size: 0.75rem; color: var(--primary-dark)">${new Date(notif.ngay_tao).toLocaleString('vi-VN')}</div>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        }
    } catch (e) {
        console.error('Fetch notifications error:', e);
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            loadNavbarNotifications();
        }
    }
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notifications-dropdown');
    const btn = document.getElementById('notifications-btn');
    if (dropdown && !dropdown.contains(e.target) && !btn?.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.shopee-navbar');
    if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    loadTopbarUser();
    updateNavbarCartCount();
    updateNotificationBadge();
});

