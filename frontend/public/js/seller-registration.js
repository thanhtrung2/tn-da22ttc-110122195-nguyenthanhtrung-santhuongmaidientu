// ==========================================
// SELLER REGISTRATION SHARED FUNCTIONS
// ==========================================

let currentSellerStep = 0;
let sellerFormData = {}; // Lưu trữ dữ liệu từng bước
let uploadedFiles = {}; // Lưu trữ file đã upload

// Khởi tạo đăng ký seller
function startSellerRegistration() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('seller-steps').style.display = 'block';
    currentSellerStep = 1;
    sellerFormData = {}; // Reset data
    uploadedFiles = {}; // Reset files
    
    // Đảm bảo tất cả form inputs được enable
    enableAllFormInputs();
    
    showSellerStep(1);
}

// Đảm bảo tất cả form inputs có thể nhập được
function enableAllFormInputs() {
    const modal = document.getElementById('seller-modal');
    if (modal) {
        const inputs = modal.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.disabled = false;
            input.readOnly = false;
            input.style.pointerEvents = 'auto';
            input.style.userSelect = 'text';
        });
    }
}

// Hiển thị bước hiện tại
function showSellerStep(step) {
    // Hide all steps
    for (let i = 1; i <= 5; i++) {
        const stepEl = document.getElementById(`seller-step-${i}`);
        const indicatorEl = document.getElementById(`step-${i}-indicator`);
        if (stepEl) stepEl.style.display = 'none';
        if (indicatorEl) {
            indicatorEl.classList.remove('active', 'completed');
            if (i < step) indicatorEl.classList.add('completed');
            else if (i === step) indicatorEl.classList.add('active');
        }
    }
    
    // Show current step
    const currentStepEl = document.getElementById(`seller-step-${step}`);
    if (currentStepEl) currentStepEl.style.display = 'block';
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    
    if (prevBtn) prevBtn.style.display = step > 1 ? 'block' : 'none';
    if (nextBtn) nextBtn.style.display = step < 5 ? 'block' : 'none';
    if (submitBtn) submitBtn.style.display = step === 5 ? 'block' : 'none';
    
    // Load saved data for current step
    loadStepData(step);
    
    // Update summary for step 5
    if (step === 5) {
        updateRegistrationSummary();
    }
}

