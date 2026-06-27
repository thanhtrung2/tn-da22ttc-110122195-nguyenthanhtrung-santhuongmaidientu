// ==========================================
// Checkout Management
// ==========================================

let cartData = [];
let totalAmount = 0;
let appliedVoucher = null;
let provincesData = [];
let buyNowProductId = null;
let buyNowQty = 1;
let buyNowVariantId = null;

async function loadAddressAPI() {
    try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=3');
        provincesData = await response.json();
        const tinhSelect = document.getElementById('tinh');
        if (!tinhSelect) return;
        provincesData.forEach(p => {
            const option = document.createElement('option');
            option.value = p.name;
            option.textContent = p.name;
            option.dataset.code = p.code;
            tinhSelect.appendChild(option);
        });
        
        await loadAddresses();
    } catch (error) {
        console.error('Error loading provinces:', error);
    }
}

let savedUserAddresses = [];

async function loadAddresses() {
    try {
        const res = await api.get('/addresses');
        if (res.success && res.data && res.data.length > 0) {
            savedUserAddresses = res.data;
            const container = document.getElementById('saved-address-container');
            const select = document.getElementById('saved-addresses');
            
            if (container && select) {
                container.style.display = 'block';
                // Clear existing options except the first one
                select.innerHTML = '<option value="">-- Nhập địa chỉ mới --</option>';
                
                savedUserAddresses.forEach((addr, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${addr.ho_ten} - ${addr.so_dien_thoai} - ${addr.dia_chi}${addr.la_mac_dinh ? ' (Mặc định)' : ''}`;
                    select.appendChild(option);
                });

                const defaultIndex = savedUserAddresses.findIndex(a => a.la_mac_dinh);
                const selectedIndex = defaultIndex >= 0 ? defaultIndex : 0;
                select.value = selectedIndex;
                fillSavedAddress();
            }
        }
    } catch (e) {
        console.error('Lỗi khi tải địa chỉ', e);
    }
}

function fillSavedAddress() {
    const select = document.getElementById('saved-addresses');
    const saveAddressCheckbox = document.getElementById('save-address');
    
    if (!select.value) {
        document.getElementById('ten').value = '';
        document.getElementById('sdt').value = '';
        document.getElementById('diachi').value = '';
        document.getElementById('tinh').value = '';
        loadQuanHuyen();
        document.getElementById('quan').value = '';
        loadPhuongXa();
        document.getElementById('phuong').value = '';
        
        if (saveAddressCheckbox) {
            saveAddressCheckbox.checked = true;
            saveAddressCheckbox.parentElement.style.display = 'flex';
        }
        return;
    }
    
    const addr = savedUserAddresses[parseInt(select.value)];
    if (addr) fillAddressData(addr);
    
    if (saveAddressCheckbox) {
        saveAddressCheckbox.checked = false;
        saveAddressCheckbox.parentElement.style.display = 'none';
    }
}

function fillAddressData(address) {
    document.getElementById('ten').value = address.ho_ten || '';
    document.getElementById('sdt').value = address.so_dien_thoai || '';
    
    const fullAddress = address.dia_chi;
    const parts = fullAddress.split(', ').map(p => p.trim());
    if (parts.length >= 4) {
        const tinh = parts[parts.length - 1];
        const quan = parts[parts.length - 2];
        const phuong = parts[parts.length - 3];
        const diachi = parts.slice(0, parts.length - 3).join(', ');
        
        const tinhSelect = document.getElementById('tinh');
        if (Array.from(tinhSelect.options).some(o => o.value === tinh)) {
            tinhSelect.value = tinh;
            loadQuanHuyen();
            
            const quanSelect = document.getElementById('quan');
            if (Array.from(quanSelect.options).some(o => o.value === quan)) {
                quanSelect.value = quan;
                loadPhuongXa();
                
                const phuongSelect = document.getElementById('phuong');
                if (Array.from(phuongSelect.options).some(o => o.value === phuong)) {
                    phuongSelect.value = phuong;
                }
            }
        }
        document.getElementById('diachi').value = diachi;
    } else {
        document.getElementById('diachi').value = fullAddress;
    }
}

function loadQuanHuyen() {
    const tinhSelect = document.getElementById('tinh');
    const quanSelect = document.getElementById('quan');
    const phuongSelect = document.getElementById('phuong');
    if (!tinhSelect || !quanSelect || !phuongSelect) return;
    
    quanSelect.innerHTML = '<option value="">-- Chọn quận/huyện --</option>';
    phuongSelect.innerHTML = '<option value="">-- Chọn phường/xã --</option>';
    phuongSelect.disabled = true;
    
    if (!tinhSelect.value) {
        quanSelect.disabled = true;
        return;
    }
    
    quanSelect.disabled = false;
    const selectedTinh = provincesData.find(p => p.name === tinhSelect.value);
    if (selectedTinh && selectedTinh.districts) {
        selectedTinh.districts.forEach(d => {
            const option = document.createElement('option');
            option.value = d.name;
            option.textContent = d.name;
            option.dataset.code = d.code;
            quanSelect.appendChild(option);
        });
    }
}

function loadPhuongXa() {
    const tinhSelect = document.getElementById('tinh');
    const quanSelect = document.getElementById('quan');
    const phuongSelect = document.getElementById('phuong');
    if (!tinhSelect || !quanSelect || !phuongSelect) return;
    
    phuongSelect.innerHTML = '<option value="">-- Chọn phường/xã --</option>';
    
    if (!quanSelect.value) {
        phuongSelect.disabled = true;
        return;
    }
    
    phuongSelect.disabled = false;
    const selectedTinh = provincesData.find(p => p.name === tinhSelect.value);
    if (selectedTinh) {
        const selectedQuan = selectedTinh.districts.find(d => d.name === quanSelect.value);
        if (selectedQuan && selectedQuan.wards) {
            selectedQuan.wards.forEach(w => {
                const option = document.createElement('option');
                option.value = w.name;
                option.textContent = w.name;
                phuongSelect.appendChild(option);
            });
        }
    }
}

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
    }

    // Load address API
    await loadAddressAPI();

    // Load wallet vouchers
    await loadWalletVouchers();

    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    buyNowProductId = urlParams.get('buy_now');
    buyNowQty = parseInt(urlParams.get('qty')) || 1;
    buyNowVariantId = urlParams.get('variant');

    if (buyNowProductId) {
        await loadBuyNowSummary();
    } else {
        await loadCheckoutSummary();
    }

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

// Load tóm tắt đơn hàng (mua ngay)
async function loadBuyNowSummary() {
    try {
        const result = await api.get('/products/' + buyNowProductId);
        if (!result.success) {
            window.location.href = '/pages/products.html';
            return;
        }

        const product = result.data;
        let variant = null;
        if (buyNowVariantId && product.variants) {
            variant = product.variants.find(v => v.id == buyNowVariantId);
        }

        let price = product.gia_khuyen_mai && product.gia_khuyen_mai < product.gia ? product.gia_khuyen_mai : product.gia;
        let variantName = '';
        let variantImage = product.hinh_anh;

        if (variant) {
            if (variant.gia_them) {
                price = parseFloat(price) + parseFloat(variant.gia_them);
            }
            variantName = `${variant.mau_sac || ''}${variant.mau_sac && variant.kich_thuoc && variant.kich_thuoc !== 'Mặc định' ? ' / ' : ''}${variant.kich_thuoc && variant.kich_thuoc !== 'Mặc định' ? variant.kich_thuoc : ''}`.trim();
            
            if (variant.hinh_anh) {
                variantImage = variant.hinh_anh;
            } else if (product.variants_grouped) {
                const group = product.variants_grouped.find(g => g.mau_sac === (variant.mau_sac || 'Mặc định'));
                if (group && group.hinh_anh) variantImage = group.hinh_anh;
            }
        }

        cartData = [{
            gian_hang_id: product.gian_hang_id,
            items: [{
                san_pham_id: product.id,
                ten_san_pham: variantName ? `${product.ten_san_pham} (${variantName})` : product.ten_san_pham,
                hinh_anh: variantImage,
                gia: price,
                gia_khuyen_mai: null, // Đã tính gộp vào giá
                so_luong: buyNowQty,
                bien_the_id: buyNowVariantId
            }]
        }];
        displayCheckoutSummary();
    } catch (error) {
        console.error('Load buy now summary error:', error);
        showToast('Lỗi khi tải sản phẩm', 'error');
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
                        ${item.ten_bien_the ? `<div style="color:var(--primary-light);font-weight:600;font-size:0.75rem;margin-top:2px;">${item.ten_bien_the}</div>` : ''}
                        <div style="color:var(--dark-400);margin-top:2px;">x${item.so_luong}</div>
                    </div>
                    <div style="font-weight:600;font-size:0.85rem;">${formatPrice(itemTotal)}</div>
                </div>
            `;
        });
    });

    // Calculate totals
    const shippingFee = 30000 * cartData.length;
    let discountAmount = 0;

    if (appliedVoucher) {
        let shopTotal = 0;
        let eligibleShopCount = 0;
        cartData.forEach(shop => {
            if (!appliedVoucher.gian_hang_id || shop.gian_hang_id == appliedVoucher.gian_hang_id) {
                shop.items.forEach(item => {
                    const price = item.gia_khuyen_mai && item.gia_khuyen_mai < item.gia ? item.gia_khuyen_mai : item.gia;
                    shopTotal += price * item.so_luong;
                });
                eligibleShopCount++;
            }
        });

        if (appliedVoucher.loai === 'phan_tram') {
            discountAmount = shopTotal * (appliedVoucher.gia_tri / 100);
        } else if (appliedVoucher.loai === 'co_dinh') {
            discountAmount = appliedVoucher.gia_tri;
        } else if (appliedVoucher.loai === 'mien_phi_van_chuyen') {
            discountAmount = Math.min(30000 * eligibleShopCount, appliedVoucher.gia_tri);
        }
        
        // Cập nhật logic: Khuyến mãi không được lớn hơn tổng (Tiền hàng + Ship)
        if (discountAmount > (shopTotal + shippingFee) && appliedVoucher.loai !== 'mien_phi_van_chuyen') discountAmount = shopTotal + shippingFee;
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
                <span>${formatPrice(shippingFee)}</span>
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

let walletVouchers = [];

async function loadWalletVouchers() {
    try {
        const res = await api.get('/promotions/wallet');
        if (res.success) {
            walletVouchers = res.data.filter(v => v.trang_thai_vi === 'chua_dung' && v.trang_thai === 'active');
        }
    } catch(e) {
        console.error('Error loading wallet vouchers:', e);
    }
}

let tempSelectedVoucherId = null;

function openVoucherModal() {
    tempSelectedVoucherId = appliedVoucher ? appliedVoucher.vi_id : null;
    document.getElementById('voucher-modal').style.display = 'flex';
    renderVoucherList();
}

function closeVoucherModal() {
    document.getElementById('voucher-modal').style.display = 'none';
}

function selectVoucher(viId) {
    const selectedVoucher = walletVouchers.find(v => v.vi_id == viId);
    if (!selectedVoucher) return;

    let totalEligible = 0;
    cartData.forEach(shop => {
        if (!selectedVoucher.gian_hang_id || shop.gian_hang_id == selectedVoucher.gian_hang_id) {
            shop.items.forEach(item => {
                const price = item.gia_khuyen_mai && item.gia_khuyen_mai < item.gia ? item.gia_khuyen_mai : item.gia;
                totalEligible += price * item.so_luong;
            });
        }
    });

    if (totalEligible < selectedVoucher.don_toi_thieu) {
        showToast(`Đơn hàng chưa đạt tối thiểu ${formatPrice(selectedVoucher.don_toi_thieu)}`, 'error');
        return;
    }

    if (tempSelectedVoucherId === viId) {
        tempSelectedVoucherId = null; // deselect
    } else {
        tempSelectedVoucherId = viId;
    }
    renderVoucherList();
}

function confirmVoucherSelection() {
    if (tempSelectedVoucherId) {
        appliedVoucher = walletVouchers.find(v => v.vi_id == tempSelectedVoucherId);
        document.getElementById('selected-voucher-display').style.display = 'block';
        
        let discountText = '';
        if (appliedVoucher.loai === 'phan_tram') discountText = `Giảm ${appliedVoucher.gia_tri}%`;
        else if (appliedVoucher.loai === 'mien_phi_van_chuyen') discountText = `Miễn phí vận chuyển (Tối đa ${formatPrice(appliedVoucher.gia_tri)})`;
        else discountText = `Giảm ${formatPrice(appliedVoucher.gia_tri)}`;
        
        document.getElementById('voucher-message').textContent = `${!appliedVoucher.gian_hang_id ? 'Voucher Toàn Hệ Thống' : 'Voucher Shop ' + appliedVoucher.ten_gian_hang}: ${discountText}`;
    } else {
        appliedVoucher = null;
        document.getElementById('selected-voucher-display').style.display = 'none';
    }
    
    closeVoucherModal();
    displayCheckoutSummary();
}

function removeVoucher() {
    appliedVoucher = null;
    tempSelectedVoucherId = null;
    document.getElementById('selected-voucher-display').style.display = 'none';
    closeVoucherModal();
    displayCheckoutSummary();
}

function renderVoucherList() {
    const list = document.getElementById('voucher-list');
    if (walletVouchers.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:var(--dark-400);padding:2rem;">Bạn chưa có mã giảm giá nào hợp lệ.</div>';
        return;
    }

    list.innerHTML = walletVouchers.map(v => {
        let totalEligible = 0;
        let isBuyingFromShop = false;
        cartData.forEach(shop => {
            if (!v.gian_hang_id || shop.gian_hang_id == v.gian_hang_id) {
                if (v.gian_hang_id) isBuyingFromShop = true;
                shop.items.forEach(item => {
                    const price = item.gia_khuyen_mai && item.gia_khuyen_mai < item.gia ? item.gia_khuyen_mai : item.gia;
                    totalEligible += price * item.so_luong;
                });
            }
        });

        let isEligible = false;
        let rejectReason = '';
        if (v.gian_hang_id && !isBuyingFromShop) {
            isEligible = false;
            rejectReason = 'Không có sản phẩm của shop này trong đơn';
        } else if (totalEligible < v.don_toi_thieu) {
            isEligible = false;
            rejectReason = `Mua thêm ${formatPrice(v.don_toi_thieu - totalEligible)} để áp dụng`;
        } else {
            isEligible = true;
        }

        const isSelected = tempSelectedVoucherId == v.vi_id;

        return `
            <div style="display:flex; border: 1px solid ${isSelected ? 'var(--primary)' : 'var(--dark-700)'}; border-radius: 8px; overflow: hidden; background: ${isSelected ? 'rgba(99,102,241,0.05)' : 'var(--dark-800)'}; opacity: ${isEligible ? '1' : '0.5'}; transition: all 0.2s; cursor: ${isEligible ? 'pointer' : 'not-allowed'};" onclick="${isEligible ? `selectVoucher(${v.vi_id})` : ''}">
                <div style="width: 100px; background: ${!v.gian_hang_id ? 'var(--warning)' : 'var(--primary)'}; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 12px; border-right: 2px dashed ${isSelected ? 'var(--primary)' : 'var(--dark-700)'};">
                    <img src="${v.logo ? getProductImage(v.logo) : '/img/logo.png'}" style="width:40px;height:40px;object-fit:cover;border-radius:50%;margin-bottom:8px;background:white;">
                    <div style="font-size:0.7rem; font-weight:700; color:white; text-align:center;">${!v.gian_hang_id ? 'TOÀN SÀN' : v.ten_gian_hang}</div>
                </div>
                <div style="flex:1; padding: 12px; display:flex; flex-direction:column; justify-content:center;">
                    <strong style="font-size:0.95rem; margin-bottom:4px; color: ${isSelected ? 'var(--primary-light)' : 'var(--white)'};">
                        ${v.loai === 'phan_tram' ? `Giảm ${v.gia_tri}%` : (v.loai === 'mien_phi_van_chuyen' ? `Freeship ${formatPrice(v.gia_tri)}` : `Giảm ${formatPrice(v.gia_tri)}`)}
                    </strong>
                    <div style="font-size:0.8rem; color:var(--dark-300);">Đơn tối thiểu ${formatPrice(v.don_toi_thieu)}</div>
                    ${!isEligible ? `<div style="font-size:0.75rem; color:var(--danger); margin-top:4px;">${rejectReason}</div>` : ''}
                </div>
                <div style="padding: 12px; display:flex; align-items:center;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--dark-500)'}; display:flex; align-items:center; justify-content:center;">
                        ${isSelected ? '<div style="width:10px;height:10px;background:var(--primary);border-radius:50%;"></div>' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
    const tinh = document.getElementById('tinh').value;
    const quan = document.getElementById('quan').value;
    const phuong = document.getElementById('phuong').value;

    // Reset borders
    document.getElementById('ten').style.borderColor = '';
    document.getElementById('sdt').style.borderColor = '';
    document.getElementById('diachi').style.borderColor = '';
    document.getElementById('tinh').style.borderColor = '';
    document.getElementById('quan').style.borderColor = '';
    document.getElementById('phuong').style.borderColor = '';

    if (!ten) document.getElementById('ten').style.borderColor = 'var(--danger)';
    if (!sdt) document.getElementById('sdt').style.borderColor = 'var(--danger)';
    if (!diachi) document.getElementById('diachi').style.borderColor = 'var(--danger)';
    if (!tinh) document.getElementById('tinh').style.borderColor = 'var(--danger)';
    if (!quan) document.getElementById('quan').style.borderColor = 'var(--danger)';
    if (!phuong) document.getElementById('phuong').style.borderColor = 'var(--danger)';

    if (!ten || !sdt || !diachi || !tinh || !quan || !phuong) {
        showToast('Vui lòng nhập đầy đủ thông tin giao hàng', 'error');
        return;
    }

    const fullAddress = `${ten} - ${diachi}, ${phuong}, ${quan}, ${tinh}`;

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

        // Save default address if checked
        const saveAddress = document.getElementById('save-address')?.checked;
        if (saveAddress) {
            try {
                await api.post('/addresses', {
                    ho_ten: ten,
                    so_dien_thoai: sdt,
                    dia_chi: fullAddress,
                    la_mac_dinh: true
                });
            } catch (e) {
                console.error('Lỗi khi lưu địa chỉ:', e);
            }
        }

        let result;
        const payload = {
            dia_chi_giao: fullAddress,
            so_dien_thoai: sdt,
            phuong_thuc_thanh_toan: paymentMethod,
            ghi_chu: ghichu,
            vi_voucher_id: appliedVoucher ? appliedVoucher.vi_id : null
        };

        if (buyNowProductId) {
            payload.san_pham_id = buyNowProductId;
            payload.so_luong = buyNowQty;
            payload.bien_the_id = buyNowVariantId || null;
            result = await api.post('/orders/buy-now', payload);
        } else {
            result = await api.post('/orders', payload);
        }

        if (result.success) {
            if (paymentMethod === 'payos') {
                showToast('Đang chuyển hướng đến cổng thanh toán...', 'info');
            } else {
                showToast('Đặt hàng thành công!');
            }

            // Handle payment redirect
            if (paymentMethod === 'payos') {
                const orderIds = result.data.orderIds;
                
                let sumAmount = 0;
                let maGiaoDich = '';
                
                for(let i=0; i<orderIds.length; i++) {
                    const orderResult = await api.get(`/orders/${orderIds[i]}`);
                    if (orderResult.success) {
                        sumAmount += parseFloat(orderResult.data.tong_tien);
                        maGiaoDich = orderResult.data.ma_giao_dich;
                    }
                }
                
                if (sumAmount > 0 && maGiaoDich) {
                    // Create payment
                    const paymentResult = await api.post(`/payment/payos/create`, {
                        orderCode: Number(maGiaoDich),
                        amount: sumAmount,
                        orderInfo: `Thanh toan don hang`
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
    checkCancelConfirm();
});

// Xử lý Hủy thanh toán
function checkCancelConfirm() {
    const urlParams = new URLSearchParams(window.location.search);
    const cancelId = urlParams.get('confirm_cancel_id');
    
    if (cancelId) {
        document.getElementById('cancel-confirm-modal').style.display = 'flex';
        
        document.getElementById('btn-confirm-cancel').onclick = async () => {
            const r = await api.delete(`/orders/cancel-unpaid/${cancelId}`);
            if (r.success) {
                document.getElementById('cancel-confirm-modal').style.display = 'none';
                showToast('✅ Thanh toán đã được hủy. Đơn hàng chưa được tạo.', 'success');
                setTimeout(() => window.location.href = '/pages/cart.html', 2000);
            } else {
                showToast(r.message, 'error');
            }
        };
        
        document.getElementById('btn-resume-payment').onclick = async () => {
            const btn = document.getElementById('btn-resume-payment');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
            const r = await api.post(`/orders/retry-payment/${cancelId}`);
            if (r.success && r.paymentUrl) {
                window.location.href = r.paymentUrl;
            } else {
                showToast(r.message || 'Lỗi khi tạo lại giao dịch', 'error');
                btn.disabled = false;
                btn.innerHTML = 'Quay lại thanh toán';
            }
        };
    }
}
