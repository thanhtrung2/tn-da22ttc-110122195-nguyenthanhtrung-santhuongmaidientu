const fs = require('fs');

let profileContent = fs.readFileSync('d:/KHOALUANTN2026/frontend/public/js/profile.js', 'utf8');

if (!profileContent.includes('window.cancelSellerRegistration')) {
    profileContent += `

window.cancelSellerRegistration = async function() {
    if(!confirm("Bạn có chắc chắn muốn xóa hồ sơ bị từ chối và trở về trạng thái ban đầu?")) return;
    try {
        const result = await api.delete('/users/seller-registration');
        if(result.success) {
            showToast('Đã xóa hồ sơ đăng ký cũ. Bạn có thể đăng ký lại.', 'success');
            const user = getUser();
            user.vai_tro = 'customer';
            user.trang_thai_xac_thuc = 'unverified';
            localStorage.setItem('user', JSON.stringify(user));
            currentUser = user;
            updateSellerSection();
        } else {
            showToast(result.message || 'Lỗi khi xóa hồ sơ', 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('Lỗi kết nối', 'error');
    }
};
`;
    fs.writeFileSync('d:/KHOALUANTN2026/frontend/public/js/profile.js', profileContent, 'utf8');
}
console.log('Appended function');
