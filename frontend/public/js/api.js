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

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar') || document.querySelector('.shopee-navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
});

