// ==========================================
// Checkout Management
// ==========================================

let cartData = [];
let totalAmount = 0;
let appliedVoucher = null;

// Khởi tạo trang checkout
async function initCheckout() {
    if (!isLoggedIn()) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Load user info
    const user = getUser();
    if (user) {
        document.getElementById('ten').value = user.ho_ten || '';
        document.getElementById('sdt').value = user.so_dien_thoai || '';
        document.getElementById('diachi').value = user.dia_chi || '';
    }

    // Load cart summary
    await loadCheckoutSummary();

    // Setup payment method listeners
    setupPaymentMethodListeners();
}

// Load tóm tắt giỏ hàng
async function loadCheckoutSummary() {
    try {
        const result = await api.get('/cart');
        if (!result.success || result.data.length === 0) {
            window.location.href = '/pages/cart.html';
            return;
        }

        cartData = result.data;
        displayCheckoutSummary();
    } catch (error) {
        console.error('Load checkout summary error:', error);
        showToast('Lỗi khi tải giỏ hàng', 'error');
    }
}

// Hiển thị tóm tắt đơn hàng
function displayCheckoutSummary() {
    const container = document.getElementById('order-summary');
    if (!container) return;

    let html = '';
    totalAmount = 0;

    cartData.forEach(shop => {
        shop.items.forEach(item => {
            const price = item.gia_khuyen_mai && item.gia_khuyen_mai < item.gia ? item.gia_khuyen_mai : item.gia;
            const itemTotal = price * item.so_luong;
            totalAmount += itemTotal;

            html += `
                <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--dark-700);align-items:center;">
                    <img src="${getProductImage(item.hinh_anh)}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">
                    <div style="flex:1;font-size:0.8rem;">
                        <div style="color:var(--white);font-weight:500;">${item.ten_san_pham}</div>
                        <div style="color:var(--dark-400);">x${item.so_luong}</div>
                    </div>
                    <div style="font-weight:600;font-size:0.85rem;">${formatPrice(itemTotal)}</div>
                </div>
            `;
        });
    });

    // Calculate totals
    const shippingFee = 0; // Free shipping
    let discountAmount = 0;

    if (appliedVoucher) {
        if (appliedVoucher.loai === 'phan_tram') {
            discountAmount = totalAmount * (appliedVoucher.gia_tri / 100);
        } else {
            discountAmount = appliedVoucher.gia_tri;
        }
        if (discountAmount > totalAmount) discountAmount = totalAmount; // Cannot discount more than total
    }

    const finalTotal = Math.max(0, totalAmount + shippingFee - discountAmount);

    html += `
        <div style="padding-top:1rem;margin-top:0.5rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.85rem;">
                <span style="color:var(--dark-400);">Tạm tính</span>
                <span>${formatPrice(totalAmount)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.85rem;">
                <span style="color:var(--dark-400);">Phí giao hàng</span>
                <span style="color:var(--success);">Miễn phí</span>
            </div>
            ${discountAmount > 0 ? `
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.85rem;">
                <span style="color:var(--dark-400);">Khuyến mãi</span>
                <span style="color:var(--success);">- ${formatPrice(discountAmount)}</span>
            </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;padding-top:1rem;border-top:1px solid var(--dark-700);">
                <strong>Tổng cộng</strong>
                <strong style="font-family:'Outfit';font-size:1.3rem;color:var(--danger);">${formatPrice(finalTotal)}</strong>
            </div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:1.5rem;padding:14px;" onclick="placeOrder()" id="order-btn">
            <i class="fas fa-check-circle"></i> Đặt hàng
        </button>
    `;

    container.innerHTML = html;
}

// Áp dụng khuyến mãi
async function applyVoucher() {
    const code = document.getElementById('voucher-code').value.trim();
    const msg = document.getElementById('voucher-message');
    msg.style.display = 'block';

    if (!code) {
        msg.textContent = 'Vui lòng nhập mã khuyến mãi';
        msg.style.color = 'var(--danger)';
        return;
    }

    // Pass shop_ids to check if the voucher belongs to any of the shops in the cart
    const shopIds = cartData.map(shop => shop.gian_hang_id).join(',');

    try {
        const result = await api.get(`/promotions/check?code=${code}&shop_ids=${shopIds}`);
        if (result.success) {
            appliedVoucher = result.data;
            msg.textContent = `Áp dụng thành công mã giảm ${appliedVoucher.loai === 'phan_tram' ? appliedVoucher.gia_tri + '%' : formatPrice(appliedVoucher.gia_tri)}`;
            msg.style.color = 'var(--success)';
            displayCheckoutSummary();
        } else {
            msg.textContent = result.message || 'Mã khuyến mãi không hợp lệ';
            msg.style.color = 'var(--danger)';
            appliedVoucher = null;
            displayCheckoutSummary();
        }
    } catch (e) {
        msg.textContent = 'Lỗi khi kiểm tra mã';
        msg.style.color = 'var(--danger)';
    }
}

// Setup payment method listeners
function setupPaymentMethodListeners() {
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.pay-opt').forEach(label => {
                label.style.borderColor = 'var(--dark-700)';
            });
            radio.closest('.pay-opt').style.borderColor = 'var(--primary)';
        });
    });
}

// Đặt hàng
async function placeOrder() {
    // Validate form
    const ten = document.getElementById('ten').value.trim();
    const sdt = document.getElementById('sdt').value.trim();
    const diachi = document.getElementById('diachi').value.trim();

    // Reset borders
    document.getElementById('ten').style.borderColor = '';
    document.getElementById('sdt').style.borderColor = '';
    document.getElementById('diachi').style.borderColor = '';

    if (!ten) document.getElementById('ten').style.borderColor = 'var(--danger)';
    if (!sdt) document.getElementById('sdt').style.borderColor = 'var(--danger)';
    if (!diachi) document.getElementById('diachi').style.borderColor = 'var(--danger)';

    if (!ten || !sdt || !diachi) {
        showToast('Vui lòng nhập đầy đủ thông tin giao hàng', 'error');
        return;
    }

    // Validate phone number
    if (!/^[0-9]{10}$/.test(sdt.replace(/\D/g, ''))) {
        document.getElementById('sdt').style.borderColor = 'var(--danger)';
        showToast('Số điện thoại không hợp lệ', 'error');
        return;
    }

    const btn = document.getElementById('order-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

    try {
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        const ghichu = document.getElementById('ghichu').value.trim();

        const result = await api.post('/orders', {
            dia_chi_giao: diachi,
            so_dien_thoai: sdt,
            phuong_thuc_thanh_toan: paymentMethod,
            ghi_chu: ghichu,
            ma_khuyen_mai: appliedVoucher ? appliedVoucher.ten_khuyen_mai : null
        });

        if (result.success) {
            showToast('Đặt hàng thành công!');

            // Handle payment redirect
            if (paymentMethod === 'momo') {
                const orderId = result.data.orderIds[0];
                
                // Get order details
                const orderResult = await api.get(`/orders/${orderId}`);
                if (orderResult.success) {
                    // Create payment
                    const paymentResult = await api.post(`/payment/${paymentMethod}/create`, {
                        order_id: orderId,
                        amount: orderResult.data.tong_tien,
                        orderInfo: `Thanh toan don hang #${orderId}`
                    });

                    if (paymentResult.success && paymentResult.data.paymentUrl) {
                        // Redirect to payment gateway
                        window.location.href = paymentResult.data.paymentUrl;
                        return;
                    }
                }
            }

            // Redirect to orders page
            setTimeout(() => {
                window.location.href = '/pages/orders.html';
            }, 1500);
        } else {
            showToast(result.message || 'Lỗi khi đặt hàng', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Đặt hàng';
        }
    } catch (error) {
        console.error('Place order error:', error);
        showToast('Lỗi khi đặt hàng', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Đặt hàng';
    }
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
    initCheckout();
});
