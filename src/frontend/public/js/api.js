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

    const icons = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle', info: 'fas fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="${icons[type] || icons.info}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    return toast;
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
    return url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' fill='%231e293b'%3E%3Crect width='400' height='400'/%3E%3Ctext x='200' y='190' text-anchor='middle' fill='%2364748b' font-size='18' font-family='Arial'%3E%3Ctspan x='200' dy='0'%3E%F0%9F%93%82%3C/tspan%3E%3Ctspan x='200' dy='28'%3ENo Image%3C/tspan%3E%3C/text%3E%3C/svg%3E";
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

// Global Floating Chat Widget & Socket Message Notification Listener
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (!isLoggedIn() || path.includes('/chat.html') || path.includes('/admin/')) return;

    // 1. Inject Floating Chat Styles
    const style = document.createElement('style');
    style.id = 'vipo-global-chat-styles';
    style.textContent = `
        .global-chat-popup {
            position: fixed;
            bottom: 85px;
            right: 20px;
            width: 680px;
            height: 520px;
            z-index: 9999;
            border-radius: 16px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
            display: none;
            flex-direction: column;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
            animation: slideUpChat 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideUpChat {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 20px;
            background: rgba(30, 41, 59, 0.7);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            color: white;
            cursor: pointer;
            user-select: none;
        }
        .chat-header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Outfit', sans-serif;
            font-weight: 700;
            font-size: 1.05rem;
        }
        .chat-header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .chat-header-actions button {
            background: transparent;
            border: none;
            color: #cbd5e1;
            cursor: pointer;
            font-size: 0.95rem;
            transition: color 0.2s;
            padding: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .chat-header-actions button:hover {
            color: white;
        }
        .chat-popup-body {
            display: flex;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }
        .chat-sidebar {
            width: 250px;
            border-right: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            flex-direction: column;
            background: rgba(15, 23, 42, 0.4);
            flex-shrink: 0;
        }
        .chat-search-bar {
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(30, 41, 59, 0.2);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
        }
        .chat-search-bar i {
            position: absolute;
            left: 20px;
            color: #94a3b8;
            font-size: 0.85rem;
        }
        .chat-search-bar input {
            width: 100%;
            padding: 6px 12px 6px 28px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(15, 23, 42, 0.5);
            color: white;
            font-size: 0.82rem;
            outline: none;
            transition: all 0.2s;
        }
        .chat-search-bar input:focus {
            border-color: #6366f1;
            background: rgba(15, 23, 42, 0.8);
        }
        .chat-contacts-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .chat-contact-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
            position: relative;
        }
        .chat-contact-item:hover {
            background: rgba(99, 102, 241, 0.08);
            border-color: rgba(99, 102, 241, 0.15);
        }
        .chat-contact-item.active {
            background: rgba(99, 102, 241, 0.16);
            border-color: rgba(99, 102, 241, 0.25);
        }
        .contact-avatar-wrapper {
            position: relative;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: rgba(30, 41, 59, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .contact-avatar-wrapper i {
            color: #6366f1;
            font-size: 1rem;
        }
        .contact-status-dot {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 10px;
            height: 10px;
            background: #10b981;
            border-radius: 50%;
            border: 2px solid #0f172a;
        }
        .contact-info {
            flex: 1;
            min-width: 0;
        }
        .contact-name {
            font-weight: 600;
            font-size: 0.88rem;
            color: #f1f5f9;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .contact-last-msg {
            font-size: 0.76rem;
            color: #94a3b8;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .contact-unread-badge {
            background: #ef4444;
            color: white;
            min-width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.62rem;
            font-weight: 700;
            padding: 0 4px;
            box-shadow: 0 2px 5px rgba(239, 68, 68, 0.3);
        }
        .contact-delete-btn {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            display: none;
            background: transparent;
            border: none;
            color: #ef4444;
            cursor: pointer;
            padding: 4px;
            z-index: 10;
            font-size: 0.85rem;
            transition: color 0.2s;
        }
        .contact-delete-btn:hover {
            color: #f87171;
        }
        .chat-contact-item:hover .contact-delete-btn {
            display: block;
        }
        .chat-contact-item:hover .contact-unread-badge {
            display: none;
        }
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: rgba(15, 23, 42, 0.2);
            position: relative;
            min-width: 0;
        }
        .chat-welcome {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #94a3b8;
            text-align: center;
            padding: 20px;
        }
        .welcome-icon {
            font-size: 3rem;
            color: rgba(99, 102, 241, 0.5);
            margin-bottom: 12px;
        }
        .chat-welcome h4 {
            color: #f1f5f9;
            margin-bottom: 6px;
            font-size: 1.05rem;
        }
        .chat-welcome p {
            font-size: 0.8rem;
            color: #64748b;
            max-width: 250px;
            line-height: 1.4;
        }
        .chat-active-window {
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 0;
        }
        .active-chat-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 18px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(30, 41, 59, 0.3);
            flex-shrink: 0;
        }
        .active-header-avatar {
            position: relative;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: rgba(30, 41, 59, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .active-header-avatar i {
            color: #6366f1;
            font-size: 0.9rem;
        }
        .active-header-info {
            flex: 1;
            min-width: 0;
        }
        .active-header-name {
            font-weight: 700;
            font-size: 0.9rem;
            color: #f8fafc;
        }
        .active-header-status {
            font-size: 0.68rem;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 1px;
        }
        .active-header-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #94a3b8;
            display: inline-block;
        }
        .active-header-status-dot.online {
            background: #10b981;
        }
        .active-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: linear-gradient(rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.92)), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop');
            background-size: cover;
            background-position: center;
            min-height: 0;
        }
        .msg-bubble-wrapper {
            display: flex;
            flex-direction: column;
            position: relative;
            max-width: 75%;
        }
        .msg-bubble-wrapper.user {
            align-self: flex-end;
            align-items: flex-end;
        }
        .msg-bubble-wrapper.bot {
            align-self: flex-start;
            align-items: flex-start;
        }
        .msg-bubble {
            padding: 9px 13px;
            border-radius: 12px;
            font-size: 0.85rem;
            line-height: 1.4;
            word-break: break-word;
            color: white;
            position: relative;
        }
        .msg-bubble-wrapper.user .msg-bubble {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            border-bottom-right-radius: 2px;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
        }
        .msg-bubble-wrapper.bot .msg-bubble {
            background: #334155;
            border-bottom-left-radius: 2px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .msg-status-text {
            font-size: 0.6rem;
            color: #64748b;
            margin-top: 2px;
            margin-right: 4px;
        }
        .msg-delete-btn {
            position: absolute;
            left: -24px;
            top: 50%;
            transform: translateY(-50%);
            display: none;
            background: transparent;
            border: none;
            color: #ef4444;
            cursor: pointer;
            font-size: 0.8rem;
            padding: 4px;
            transition: color 0.2s;
        }
        .msg-delete-btn:hover {
            color: #f87171;
        }
        .msg-bubble-wrapper.user:hover .msg-delete-btn {
            display: block;
        }
        .active-chat-input {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(30, 41, 59, 0.3);
            flex-shrink: 0;
        }
        .active-chat-input input {
            flex: 1;
            padding: 8px 16px;
            border-radius: 20px;
            background: rgba(15, 23, 42, 0.6);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.08);
            outline: none;
            font-size: 0.85rem;
            transition: border-color 0.2s;
        }
        .active-chat-input input:focus {
            border-color: #6366f1;
        }
        .active-chat-input button {
            background: #6366f1;
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
        }
        .active-chat-input button:hover {
            background: #4f46e5;
            transform: scale(1.05);
        }
        .chat-contacts-list::-webkit-scrollbar,
        .active-chat-messages::-webkit-scrollbar {
            width: 5px;
        }
        .chat-contacts-list::-webkit-scrollbar-track,
        .active-chat-messages::-webkit-scrollbar-track {
            background: transparent;
        }
        .chat-contacts-list::-webkit-scrollbar-thumb,
        .active-chat-messages::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }
        .chat-contacts-list::-webkit-scrollbar-thumb:hover,
        .active-chat-messages::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.4);
        }
    `;
    document.head.appendChild(style);

    // 2. Create Floating Chat Button
    const chatBtn = document.createElement('div');
    chatBtn.id = 'live-chat-toggle';
    chatBtn.className = 'chat-widget-btn';
    chatBtn.style.position = 'fixed';
    chatBtn.style.bottom = '90px';
    chatBtn.style.right = '20px';
    chatBtn.style.zIndex = '999';
    chatBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    chatBtn.style.color = 'white';
    chatBtn.style.border = 'none';
    chatBtn.style.width = '50px';
    chatBtn.style.height = '50px';
    chatBtn.style.borderRadius = '50%';
    chatBtn.style.cursor = 'pointer';
    chatBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    chatBtn.style.display = 'flex';
    chatBtn.style.alignItems = 'center';
    chatBtn.style.justifyContent = 'center';
    chatBtn.style.fontSize = '1.3rem';
    chatBtn.style.transition = 'all 0.3s ease';
    chatBtn.innerHTML = `
        <i class="fas fa-comments"></i>
        <span id="unread-chat-badge" style="display:none; position:absolute; top:-5px; right:-5px; background:var(--danger); color:white; font-size:0.7rem; font-weight:700; width:18px; height:18px; border-radius:50%; align-items:center; justify-content:center; border:2px solid white; z-index:1000; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">0</span>
    `;

    chatBtn.onmouseover = () => {
        chatBtn.style.transform = 'scale(1.1)';
        chatBtn.style.filter = 'brightness(1.1)';
    };
    chatBtn.onmouseout = () => {
        chatBtn.style.transform = 'scale(1)';
        chatBtn.style.filter = 'brightness(1)';
    };

    chatBtn.onclick = () => {
        toggleGlobalChat();
    };

    document.body.appendChild(chatBtn);

    // 3. Create Floating Chat Popup Window
    const chatPopup = document.createElement('div');
    chatPopup.id = 'vipo-global-chat-popup';
    chatPopup.className = 'global-chat-popup';
    chatPopup.innerHTML = `
        <div class="chat-popup-header" onclick="toggleGlobalChat()">
            <div class="chat-header-title">
                <i class="fas fa-comments" style="color:#10b981;"></i> Chat
                <span id="popup-unread-total" style="display:none; background:#ef4444; color:white; font-size:0.65rem; padding:2px 6px; border-radius:10px; margin-left:4px; font-weight:700;">0</span>
            </div>
            <div class="chat-header-actions" onclick="event.stopPropagation()">
                <button onclick="expandGlobalChat()" title="Mở trang toàn màn hình"><i class="fas fa-expand-alt"></i></button>
                <button onclick="toggleGlobalChat()" title="Thu nhỏ"><i class="fas fa-minus"></i></button>
            </div>
        </div>
        <div class="chat-popup-body">
            <div class="chat-sidebar">
                <div class="chat-search-bar">
                    <i class="fas fa-search"></i>
                    <input type="text" id="popup-search-input" placeholder="Tìm theo tên..." oninput="filterPopupContacts()">
                </div>
                <div class="chat-contacts-list" id="popup-contacts-container">
                    <!-- Dynamic contact list -->
                </div>
            </div>
            <div class="chat-main" id="popup-main-container">
                <div class="chat-welcome" id="popup-welcome-container">
                    <div class="welcome-icon"><i class="fas fa-comments"></i></div>
                    <h4>Chào mừng bạn đến với Vipo Chat</h4>
                    <p>Bắt đầu trò chuyện với người bán ngay!</p>
                </div>
                <div class="chat-active-window" id="popup-active-container" style="display:none;">
                    <div class="active-chat-header" id="popup-active-header">
                        <!-- Dynamic header content -->
                    </div>
                    <div class="active-chat-messages" id="popup-messages-container">
                        <!-- Dynamic messages -->
                        <div id="popup-typing-indicator" style="display:none; font-size:0.75rem; color:#94a3b8; padding:4px 10px;">
                            <i class="fas fa-circle-notch fa-spin"></i> Đang nhập...
                        </div>
                    </div>
                    <div class="active-chat-input">
                        <input type="text" id="popup-msg-input" placeholder="Nhập tin nhắn..." onkeypress="if(event.key==='Enter') sendPopupMsg()">
                        <button onclick="sendPopupMsg()"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(chatPopup);

    // 4. Floating Chat State & Functions
    let popupConversations = [];
    let currentActiveUserId = null;
    let currentActiveUserName = '';
    let socketInstance = null;
    let onlineUserSet = new Set();

    window.toggleGlobalChat = () => {
        const p = document.getElementById('vipo-global-chat-popup');
        if (!p) return;
        if (p.style.display === 'none' || p.style.display === '') {
            p.style.display = 'flex';
            loadPopupConversations();
        } else {
            p.style.display = 'none';
        }
    };

    window.expandGlobalChat = () => {
        if (currentActiveUserId) {
            window.location.href = `/pages/chat.html?userId=${currentActiveUserId}&shopName=${encodeURIComponent(currentActiveUserName)}`;
        } else {
            window.location.href = '/pages/chat.html';
        }
    };

    const loadPopupConversations = async () => {
        try {
            const r = await api.get('/chat/conversations');
            if (r.success) {
                popupConversations = r.data;
                renderPopupContacts();
                updatePopupUnreadBadgeTotal();
            }
        } catch (error) {
            console.error('Load popup conversations error:', error);
        }
    };

    const renderPopupContacts = (filterText = '') => {
        const container = document.getElementById('popup-contacts-container');
        if (!container) return;

        const filtered = popupConversations.filter(c => 
            c.ho_ten.toLowerCase().includes(filterText.toLowerCase())
        );

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b; font-size:0.75rem; padding:20px;">Không có cuộc trò chuyện nào</p>';
            return;
        }

        container.innerHTML = filtered.map(c => {
            const isOnline = onlineUserSet.has(c.user_id);
            const isActive = currentActiveUserId == c.user_id;
            return `
                <div class="chat-contact-item ${isActive ? 'active' : ''}" onclick="openPopupChat(${c.user_id}, '${c.ho_ten.replace(/'/g, "\\'")}')">
                    <div class="contact-avatar-wrapper">
                        <i class="fas fa-user"></i>
                        ${isOnline ? '<div class="contact-status-dot"></div>' : ''}
                    </div>
                    <div class="contact-info">
                        <div class="contact-name">${c.ho_ten}</div>
                        <div class="contact-last-msg">${c.last_message || 'Chưa có tin nhắn'}</div>
                    </div>
                    ${c.unread > 0 ? `<div class="contact-unread-badge">${c.unread}</div>` : ''}
                    <button class="contact-delete-btn" onclick="event.stopPropagation(); deletePopupConversation(${c.user_id})" title="Xóa hội thoại">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }).join('');
    };

    window.filterPopupContacts = () => {
        const input = document.getElementById('popup-search-input');
        if (input) {
            renderPopupContacts(input.value.trim());
        }
    };

    const updatePopupUnreadBadgeTotal = () => {
        const unreadCount = popupConversations.reduce((sum, c) => sum + (c.unread || 0), 0);
        const headerBadge = document.getElementById('popup-unread-total');
        const floatBadge = document.getElementById('unread-chat-badge');
        
        if (headerBadge) {
            if (unreadCount > 0) {
                headerBadge.textContent = unreadCount;
                headerBadge.style.display = 'inline-block';
            } else {
                headerBadge.style.display = 'none';
            }
        }
        
        if (floatBadge) {
            if (unreadCount > 0) {
                floatBadge.textContent = unreadCount;
                floatBadge.style.display = 'flex';
            } else {
                floatBadge.style.display = 'none';
            }
        }
    };

    window.openPopupChat = async (userId, name) => {
        currentActiveUserId = userId;
        currentActiveUserName = name;

        // Toggle containers
        const welcome = document.getElementById('popup-welcome-container');
        const active = document.getElementById('popup-active-container');
        if (welcome) welcome.style.display = 'none';
        if (active) active.style.display = 'flex';

        // Render header
        renderPopupActiveHeader(userId, name);

        // Render messages
        const messagesContainer = document.getElementById('popup-messages-container');
        const typingIndicator = document.getElementById('popup-typing-indicator');
        
        const messages = messagesContainer.querySelectorAll('.msg-bubble-wrapper');
        messages.forEach(m => m.remove());

        try {
            const r = await api.get(`/chat/messages/${userId}`);
            if (r.success && r.data) {
                const me = getUser() || {};
                r.data.forEach(msg => {
                    appendPopupMsgBubble(msg, msg.nguoi_gui_id === me.id);
                });
                
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                if (socketInstance) {
                    socketInstance.emit('mark_read', { nguoi_gui_id: userId });
                }
                
                loadPopupConversations();
            }
        } catch (error) {
            console.error('Fetch messages error:', error);
        }
    };

    window.visitShop = async (userId) => {
        try {
            const r = await api.get(`/shops/seller/${userId}`);
            if (r.success && r.data) {
                window.location.href = `/pages/shop.html?id=${r.data.id}`;
            } else {
                showToast('Người dùng này không có gian hàng!', 'warning');
            }
        } catch (error) {
            showToast('Người dùng này là Người mua, chưa có gian hàng!', 'warning');
        }
    };

    const renderPopupActiveHeader = (userId, name) => {
        const header = document.getElementById('popup-active-header');
        if (!header) return;
        const isOnline = onlineUserSet.has(userId);
        const minutesAgo = (userId * 7) % 45 + 5;
        const statusText = isOnline ? 'Đang hoạt động' : `Hoạt động ${minutesAgo} phút trước`;
        
        header.style.cursor = 'pointer';
        header.title = 'Xem gian hàng của người này';
        header.onclick = () => visitShop(userId);

        header.innerHTML = `
            <div class="active-header-avatar">
                <i class="fas fa-user"></i>
                ${isOnline ? '<div class="contact-status-dot"></div>' : ''}
            </div>
            <div class="active-header-info">
                <div class="active-header-name" style="display:flex; align-items:center; gap:6px;">
                    ${name} <i class="fas fa-store" style="font-size:0.75rem; color:#6366f1;" title="Gian hàng"></i>
                </div>
                <div class="active-header-status">
                    <span class="active-header-status-dot ${isOnline ? 'online' : ''}"></span>
                    ${statusText}
                </div>
            </div>
        `;
    };

    const appendPopupMsgBubble = (msg, isMine) => {
        const container = document.getElementById('popup-messages-container');
        const typingIndicator = document.getElementById('popup-typing-indicator');
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.id = `popup-msg-${msg.id}`;
        wrapper.className = `msg-bubble-wrapper ${isMine ? 'user' : 'bot'}`;

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = msg.noi_dung;

        wrapper.appendChild(bubble);

        if (isMine) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'msg-delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Thu hồi tin nhắn';
            deleteBtn.onclick = () => deletePopupMessage(msg.id, msg.nguoi_nhan_id);
            wrapper.appendChild(deleteBtn);

            const status = document.createElement('span');
            status.className = 'msg-status-text';
            status.textContent = (msg.da_doc == 1 || msg.da_doc === true) ? 'Đã xem' : 'Đã gửi';
            wrapper.appendChild(status);
        }

        container.insertBefore(wrapper, typingIndicator);
        container.scrollTop = container.scrollHeight;
    };

    window.sendPopupMsg = () => {
        const input = document.getElementById('popup-msg-input');
        if (!input || !currentActiveUserId) return;

        const content = input.value.trim();
        if (!content) return;

        if (socketInstance) {
            socketInstance.emit('send_message', {
                nguoi_nhan_id: currentActiveUserId,
                noi_dung: content
            });
            input.value = '';
        }
    };

    window.deletePopupMessage = (messageId, nguoi_nhan_id) => {
        if (confirm('Bạn có muốn thu hồi tin nhắn này không?')) {
            if (socketInstance) {
                socketInstance.emit('delete_message', { 
                    messageId, 
                    nguoi_nhan_id: currentActiveUserId || nguoi_nhan_id 
                });
            }
        }
    };

    window.deletePopupConversation = (otherUserId) => {
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện này không?')) {
            if (socketInstance) {
                socketInstance.emit('delete_conversation', { otherUserId });
            }
        }
    };

    // 5. Connect Socket and Register Socket Event Listeners
    const connectPopupSocket = () => {
        try {
            socketInstance = io({ auth: { token: getToken() } });
            
            socketInstance.on('connect', () => {
                socketInstance.emit('get_online_users');
            });

            socketInstance.on('online_users', list => {
                onlineUserSet = new Set(list);
                renderPopupContacts();
                if (currentActiveUserId) {
                    renderPopupActiveHeader(currentActiveUserId, currentActiveUserName);
                }
            });

            socketInstance.on('user_online', d => {
                onlineUserSet.add(d.userId);
                renderPopupContacts();
                if (currentActiveUserId == d.userId) {
                    renderPopupActiveHeader(currentActiveUserId, currentActiveUserName);
                }
            });

            socketInstance.on('user_offline', d => {
                onlineUserSet.delete(d.userId);
                renderPopupContacts();
                if (currentActiveUserId == d.userId) {
                    renderPopupActiveHeader(currentActiveUserId, currentActiveUserName);
                }
            });

            socketInstance.on('new_message', msg => {
                if (currentActiveUserId == msg.nguoi_gui_id) {
                    appendPopupMsgBubble(msg, false);
                    socketInstance.emit('mark_read', { nguoi_gui_id: msg.nguoi_gui_id });
                } else {
                    showToast(`Tin nhắn mới từ ${msg.ten_nguoi_gui}: ${msg.noi_dung}`, 'success');
                }
                loadPopupConversations();
            });

            socketInstance.on('message_sent', msg => {
                if (currentActiveUserId == msg.nguoi_nhan_id) {
                    appendPopupMsgBubble(msg, true);
                }
                loadPopupConversations();
            });

            socketInstance.on('messages_read', d => {
                if (currentActiveUserId == d.userId) {
                    const statuses = document.querySelectorAll('#popup-messages-container .msg-status-text');
                    statuses.forEach(el => el.textContent = 'Đã xem');
                }
            });

            socketInstance.on('user_typing', d => {
                if (currentActiveUserId == d.userId) {
                    const indicator = document.getElementById('popup-typing-indicator');
                    if (indicator) indicator.style.display = d.typing ? 'block' : 'none';
                }
            });

            socketInstance.on('message_deleted', d => {
                const bubble = document.getElementById(`popup-msg-${d.messageId}`);
                if (bubble) bubble.remove();
                loadPopupConversations();
            });

            socketInstance.on('conversation_deleted', d => {
                if (currentActiveUserId == d.userId) {
                    const welcome = document.getElementById('popup-welcome-container');
                    const active = document.getElementById('popup-active-container');
                    if (welcome) welcome.style.display = 'flex';
                    if (active) active.style.display = 'none';
                    currentActiveUserId = null;
                }
                loadPopupConversations();
            });

            socketInstance.on('error', d => {
                showToast(d.message || 'Lỗi gửi tin nhắn', 'error');
            });
        } catch (err) {
            console.error('Popup socket connect error:', err);
        }
    };

    // 6. Dynamic Socket script loader
    const loadSocketAndConnect = () => {
        if (typeof io !== 'undefined') {
            connectPopupSocket();
            return;
        }

        const socketScript = document.createElement('script');
        socketScript.src = '/socket.io/socket.io.js';
        socketScript.onload = () => {
            connectPopupSocket();
        };
        document.head.appendChild(socketScript);
    };

    loadSocketAndConnect();

    // 7. Check for auto-open URL params
    const urlUid = new URLSearchParams(window.location.search).get('userId');
    const shopName = new URLSearchParams(window.location.search).get('shopName') || 'Người bán';
    if (urlUid) {
        const p = document.getElementById('vipo-global-chat-popup');
        if (p) {
            p.style.display = 'flex';
            (async () => {
                await loadPopupConversations();
                const existing = popupConversations.find(c => c.user_id == urlUid);
                if (existing) {
                    openPopupChat(existing.user_id, existing.ho_ten);
                } else {
                    openPopupChat(parseInt(urlUid), shopName);
                }
            })();
        }
    } else {
        loadPopupConversations();
    }

    // 8. Realtime thông báo đơn hàng / yêu cầu hủy
    const ensureNotificationSocket = () => {
        if (typeof io === 'undefined') {
            const s = document.createElement('script');
            s.src = '/socket.io/socket.io.js';
            s.onload = ensureNotificationSocket;
            document.head.appendChild(s);
            return;
        }
        try {
            const notifSocket = io({ auth: { token: getToken() } });
            notifSocket.on('new_notification', (d) => {
                const isSeller = getUser()?.vai_tro === 'seller';
                const msg = d?.noi_dung || (d?.loai === 'order' ? 'Bạn có thông báo đơn hàng mới' : 'Bạn có thông báo mới');
                const url = d?.url_lien_ket || null;
                const toastEl = showToast(msg, 'success');
                if (url && toastEl) {
                    toastEl.style.cursor = 'pointer';
                    toastEl.onclick = () => { window.location.href = url; };
                }
                // Cập nhật badge nếu có
                const badge = document.getElementById('notification-count');
                if (badge) {
                    const cur = parseInt(badge.textContent || '0') || 0;
                    badge.textContent = cur + 1;
                    badge.style.display = 'inline-flex';
                }
            });
            notifSocket.on('new_order', () => {
                // Có thể emit custom event để seller dashboard cập nhật
                window.dispatchEvent(new CustomEvent('vipo:new_order'));
            });
            notifSocket.on('order_cancelled', () => {
                window.dispatchEvent(new CustomEvent('vipo:order_cancelled'));
            });
            notifSocket.on('cancel_request_created', () => {
                window.dispatchEvent(new CustomEvent('vipo:cancel_request_created'));
            });
            notifSocket.on('cancel_request_rejected', () => {
                window.dispatchEvent(new CustomEvent('vipo:cancel_request_rejected'));
            });
        } catch (e) {
            console.error('Notification socket error:', e);
        }
    };
    ensureNotificationSocket();

    // 9. Global Chatbot AI Widget - hiển thị trên mọi trang public
    const ensureChatbotWidget = () => {
        if (document.getElementById('vipo-global-chatbot')) return;
        const path = window.location.pathname;
        if (path.includes('/admin/') || path.includes('/seller/') || path.includes('chatbot.html')) return;

        // Inject styles
        const style = document.createElement('style');
        style.id = 'vipo-global-chatbot-styles';
        style.textContent = `
            #vipo-global-chatbot { position: fixed; bottom: 160px; right: 20px; z-index: 998; user-select: none; }
            #vipo-global-chatbot .gcb-btn {
                width: 52px; height: 52px; border-radius: 50%; border: none; cursor: grab;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white;
                font-size: 1.4rem; box-shadow: 0 6px 20px rgba(99,102,241,0.4);
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.2s; position: relative;
            }
            #vipo-global-chatbot .gcb-btn:hover { transform: scale(1.08); }
            #vipo-global-chatbot .gcb-btn:active { cursor: grabbing; }
            #vipo-global-chatbot .gcb-btn .gcb-badge {
                position: absolute; top: -4px; right: -4px;
                background: #ef4444; color: white; font-size: 0.6rem; font-weight: 700;
                width: 18px; height: 18px; border-radius: 50%; display: none;
                align-items: center; justify-content: center; border: 2px solid white;
            }
            #vipo-global-chatbot .gcb-panel {
                position: absolute; bottom: 62px; right: 0; width: 360px; max-width: calc(100vw - 24px);
                height: 480px; max-height: calc(100vh - 240px);
                background: rgba(15, 23, 42, 0.97); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.45);
                display: none; flex-direction: column; z-index: 998; overflow: hidden;
                animation: gcbSlideUp 0.25s cubic-bezier(0.4,0,0.2,1);
            }
            #vipo-global-chatbot .gcb-panel.show { display: flex; }
            @keyframes gcbSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            #vipo-global-chatbot .gcb-header {
                padding: 12px 16px; background: linear-gradient(135deg,#6366f1,#8b5cf6);
                display: flex; align-items: center; justify-content: space-between; color: white;
                cursor: grab;
            }
            #vipo-global-chatbot .gcb-header:active { cursor: grabbing; }
            #vipo-global-chatbot .gcb-header-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.95rem; }
            #vipo-global-chatbot .gcb-header-actions { display: flex; gap: 8px; }
            #vipo-global-chatbot .gcb-header-actions button {
                background: transparent; border: none; color: white; cursor: pointer; font-size: 0.9rem;
                display: flex; align-items: center; justify-content: center; padding: 2px;
            }
            #vipo-global-chatbot .gcb-messages {
                flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px;
                background: linear-gradient(rgba(15,23,42,0.85), rgba(15,23,42,0.85));
            }
            #vipo-global-chatbot .gcb-msg { max-width: 85%; padding: 8px 12px; border-radius: 14px; font-size: 0.85rem; line-height: 1.4; word-break: break-word; }
            #vipo-global-chatbot .gcb-msg.bot { align-self: flex-start; background: rgba(99,102,241,0.15); color: #e2e8f0; border-bottom-left-radius: 4px; }
            #vipo-global-chatbot .gcb-msg.user { align-self: flex-end; background: linear-gradient(135deg,#6366f1,#4f46e5); color: white; border-bottom-right-radius: 4px; }
            #vipo-global-chatbot .gcb-msg.typing { font-style: italic; opacity: 0.7; }
            #vipo-global-chatbot .gcb-msg.typing::after { content: '...'; animation: gcbDots 1.2s infinite; }
            @keyframes gcbDots { 0%,20% { content: '.'; } 40% { content: '..'; } 60%,100% { content: '...'; } }
            #vipo-global-chatbot .gcb-input {
                padding: 10px 12px; display: flex; gap: 8px; border-top: 1px solid rgba(255,255,255,0.08);
            }
            #vipo-global-chatbot .gcb-input input {
                flex: 1; padding: 9px 14px; border-radius: 22px; border: 1px solid rgba(255,255,255,0.08);
                background: rgba(15,23,42,0.6); color: white; font-size: 0.85rem; outline: none;
            }
            #vipo-global-chatbot .gcb-input input:focus { border-color: #6366f1; }
            #vipo-global-chatbot .gcb-input button {
                width: 38px; height: 38px; border-radius: 50%; border: none;
                background: #6366f1; color: white; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
            }
            #vipo-global-chatbot .gcb-input button:hover { background: #4f46e5; }
            #vipo-global-chatbot .gcb-suggestions { padding: 0 12px 8px; display: flex; flex-wrap: wrap; gap: 6px; }
            #vipo-global-chatbot .gcb-suggestions button {
                background: rgba(99,102,241,0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.2);
                padding: 4px 10px; border-radius: 14px; font-size: 0.75rem; cursor: pointer;
            }
            #vipo-global-chatbot .gcb-suggestions button:hover { background: rgba(99,102,241,0.25); }
            @media (max-width: 480px) {
                #vipo-global-chatbot .gcb-panel { right: 12px; left: 12px; width: auto; bottom: 62px; }
            }
        `;
        document.head.appendChild(style);

        const widget = document.createElement('div');
        widget.id = 'vipo-global-chatbot';
        widget.innerHTML = `
            <button class="gcb-btn" title="Trợ lý AI Vipo" id="gcbToggle">
                <i class="fas fa-robot"></i>
                <span class="gcb-badge" id="gcbBadge">1</span>
            </button>
            <div class="gcb-panel" id="gcbPanel">
                <div class="gcb-header">
                    <div class="gcb-header-title"><i class="fas fa-robot"></i> Trợ lý Vipo AI</div>
                    <div class="gcb-header-actions">
                        <button onclick="window.open('/pages/chatbot.html','_blank')" title="Mở toàn màn hình"><i class="fas fa-expand"></i></button>
                        <button onclick="window.toggleGlobalChatbot()" title="Đóng"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="gcb-messages" id="gcbMessages">
                    <div class="gcb-msg bot">Xin chào! 👋 Tôi là <strong>trợ lý AI Vipo</strong>. Hỏi tôi bất cứ điều gì về mua hàng, đơn hàng, thanh toán, đổi trả...</div>
                </div>
                <div class="gcb-suggestions" id="gcbSuggestions">
                    <button onclick="window.gcbAsk('Làm sao để đặt hàng?')">Đặt hàng</button>
                    <button onclick="window.gcbAsk('Các phương thức thanh toán')">Thanh toán</button>
                    <button onclick="window.gcbAsk('Chính sách đổi trả')">Đổi trả</button>
                    <button onclick="window.gcbAsk('Thời gian giao hàng')">Giao hàng</button>
                </div>
                <div class="gcb-input">
                    <input type="text" id="gcbInput" placeholder="Nhập câu hỏi..." autocomplete="off">
                    <button onclick="window.gcbSend()" aria-label="Gửi"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        document.body.appendChild(widget);

        const panel = document.getElementById('gcbPanel');
        const messagesEl = document.getElementById('gcbMessages');
        const inputEl = document.getElementById('gcbInput');
        const badge = document.getElementById('gcbBadge');

        let isOpen = false;
        let hasInteracted = false;

        window.toggleGlobalChatbot = () => {
            isOpen = !isOpen;
            panel.classList.toggle('show', isOpen);
            if (isOpen) {
                badge.style.display = 'none';
                hasInteracted = true;
                setTimeout(() => inputEl.focus(), 200);
            }
        };

        // Drag-and-drop implementation
        const widgetContainer = document.getElementById('vipo-global-chatbot');
        const dragHandle = document.getElementById('gcbToggle');
        const headerHandle = panel.querySelector('.gcb-header');
        
        let isDragging = false;
        let hasDragged = false;
        let startX, startY;
        let initialX, initialY;

        const startDrag = (e) => {
            // Only drag on left click or touch
            if (e.type === 'mousedown' && e.button !== 0) return;
            
            // Check if we clicked on close or expand buttons inside header
            if (e.target.closest('.gcb-header-actions') || e.target.closest('button:not(.gcb-btn)')) {
                return;
            }
            
            isDragging = true;
            hasDragged = false;
            
            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            
            const rect = widgetContainer.getBoundingClientRect();
            
            // Fix positioning to top/left so it drags smoothly
            widgetContainer.style.bottom = 'auto';
            widgetContainer.style.right = 'auto';
            widgetContainer.style.left = rect.left + 'px';
            widgetContainer.style.top = rect.top + 'px';
            
            initialX = rect.left;
            initialY = rect.top;
            startX = clientX;
            startY = clientY;
            
            dragHandle.style.cursor = 'grabbing';
            headerHandle.style.cursor = 'grabbing';
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('touchend', stopDrag);
            
            if (e.type === 'mousedown') {
                e.preventDefault();
            }
        };

        const drag = (e) => {
            if (!isDragging) return;
            
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            
            const dx = clientX - startX;
            const dy = clientY - startY;
            
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                hasDragged = true;
            }
            
            let newX = initialX + dx;
            let newY = initialY + dy;
            
            // Boundary constraints (keep widget within the window viewport)
            const rect = widgetContainer.getBoundingClientRect();
            const minX = 10;
            const minY = 10;
            const maxX = window.innerWidth - rect.width - 10;
            const maxY = window.innerHeight - rect.height - 10;
            
            newX = Math.max(minX, Math.min(newX, maxX));
            newY = Math.max(minY, Math.min(newY, maxY));
            
            widgetContainer.style.left = newX + 'px';
            widgetContainer.style.top = newY + 'px';
            
            // Dynamically align chat panel to left or right based on screen half
            if (newX < window.innerWidth / 2) {
                panel.style.left = '0';
                panel.style.right = 'auto';
            } else {
                panel.style.right = '0';
                panel.style.left = 'auto';
            }
            
            if (e.cancelable) {
                e.preventDefault();
            }
        };

        const stopDrag = () => {
            isDragging = false;
            
            dragHandle.style.cursor = 'grab';
            headerHandle.style.cursor = 'grab';
            
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('touchend', stopDrag);
            
            // Clean up global drag properties after a short delay
            setTimeout(() => {
                hasDragged = false;
            }, 50);
        };

        dragHandle.addEventListener('mousedown', startDrag);
        dragHandle.addEventListener('touchstart', startDrag, { passive: true });
        headerHandle.addEventListener('mousedown', startDrag);
        headerHandle.addEventListener('touchstart', startDrag, { passive: true });

        // Check if dragged when clicking the toggle button
        dragHandle.addEventListener('click', (e) => {
            if (hasDragged) {
                e.stopPropagation();
                e.preventDefault();
                return;
            }
            window.toggleGlobalChatbot();
        });

        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.gcbSend();
        });

        window.gcbAsk = (q) => {
            inputEl.value = q;
            window.gcbSend();
        };

        window.gcbSend = async () => {
            const message = inputEl.value.trim();
            if (!message) return;

            const userMsg = document.createElement('div');
            userMsg.className = 'gcb-msg user';
            userMsg.textContent = message;
            messagesEl.appendChild(userMsg);
            inputEl.value = '';
            messagesEl.scrollTop = messagesEl.scrollHeight;

            const typing = document.createElement('div');
            typing.className = 'gcb-msg bot typing';
            typing.textContent = 'Đang suy nghĩ';
            messagesEl.appendChild(typing);
            messagesEl.scrollTop = messagesEl.scrollHeight;

            try {
                const r = await api.post('/chatbot', { message });
                typing.classList.remove('typing');
                typing.textContent = r.data?.response || r.message || 'Xin lỗi, tôi chưa hiểu câu hỏi.';
            } catch (err) {
                typing.classList.remove('typing');
                typing.textContent = '❌ Lỗi kết nối, vui lòng thử lại sau.';
            }
            messagesEl.scrollTop = messagesEl.scrollHeight;
        };
    };
    ensureChatbotWidget();
});

