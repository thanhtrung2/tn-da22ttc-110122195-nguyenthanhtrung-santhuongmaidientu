// ==========================================
// API Wrapper - Fetch API with JWT
// ==========================================

const API_BASE = '/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('token');
const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');
const isLoggedIn = () => !!getToken();

// API call wrapper
const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {};

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: { ...headers, ...options.headers }
            });

            const data = await response.json();

            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('login')) {
                    window.location.href = '/pages/login.html';
                }
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, message: 'Lỗi kết nối server' };
        }
    },

    get(endpoint) {
        return this.request(endpoint);
    },

    post(endpoint, data) {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return this.request(endpoint, { method: 'POST', body });
    },

    put(endpoint, data) {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return this.request(endpoint, { method: 'PUT', body });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// ==========================================
// Auth helpers
// ==========================================
const auth = {
    login(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    },
    getUser,
    isLoggedIn,
    getToken,
    isAdmin: () => getUser()?.vai_tro === 'admin',
    isSeller: () => getUser()?.vai_tro === 'seller',
    isCustomer: () => getUser()?.vai_tro === 'customer',
};

// ==========================================
// UI Helpers
// ==========================================

// Toast notification
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const icons = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="${icons[type] || icons.success}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Format currency VND
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Star rating HTML
function renderStars(rating, count) {
    const full = Math.floor(rating || 0);
    const half = (rating || 0) % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let stars = '';
    for (let i = 0; i < full; i++) stars += '<i class="fas fa-star"></i>';
    if (half) stars += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < empty; i++) stars += '<i class="far fa-star"></i>';
    return `<span class="stars">${stars}</span> <span>(${count || 0})</span>`;
}

// Order status label
function getStatusLabel(status) {
    const labels = {
        'cho_xac_nhan': 'Chờ xác nhận',
        'da_xac_nhan': 'Đã xác nhận',
        'dang_giao': 'Đang giao',
        'hoan_thanh': 'Hoàn thành',
        'da_huy': 'Đã hủy'
    };
    return labels[status] || status;
}

function getStatusClass(status) {
    const classes = {
        'cho_xac_nhan': 'status-pending',
        'da_xac_nhan': 'status-confirmed',
        'dang_giao': 'status-shipping',
        'hoan_thanh': 'status-completed',
        'da_huy': 'status-cancelled'
    };
    return classes[status] || '';
}

// Default product image
function getProductImage(url) {
    return url || 'https://via.placeholder.com/400x400/1e293b/64748b?text=No+Image';
}

// Loading skeleton
function showLoading(container, count = 4) {
    let html = '<div class="products-grid">';
    for (let i = 0; i < count; i++) {
        html += `<div class="glass-card" style="overflow:hidden">
            <div class="skeleton" style="padding-top:100%"></div>
            <div style="padding:1rem"><div class="skeleton" style="height:16px;margin-bottom:8px"></div>
            <div class="skeleton" style="height:14px;width:60%"></div></div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ==========================================
// Navigation
// ==========================================
function updateNavbar() {
    const user = getUser();
    const navActions = document.getElementById('nav-actions');
    if (!navActions) return;

    if (user) {
        let dashboardLink = '';
        if (user.vai_tro === 'admin') {
            dashboardLink = '<a href="/pages/admin/dashboard.html"><i class="fas fa-cog"></i> Quản trị</a>';
        } else if (user.vai_tro === 'seller') {
            dashboardLink = '<a href="/pages/seller/dashboard.html"><i class="fas fa-store"></i> Gian hàng</a>';
        }

        navActions.innerHTML = `
            <a href="/pages/chat.html" class="nav-btn" title="Chat"><i class="fas fa-comments"></i><span class="hide-mobile"> Chat</span></a>
            <a href="/pages/cart.html" class="nav-btn" title="Giỏ hàng" id="cart-btn">
                <i class="fas fa-shopping-cart"></i><span class="hide-mobile"> Giỏ hàng</span>
                <span class="cart-badge" id="cart-count" style="display:none">0</span>
            </a>
            <div class="user-menu">
                <button class="nav-btn" onclick="toggleUserMenu()" id="user-menu-btn">
                    <i class="fas fa-user-circle"></i> ${user.ho_ten.split(' ').pop()}
                    <i class="fas fa-chevron-down" style="font-size:0.7rem"></i>
                </button>
                <div class="user-dropdown" id="user-dropdown">
                    <a href="/pages/profile.html"><i class="fas fa-user"></i> Tài khoản</a>
                    <a href="/pages/orders.html"><i class="fas fa-box"></i> Đơn hàng</a>
                    <a href="/pages/complaint.html"><i class="fas fa-flag"></i> Khiếu nại</a>
                    ${dashboardLink}
                    <div class="divider"></div>
                    <button onclick="auth.logout()"><i class="fas fa-sign-out-alt"></i> Đăng xuất</button>
                </div>
            </div>
        `;
        updateCartCount();
    } else {
        navActions.innerHTML = `
            <a href="/pages/login.html" class="nav-btn"><i class="fas fa-sign-in-alt"></i> Đăng nhập</a>
            <a href="/pages/register.html" class="nav-btn primary"><i class="fas fa-user-plus"></i> Đăng ký</a>
        `;
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('show');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    const btn = document.getElementById('user-menu-btn');
    if (dropdown && !dropdown.contains(e.target) && !btn?.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

async function updateCartCount() {
    if (!isLoggedIn()) return;
    const result = await api.get('/cart/count');
    if (result.success) {
        const badge = document.getElementById('cart-count');
        if (badge) {
            badge.textContent = result.data.count;
            badge.style.display = result.data.count > 0 ? 'flex' : 'none';
        }
    }
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});
