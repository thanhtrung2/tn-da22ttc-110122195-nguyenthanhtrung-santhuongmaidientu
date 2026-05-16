// ==========================================
// Products & Categories Management
// ==========================================

// Lấy danh mục sản phẩm
async function loadCategories() {
    try {
        const result = await api.get('/products/categories');
        if (result.success) {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error('Load categories error:', error);
        return [];
    }
}

// Hiển thị danh mục trên trang index
async function displayCategories() {
    const container = document.getElementById('categories-grid');
    if (!container) return;

    const categories = await loadCategories();
    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--dark-400);">Không có danh mục nào</p>';
        return;
    }

    let html = '';
    categories.forEach(cat => {
        html += `
            <div class="glass-card category-card" onclick="filterByCategory(${cat.id})" style="cursor:pointer;transition:all 0.3s;padding:1.5rem;text-align:center;">
                <div style="font-size:2.5rem;margin-bottom:0.5rem;">
                    <i class="fas fa-${getCategoryIcon(cat.ten_danh_muc)}"></i>
                </div>
                <h4 style="margin:0.5rem 0;">${cat.ten_danh_muc}</h4>
                <p style="color:var(--dark-400);font-size:0.9rem;margin:0;">Khám phá ngay</p>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Lấy icon cho danh mục
function getCategoryIcon(categoryName) {
    const icons = {
        'Điện tử': 'laptop',
        'Thời trang': 'shirt',
        'Sách': 'book',
        'Thể thao': 'dumbbell',
        'Nhà cửa': 'home',
        'Mỹ phẩm': 'spa',
        'Đồ chơi': 'gamepad',
        'Thực phẩm': 'utensils'
    };
    return icons[categoryName] || 'box';
}

// Lấy sản phẩm nổi bật
async function loadFeaturedProducts() {
    try {
        const result = await api.get('/products?sort=rating&limit=8');
        if (result.success) {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error('Load featured products error:', error);
        return [];
    }
}

// Lấy sản phẩm mới nhất
async function loadNewProducts() {
    try {
        const result = await api.get('/products?sort=newest&limit=8');
        if (result.success) {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error('Load new products error:', error);
        return [];
    }
}

// Hiển thị sản phẩm
function displayProducts(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--dark-400);grid-column:1/-1;">Không có sản phẩm nào</p>';
        return;
    }

    let html = '';
    products.forEach(product => {
        const price = product.gia_khuyen_mai && product.gia_khuyen_mai < product.gia ? product.gia_khuyen_mai : product.gia;
        const discount = product.gia_khuyen_mai ? Math.round((1 - product.gia_khuyen_mai / product.gia) * 100) : 0;
        const rating = product.diem_trung_binh || 0;
        const reviewCount = product.so_danh_gia || 0;

        html += `
            <div class="glass-card product-card" onclick="goToProduct(${product.id})">
                <div class="product-image-container">
                    <img src="${getProductImage(product.hinh_anh)}" alt="${product.ten_san_pham}" class="product-image">
                    ${discount > 0 ? `<div class="product-discount">-${discount}%</div>` : ''}
                    <div class="product-actions">
                        <button class="action-btn" onclick="event.stopPropagation(); addToCartQuick(${product.id})" title="Thêm vào giỏ">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                        <button class="action-btn" onclick="event.stopPropagation(); toggleWishlist(${product.id})" title="Yêu thích">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h4 class="product-name">${product.ten_san_pham}</h4>
                    <div class="product-rating">
                        ${renderStars(rating, reviewCount)}
                    </div>
                    <div class="product-price">
                        <span class="price-current">${formatPrice(price)}</span>
                        ${product.gia_khuyen_mai ? `<span class="price-original">${formatPrice(product.gia)}</span>` : ''}
                    </div>
                    <div class="product-shop" style="font-size:0.85rem;color:var(--dark-400);margin-top:0.5rem;">
                        <i class="fas fa-store"></i> ${product.ten_gian_hang}
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Thêm vào giỏ hàng nhanh
async function addToCartQuick(productId) {
    if (!isLoggedIn()) {
        showToast('Vui lòng đăng nhập để thêm vào giỏ hàng', 'warning');
        setTimeout(() => window.location.href = '/pages/login.html', 1500);
        return;
    }

    const result = await api.post('/cart', { san_pham_id: productId, so_luong: 1 });
    if (result.success) {
        showToast('Đã thêm vào giỏ hàng');
        updateCartCount();
    } else {
        showToast(result.message || 'Lỗi khi thêm vào giỏ hàng', 'error');
    }
}

// Chuyển đến trang chi tiết sản phẩm
function goToProduct(productId) {
    window.location.href = `/pages/product-detail.html?id=${productId}`;
}

// Tìm kiếm sản phẩm
async function searchProducts() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (query.length === 0) {
        showToast('Vui lòng nhập từ khóa tìm kiếm', 'warning');
        return;
    }

    window.location.href = `/pages/products.html?search=${encodeURIComponent(query)}`;
}

// Lọc theo danh mục
function filterByCategory(categoryId) {
    window.location.href = `/pages/products.html?category=${categoryId}`;
}

// Yêu thích sản phẩm (toggle)
function toggleWishlist(productId) {
    if (!isLoggedIn()) {
        showToast('Vui lòng đăng nhập để yêu thích sản phẩm', 'warning');
        return;
    }
    // TODO: Implement wishlist functionality
    showToast('Đã thêm vào danh sách yêu thích');
}

// Khởi tạo trang index
async function initIndexPage() {
    // Load categories
    await displayCategories();

    // Load featured products
    const featured = await loadFeaturedProducts();
    displayProducts(featured, 'featured-products');

    // Load new products
    const newProducts = await loadNewProducts();
    displayProducts(newProducts, 'new-products');

    // Update stats
    updateIndexStats();
}

// Cập nhật thống kê trên trang index
async function updateIndexStats() {
    try {
        const productsResult = await api.get('/products?limit=1');
        const shopsResult = await api.get('/shops');

        if (productsResult.success && productsResult.pagination) {
            const statProducts = document.getElementById('stat-products');
            if (statProducts) {
                statProducts.textContent = (productsResult.pagination.total || 1000) + '+';
            }
        }

        if (shopsResult.success && shopsResult.data) {
            const statShops = document.getElementById('stat-shops');
            if (statShops) {
                statShops.textContent = (shopsResult.data.length || 100) + '+';
            }
        }
    } catch (error) {
        console.error('Update stats error:', error);
    }
}

// Chatbot
function toggleChatbot() {
    const panel = document.getElementById('chatbot-panel');
    if (panel) {
        panel.classList.toggle('show');
    }
}

async function sendChatbot() {
    const input = document.getElementById('chatbot-input');
    const messagesContainer = document.getElementById('chatbot-messages');
    
    if (!input || !messagesContainer) return;
    
    const message = input.value.trim();
    if (!message) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.textContent = message;
    messagesContainer.appendChild(userMsg);
    input.value = '';

    // Send to chatbot API
    try {
        const result = await api.post('/chatbot', { message });
        
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-msg bot';
        botMsg.textContent = result.data?.response || 'Xin lỗi, tôi không hiểu câu hỏi của bạn.';
        messagesContainer.appendChild(botMsg);
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Chatbot error:', error);
    }
}

// Notifications
function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
    const notifDropdown = document.getElementById('notifications-dropdown');
    const notifBtn = document.getElementById('notifications-btn');
    
    if (notifDropdown && !notifDropdown.contains(e.target) && !notifBtn?.contains(e.target)) {
        notifDropdown.classList.remove('show');
    }
});

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('categories-grid')) {
        initIndexPage();
    }
});
