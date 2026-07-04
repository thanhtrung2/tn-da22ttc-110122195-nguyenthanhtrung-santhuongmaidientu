# 🛍️ VIPO - SÀN THƯƠNG MẠI ĐIỆN TỬ ĐA NGƯỜI BÁN

## 📖 GIỚI THIỆU

Hệ thống sàn thương mại điện tử đa người bán cho phép nhiều người bán cùng đăng ký và kinh doanh trên cùng một nền tảng. Hệ thống hỗ trợ 3 vai trò chính:
- **Admin**: Quản trị viên hệ thống
- **Seller**: Người bán hàng
- **Customer**: Người mua hàng

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

### Backend
- Node.js v18+
- Express.js v4.18+
- MySQL v8.0+
- Socket.IO v4.6+ (Real-time chat)
- Google Gemini AI (Chatbot)
- JWT Authentication
- Bcrypt (Mã hóa mật khẩu)

### Frontend
- HTML5, CSS3, JavaScript ES6+
- Tailwind CSS v3.4
- Socket.IO Client
- Font Awesome Icons

### Payment Gateway
- VNPay
- Momo
- COD (Cash on Delivery)

---

## 🚀 CÀI ĐẶT VÀ CHẠY DỰ ÁN

### 1. Cài đặt Dependencies

```bash
cd backend
npm install
```

### 2. Cấu hình Database

#### Tạo database MySQL
```sql
CREATE DATABASE kltn2026;
```

#### Cấu hình file `.env` trong thư mục backend
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=kltn2026
DB_PORT=3306

JWT_SECRET=your_jwt_secret_key
PORT=3000

GEMINI_API_KEY=your_gemini_api_key

VNPAY_TMN_CODE=your_vnpay_code
VNPAY_HASH_SECRET=your_vnpay_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/api/payment/vnpay/return

MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_RETURN_URL=http://localhost:3000/api/payment/momo/return
MOMO_NOTIFY_URL=http://localhost:3000/api/payment/momo/notify

# Google OAuth
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
```

### 3. Khởi tạo Database

```bash
cd backend
node setup-kltn2026.js
```

Hoặc chạy từng bước:
```bash
node setup-database.js      # Tạo cấu trúc bảng
node run-seed.js            # Thêm dữ liệu mẫu
node update-verification-schema.js  # Cập nhật schema
```

### 4. Chạy Backend Server

```bash
cd backend
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

### 5. Chạy Frontend

Mở file HTML trực tiếp trong trình duyệt hoặc sử dụng Live Server:

```bash
# Sử dụng Live Server (VS Code Extension)
# Click chuột phải vào frontend/public/index.html
# Chọn "Open with Live Server"
```

Frontend sẽ chạy tại: `http://localhost:5500`

---

## 📁 CẤU TRÚC DỰ ÁN

```
KHOALUANTN2026/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── cartController.js
│   │   ├── chatbotController.js
│   │   ├── chatController.js
│   │   ├── complaintController.js
│   │   ├── notificationController.js
│   │   ├── orderController.js
│   │   ├── paymentController.js
│   │   ├── productController.js
│   │   ├── promotionController.js
│   │   ├── reviewController.js
│   │   ├── shopController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── role.js
│   │   └── upload.js
│   ├── routes/
│   ├── socket/
│   │   └── chatSocket.js
│   ├── database/
│   │   ├── schema.sql
│   │   ├── seed.sql
│   │   └── add_username.sql
│   ├── uploads/
│   ├── .env
│   ├── server.js
│   └── package.json
│
└── frontend/
    └── public/
        ├── css/
        │   └── style.css
        ├── js/
        │   ├── api.js
        │   ├── products.js
        │   ├── profile.js
        │   ├── checkout.js
        │   └── seller-registration.js
        ├── pages/
        │   ├── admin/
        │   ├── cart.html
        │   ├── chat.html
        │   ├── checkout.html
        │   ├── complaint.html
        │   ├── login.html
        │   ├── register.html
        │   ├── orders.html
        │   ├── order-detail.html
        │   ├── products.html
        │   ├── product-detail.html
        │   └── profile.html
        └── index.html
```

---

## 🔐 GOOGLE OAUTH SETUP

### Bước 1: Tạo Google Cloud Project
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới: `Vipo Ecommerce`
3. Kích hoạt **Google Identity Services API**

### Bước 2: Cấu hình OAuth Consent Screen
1. Vào **APIs & Services** > **OAuth consent screen**
2. Chọn **External** user type
3. Điền thông tin app
4. Thêm scopes: `userinfo.email`, `userinfo.profile`, `openid`
5. Thêm test users (email của bạn)

### Bước 3: Tạo OAuth 2.0 Client ID
1. Vào **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
2. Chọn **Web application**
3. Thêm **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
4. Thêm **Authorized redirect URIs**:
   - `http://localhost:3000`
   - `http://localhost:3000/pages/login.html`
   - `http://localhost:3000/pages/register.html`
5. Copy **Client ID** vào file `.env`

### Bước 4: Cập nhật Frontend
Thay thế `PASTE_YOUR_CLIENT_ID_HERE` trong `login.html` và `register.html` bằng Client ID thực tế

---

## 🏪 ĐĂNG KÝ BÁN HÀNG

### Quy trình 5 bước
1. **Thông tin Shop**: Tên shop, mô tả
2. **Cài đặt vận chuyển**: Địa chỉ kho, phương thức vận chuyển
3. **Xác thực danh tính**: CCCD (2 mặt), ảnh chân dung
4. **Thông tin kinh doanh**: Mã số thuế, giấy phép kinh doanh
5. **Xác nhận và gửi**: Review tất cả thông tin