// Load dữ liệu đã lưu cho bước hiện tại
function loadStepData(step) {
    switch(step) {
        case 1:
            if (sellerFormData.ten_shop) document.getElementById('ten_shop').value = sellerFormData.ten_shop;
            if (sellerFormData.mo_ta_shop) document.getElementById('mo_ta_shop').value = sellerFormData.mo_ta_shop;
            break;
        case 2:
            if (sellerFormData.dia_chi_kho) document.getElementById('dia_chi_kho').value = sellerFormData.dia_chi_kho;
            if (sellerFormData.phuong_thuc_van_chuyen) {
                const methods = sellerFormData.phuong_thuc_van_chuyen.split(',');
                methods.forEach(method => {
                    const checkbox = document.querySelector(`input[name="van_chuyen"][value="${method}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            break;
        case 4:
            if (sellerFormData.ma_so_thue) document.getElementById('ma_so_thue').value = sellerFormData.ma_so_thue;
            break;
    }
}

// Validation cho từng bước
function validateStep(step) {
    switch(step) {
        case 1: return validateStep1();
        case 2: return validateStep2();
        case 3: return validateStep3();
        case 4: return validateStep4();
        case 5: return validateStep5();
        default: return false;
    }
}

function validateStep1() {
    const tenShop = document.getElementById('ten_shop').value.trim();
    const moTaShop = document.getElementById('mo_ta_shop').value.trim();
    
    if (!tenShop) {
        showValidationMessage('ten_shop_message', 'Vui lòng nhập tên shop', 'error');
        return false;
    }
    
    if (tenShop.length < 3) {
        showValidationMessage('ten_shop_message', 'Tên shop phải có ít nhất 3 ký tự', 'error');
        return false;
    }
    
    if (tenShop.length > 50) {
        showValidationMessage('ten_shop_message', 'Tên shop không được quá 50 ký tự', 'error');
        return false;
    }
    
    if (!moTaShop) {
        showValidationMessage('mo_ta_shop_message', 'Vui lòng nhập mô tả shop', 'error');
        return false;
    }
    
    if (moTaShop.length < 10) {
        showValidationMessage('mo_ta_shop_message', 'Mô tả shop phải có ít nhất 10 ký tự', 'error');
        return false;
    }
    
    // Clear validation messages
    hideValidationMessage('ten_shop_message');
    hideValidationMessage('mo_ta_shop_message');
    
    // Lưu dữ liệu
    sellerFormData.ten_shop = tenShop;
    sellerFormData.mo_ta_shop = moTaShop;
    
    return true;
}

function validateStep2() {
    const diaChiKho = document.getElementById('dia_chi_kho').value.trim();
    const vanChuyenCheckboxes = document.querySelectorAll('input[name="van_chuyen"]:checked');
    
    if (!diaChiKho) {
        showValidationMessage('dia_chi_kho_message', 'Vui lòng nhập địa chỉ kho hàng', 'error');
        return false;
    }
    
    if (diaChiKho.length < 10) {
        showValidationMessage('dia_chi_kho_message', 'Địa chỉ kho hàng phải có ít nhất 10 ký tự', 'error');
        return false;
    }
    
    if (vanChuyenCheckboxes.length === 0) {
        showValidationMessage('van_chuyen_message', 'Vui lòng chọn ít nhất một phương thức vận chuyển', 'error');
        return false;
    }
    
    // Clear validation messages
    hideValidationMessage('dia_chi_kho_message');
    hideValidationMessage('van_chuyen_message');
    
    // Lưu dữ liệu
    sellerFormData.dia_chi_kho = diaChiKho;
    const vanChuyenMethods = Array.from(vanChuyenCheckboxes).map(cb => cb.value);
    sellerFormData.phuong_thuc_van_chuyen = vanChuyenMethods.join(',');
    
    return true;
}

function validateStep3() {
    const cccdTruoc = document.getElementById('cccd_mat_truoc').files[0];
    const cccdSau = document.getElementById('cccd_mat_sau').files[0];
    const anhGuongMat = document.getElementById('anh_guong_mat').files[0];
    
    if (!cccdTruoc) {
        showToast('Vui lòng tải lên ảnh CCCD mặt trước', 'error');
        return false;
    }
    
    if (!cccdSau) {
        showToast('Vui lòng tải lên ảnh CCCD mặt sau', 'error');
        return false;
    }
    
    if (!anhGuongMat) {
        showToast('Vui lòng tải lên ảnh gương mặt', 'error');
        return false;
    }
    
    // Kiểm tra định dạng file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    if (!allowedTypes.includes(cccdTruoc.type)) {
        showToast('CCCD mặt trước phải là file ảnh (JPG, PNG)', 'error');
        return false;
    }
    
    if (!allowedTypes.includes(cccdSau.type)) {
        showToast('CCCD mặt sau phải là file ảnh (JPG, PNG)', 'error');
        return false;
    }
    
    if (!allowedTypes.includes(anhGuongMat.type)) {
        showToast('Ảnh gương mặt phải là file ảnh (JPG, PNG)', 'error');
        return false;
    }
    
    // Kiểm tra kích thước file (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    
    if (cccdTruoc.size > maxSize) {
        showToast('Ảnh CCCD mặt trước không được quá 5MB', 'error');
        return false;
    }
    
    if (cccdSau.size > maxSize) {
        showToast('Ảnh CCCD mặt sau không được quá 5MB', 'error');
        return false;
    }
    
    if (anhGuongMat.size > maxSize) {
        showToast('Ảnh gương mặt không được quá 5MB', 'error');
        return false;
    }
    
    // Lưu file
    uploadedFiles.cccd_mat_truoc = cccdTruoc;
    uploadedFiles.cccd_mat_sau = cccdSau;
    uploadedFiles.anh_guong_mat = anhGuongMat;
    
    return true;
}

function validateStep4() {
    const maSoThue = document.getElementById('ma_so_thue').value.trim();
    const giayPhepKinhDoanh = document.getElementById('giay_phep_kinh_doanh').files[0];
    
    // Mã số thuế là không bắt buộc, nhưng nếu nhập thì phải đúng định dạng
    if (maSoThue) {
        // Kiểm tra format mã số thuế (10-13 số)
        const taxCodeRegex = /^\d{10,13}$/;
        if (!taxCodeRegex.test(maSoThue)) {
            showValidationMessage('ma_so_thue_message', 'Mã số thuế phải là 10-13 chữ số', 'error');
            return false;
        }
    }
    
    if (!giayPhepKinhDoanh) {
        showToast('Vui lòng tải lên giấy phép kinh doanh', 'error');
        return false;
    }
    
    // Kiểm tra định dạng file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    
    if (!allowedTypes.includes(giayPhepKinhDoanh.type)) {
        showToast('Giấy phép kinh doanh phải là file ảnh (JPG, PNG) hoặc PDF', 'error');
        return false;
    }
    
    // Kiểm tra kích thước file (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    
    if (giayPhepKinhDoanh.size > maxSize) {
        showToast('Giấy phép kinh doanh không được quá 10MB', 'error');
        return false;
    }
    
    // Clear validation messages
    hideValidationMessage('ma_so_thue_message');
    
    // Lưu dữ liệu
    sellerFormData.ma_so_thue = maSoThue;
    uploadedFiles.giay_phep_kinh_doanh = giayPhepKinhDoanh;
    
    return true;
}

function validateStep5() {
    // Kiểm tra tất cả dữ liệu đã được nhập
    const requiredFields = ['ten_shop', 'mo_ta_shop', 'dia_chi_kho', 'phuong_thuc_van_chuyen', 'ma_so_thue'];
    const requiredFiles = ['cccd_mat_truoc', 'cccd_mat_sau', 'anh_guong_mat', 'giay_phep_kinh_doanh'];
    
    for (const field of requiredFields) {
        if (!sellerFormData[field]) {
            showToast(`Thiếu thông tin: ${field}`, 'error');
            return false;
        }
    }
    
    for (const file of requiredFiles) {
        if (!uploadedFiles[file]) {
            showToast(`Thiếu file: ${file}`, 'error');
            return false;
        }
    }
    
    return true;
}

// Navigation functions
function nextSellerStep() {
    if (!validateStep(currentSellerStep)) {
        return;
    }
    
    if (currentSellerStep < 5) {
        currentSellerStep++;
        showSellerStep(currentSellerStep);
        showToast(`Bước ${currentSellerStep - 1} hoàn thành!`, 'success');
    }
}

function prevSellerStep() {
    if (currentSellerStep > 1) {
        currentSellerStep--;
        showSellerStep(currentSellerStep);
    }
}

// Utility functions
function showValidationMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `validation-message ${type}`;
        element.style.display = 'block';
    }
}

function hideValidationMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// Preview image function
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        
        // Kiểm tra kích thước file
        const maxSize = input.id === 'giay_phep_kinh_doanh' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            showToast(`File quá lớn. Kích thước tối đa: ${maxSizeMB}MB`, 'error');
            input.value = '';
            preview.style.display = 'none';
            return;
        }
        
        reader.onload = function(e) {
            preview.style.display = 'block';
            
            if (file.type === 'application/pdf') {
                preview.innerHTML = `
                    <div class="file-info">
                        <i class="fas fa-file-pdf" style="font-size: 2rem; color: #ef4444; margin-bottom: 0.5rem;"></i>
                        <div><strong>${file.name}</strong></div>
                        <div>Kích thước: ${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                `;
            } else {
                preview.innerHTML = `
                    <img src="${e.target.result}" style="max-width: 200px; max-height: 150px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <div class="file-info">
                        <div><strong>${file.name}</strong></div>
                        <div>Kích thước: ${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                `;
            }
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
}

// Cập nhật tóm tắt thông tin ở bước 5
function updateRegistrationSummary() {
    const summary = document.getElementById('registration-summary');
    if (!summary) return;
    
    const vanChuyenCheckboxes = document.querySelectorAll('input[name="van_chuyen"]:checked');
    const vanChuyenMethods = Array.from(vanChuyenCheckboxes).map(cb => {
        switch(cb.value) {
            case 'giao_hang_nhanh': return 'Giao hàng nhanh';
            case 'giao_hang_tiet_kiem': return 'Giao hàng tiết kiệm';
            case 'tu_den_lay': return 'Tự đến lấy';
            default: return cb.value;
        }
    });
    
    summary.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            <div><strong>🏪 Tên Shop:</strong> ${sellerFormData.ten_shop || 'Chưa nhập'}</div>
            <div><strong>📝 Mô tả:</strong> ${sellerFormData.mo_ta_shop || 'Chưa nhập'}</div>
            <div><strong>📍 Địa chỉ kho:</strong> ${sellerFormData.dia_chi_kho || 'Chưa nhập'}</div>
            <div><strong>🚚 Vận chuyển:</strong> ${vanChuyenMethods.join(', ') || 'Chưa chọn'}</div>
            <div><strong>🏢 Mã số thuế:</strong> ${sellerFormData.ma_so_thue || 'Chưa nhập'}</div>
            <div><strong>📄 Files đã tải:</strong> 
                <ul style="margin: 0.5rem 0 0 1rem; color: #059669;">
                    ${uploadedFiles.cccd_mat_truoc ? '<li>✅ CCCD mặt trước</li>' : '<li>❌ CCCD mặt trước</li>'}
                    ${uploadedFiles.cccd_mat_sau ? '<li>✅ CCCD mặt sau</li>' : '<li>❌ CCCD mặt sau</li>'}
                    ${uploadedFiles.anh_guong_mat ? '<li>✅ Ảnh chân dung</li>' : '<li>❌ Ảnh chân dung</li>'}
                    ${uploadedFiles.giay_phep_kinh_doanh ? '<li>✅ Giấy phép kinh doanh</li>' : '<li>❌ Giấy phép kinh doanh</li>'}
                </ul>
            </div>
        </div>
    `;
}

// Submit registration
async function submitSellerRegistration() {
    // Validation cuối cùng
    if (!validateStep5()) {
        return;
    }
    
    // Hiển thị loading
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        
        // Thêm thông tin shop
        formData.append('ten_shop', sellerFormData.ten_shop);
        formData.append('mo_ta_shop', sellerFormData.mo_ta_shop);
        formData.append('dia_chi_kho', sellerFormData.dia_chi_kho);
        formData.append('phuong_thuc_van_chuyen', sellerFormData.phuong_thuc_van_chuyen);
        formData.append('ma_so_thue', sellerFormData.ma_so_thue);
        
        // Thêm files
        formData.append('cccd_mat_truoc', uploadedFiles.cccd_mat_truoc);
        formData.append('cccd_mat_sau', uploadedFiles.cccd_mat_sau);
        formData.append('anh_guong_mat', uploadedFiles.anh_guong_mat);
        formData.append('giay_phep_kinh_doanh', uploadedFiles.giay_phep_kinh_doanh);
        
        const result = await api.post('/users/upgrade-to-seller', formData);
        
        if (result.success) {
            // Hiển thị thông báo thành công
            showSuccessModal();
            
            // Cập nhật user trong localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            user.vai_tro = 'seller';
            user.trang_thai_xac_thuc = 'pending';
            localStorage.setItem('user', JSON.stringify(user));
            
            // Đóng modal sau 3 giây
            setTimeout(() => {
                closeSellerModal();
                // Reload trang để cập nhật UI
                window.location.reload();
            }, 3000);
            
        } else {
            showToast(result.message || 'Có lỗi xảy ra khi đăng ký', 'error');
        }
        
    } catch (error) {
        console.error('Seller registration error:', error);
        showToast('Lỗi kết nối. Vui lòng thử lại sau.', 'error');
    } finally {
        // Khôi phục button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Hiển thị modal thành công
function showSuccessModal() {
    const modalContent = document.querySelector('#seller-modal .modal-content');
    modalContent.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;">
                <i class="fas fa-check" style="font-size: 2.5rem; color: white;"></i>
            </div>
            
            <h2 style="color: #10b981; margin-bottom: 1rem; font-size: 1.8rem;">
                🎉 Đăng ký thành công!
            </h2>
            
            <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; padding: 2rem; margin: 2rem 0; border-left: 4px solid #0ea5e9;">
                <h3 style="color: #0369a1; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <i class="fas fa-info-circle"></i> Thông tin quan trọng
                </h3>
                <div style="text-align: left; color: #0c4a6e; line-height: 1.8;">
                    <p><strong>📋 Hồ sơ của bạn đã được gửi đến Admin để xét duyệt</strong></p>
                    <p><strong>⏱️ Thời gian xét duyệt:</strong> 1-3 ngày làm việc</p>
                    <p><strong>📧 Thông báo kết quả:</strong> Qua email và thông báo trong hệ thống</p>
                    <p><strong>📞 Hỗ trợ:</strong> Liên hệ hotline nếu cần hỗ trợ thêm</p>
                </div>
            </div>
            
            <div style="background: #fef3c7; border-radius: 8px; padding: 1rem; margin: 1rem 0; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-weight: 500;">
                    <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                    Vui lòng kiểm tra email thường xuyên để nhận thông báo kết quả xét duyệt
                </p>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                <button onclick="closeSellerModal()" class="btn btn-outline">
                    <i class="fas fa-home"></i> Về trang chủ
                </button>
                <button onclick="window.location.href='/pages/profile.html'" class="btn btn-primary">
                    <i class="fas fa-user"></i> Xem hồ sơ
                </button>
            </div>
            
            <p style="color: #6b7280; font-size: 0.9rem; margin-top: 2rem;">
                Cửa sổ này sẽ tự động đóng sau 3 giây...
            </p>
        </div>
    `;
}

// Close modal
function closeSellerModal() {
    document.getElementById('seller-modal').style.display = 'none';
    currentSellerStep = 0;
    document.getElementById('welcome-screen').style.display = 'block';
    document.getElementById('seller-steps').style.display = 'none';
}

// Open seller registration
function openSellerRegistration() {
    if (!isLoggedIn()) {
        showToast('Vui lòng đăng nhập để truy cập kênh người bán', 'warning');
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 1000);
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Nếu đã là seller, chuyển đến dashboard
    if (user.vai_tro === 'seller') {
        window.location.href = '/pages/seller/dashboard.html';
        return;
    }
    
    // Nếu là customer, mở modal đăng ký
    document.getElementById('seller-modal').style.display = 'flex';
    
    // Đảm bảo form inputs có thể nhập được
    setTimeout(() => {
        enableAllFormInputs();
    }, 100);
}