### Validation
- Tên shop: 3-50 ký tự
- Mô tả: Tối thiểu 10 ký tự
- Mã số thuế: 10-13 chữ số
- File: JPG/PNG/PDF, max 5-10MB

### Thông báo
- Admin nhận thông báo khi có đơn đăng ký mới
- User nhận thông báo kết quả xét duyệt trong 1-3 ngày

---

## 📱 CHỨC NĂNG CHÍNH

### Cho Khách Hàng
- ✅ Xem sản phẩm theo danh mục
- ✅ Tìm kiếm sản phẩm
- ✅ Thêm vào giỏ hàng
- ✅ Thanh toán đơn hàng (COD, VNPay, Momo)
- ✅ Xem đơn hàng
- ✅ Đánh giá sản phẩm
- ✅ Trò chuyện với seller
- ✅ Quản lý thông báo
- ✅ Cập nhật thông tin cá nhân

### Cho Seller
- ✅ Đăng ký bán hàng
- ✅ Quản lý sản phẩm
- ✅ Xem đơn hàng
- ✅ Quản lý gian hàng
- ✅ Trò chuyện với khách hàng
- ✅ Xem doanh thu

### Cho Admin
- ✅ Quản lý người dùng
- ✅ Quản lý sản phẩm
- ✅ Quản lý đơn hàng
- ✅ Duyệt seller
- ✅ Quản lý khiếu nại
- ✅ Xem thống kê

---

## 🔌 API ENDPOINTS

### User Profile
```
GET /api/users/profile              # Lấy thông tin cá nhân
PUT /api/users/profile              # Cập nhật thông tin
POST /api/users/change-password     # Đổi mật khẩu
POST /api/users/upgrade-to-seller   # Đăng ký bán hàng
```

### Notifications
```
GET /api/notifications              # Lấy thông báo
GET /api/notifications/unread-count # Đếm chưa đọc
PUT /api/notifications/:id          # Đánh dấu đã đọc
POST /api/notifications/mark-all-read
DELETE /api/notifications/:id       # Xóa thông báo
```

### Products
```
GET /api/products                   # Danh sách sản phẩm
GET /api/products/:id               # Chi tiết sản phẩm
GET /api/products/categories        # Danh mục
```

### Cart
```
GET /api/cart                       # Lấy giỏ hàng
POST /api/cart                      # Thêm vào giỏ hàng
PUT /api/cart/:id                   # Cập nhật số lượng
DELETE /api/cart/:id                # Xóa khỏi giỏ hàng
```

### Orders
```
POST /api/orders                    # Tạo đơn hàng
GET /api/orders                     # Danh sách đơn hàng
GET /api/orders/:id                 # Chi tiết đơn hàng
POST /api/orders/:id/cancel         # Hủy đơn hàng
```

---

## 🎯 HƯỚNG DẪN CHẠY WEB

### Cách 1: Chạy tự động bằng Docker (KHUYÊN DÙNG NHẤT) 🐳

Hệ thống đã được đóng gói hoàn chỉnh bằng Docker, bạn không cần tự cài đặt Node.js hay MySQL. Chỉ cần 1 lệnh duy nhất!

1. Đảm bảo đã bật **Docker Desktop**.
2. Mở Terminal tại thư mục gốc dự án (`KHOALUANTN2026`) và gõ:
```bash
docker-compose up -d --build
```
3. Chờ báo `✔ Built` và `✔ Started` là xong! Truy cập ngay:
- 🌍 **Trang Khách hàng (Vipo):** [http://localhost:3000](http://localhost:3000)
- 🏪 **Trang Người Bán (Seller Dashboard):** [http://localhost:5173](http://localhost:5173)
- 🗄️ **Cơ sở dữ liệu MySQL:** kết nối qua host `127.0.0.1`, cổng `3307`, user `root`, pass `02032004`.

*(Lệnh để tắt toàn bộ web: `docker-compose down`)*

---

### Cách 2: Chạy thủ công (Không dùng Docker)

**1. Khởi động Backend & Website khách hàng:**
```bash
cd backend
npm install
npm run dev
```

**2. Khởi động Seller Dashboard:**
```bash
cd seller-dashboard
npm install
npm run dev
```

---

## 🔑 TÀI KHOẢN MẪU

### Admin
- **Email**: `admin@kltn2026.com`
- **Mật khẩu**: `123456`

### Tạo tài khoản mới
- Truy cập: `http://localhost:3000/pages/register.html`
- Điền thông tin và đăng ký

---

## 🐛 TROUBLESHOOTING

### Lỗi "Cannot connect to database"
- Kiểm tra MySQL đang chạy
- Kiểm tra thông tin `.env`
- Đảm bảo database `kltn2026` đã được tạo

### Lỗi "Port 3000 already in use"
- Thay đổi PORT trong `.env`
- Hoặc kill process: `lsof -ti:3000 | xargs kill -9`

### Lỗi "Module not found"
- Chạy `npm install` lại
- Xóa `node_modules` và `package-lock.json`, rồi `npm install`

### Lỗi "Authentication failed"
- Đăng nhập lại để lấy token mới
- Kiểm tra JWT_SECRET trong `.env`

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Kiểm tra console browser (F12)
2. Kiểm tra server logs
3. Kiểm tra database connection
4. Liên hệ: admin@kltn2026.com

---

**Chúc bạn sử dụng ứng dụng vui vẻ!** 🎉


