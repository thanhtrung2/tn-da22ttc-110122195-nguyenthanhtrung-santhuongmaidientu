# 🔑 Thông Tin Tài Khoản & Mật Khẩu Các Gian Hàng (Shop Seed Data)

Tài liệu này lưu trữ danh sách các tài khoản người bán (Seller) và gian hàng mẫu đã được tự động thêm vào cơ sở dữ liệu. Tất cả các tài khoản này đều đã được **xác thực (Verified)** bởi hệ thống và các sản phẩm của họ đều đã được **phê duyệt (Approved)** và ở trạng thái **hoạt động (Active)**.

Bạn có thể sử dụng các tài khoản này để đăng nhập trực tiếp trên website nhằm trải nghiệm kênh người bán (Seller Channel) và mua sắm trên storefront công khai.

---

## 📊 Danh Sách Tài Khoản Đăng Nhập

| Tên Cửa Hàng | Email Đăng Nhập | Tên Đăng Nhập (Username) | Mật Khẩu (Clear-text) | Số Sản Phẩm | Danh Mục Phân Loại |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Vipo Tech - Siêu Thị Công Nghệ** | `vipotech@kltn2026.com` | `vipotech` | **`tech123456`** | 8 sản phẩm | Điện thoại & Phụ kiện (ID: 1)<br>Máy tính & Laptop (ID: 2) |
| **Mộc Fashion - Phong Cách Basic** | `mocfashion@kltn2026.com` | `mocfashion` | **`fashion123456`** | 8 sản phẩm | Thời trang Nam (ID: 3)<br>Thời trang Nữ (ID: 4) |
| **Green Life - Cửa Hàng Tiêu Dùng Xanh** | `greenlife@kltn2026.com` | `greenlife` | **`green123456`** | 8 sản phẩm | Nhà cửa & Đời sống (ID: 5)<br>Đồ ăn & Thực phẩm (ID: 9) |
| **Hana Beauty & Baby Care** | `hanabeauty@kltn2026.com` | `hanabeauty` | **`beauty123456`** | 8 sản phẩm | Sức khỏe & Làm đẹp (ID: 6)<br>Mẹ & Bé (ID: 10) |
| **Vipo Electronics & Gadgets** | `vipo_electronics@kltn2026.com` | `vipo_electronics` | **`password123`** | 2 sản phẩm (Nhiều ảnh mô tả) | Điện thoại & Phụ kiện (ID: 1) |
| **Vipo Fashion Trendy** | `vipo_fashion@kltn2026.com` | `vipo_fashion` | **`password123`** | 2 sản phẩm (Nhiều ảnh mô tả) | Thời trang Nữ (ID: 4) |

---

## 🛠️ Hướng Dẫn Sử Dụng & Kiểm Tra

### 1. Đăng nhập với vai trò Người bán (Seller)
1. Truy cập vào trang đăng nhập của website: `http://localhost:3000/pages/login.html` (hoặc click vào nút **Đăng nhập** trên Header).
2. Sử dụng **Email đăng nhập** và **Mật khẩu** tương ứng từ bảng trên.
3. Sau khi đăng nhập thành công:
   - Hệ thống sẽ chuyển hướng bạn về Trang chủ hoặc Trang cá nhân.
   - Nút **"Kênh Người Bán"** sẽ xuất hiện trên thanh điều hướng đầu trang (Navbar).
   - Click vào đó để truy cập trang quản trị riêng của shop: `http://localhost:3000/pages/seller/shop.html` (hoặc dashboard người bán) để quản lý đơn hàng, kho hàng, thống kê doanh thu và thêm bớt sản phẩm.

### 2. Trải nghiệm mua sắm với tư cách Khách hàng (Customer)
1. Bạn có thể sử dụng một tài khoản khách hàng bình thường hoặc đăng ký mới một tài khoản mua hàng.
2. Truy cập Trang chủ hoặc Trang Sản phẩm:
   - Các sản phẩm mới tinh, ảnh Unsplash cực kỳ sang xịn mịn của các shop trên sẽ lập tức xuất hiện lung linh trên các danh mục tương ứng.
   - Bạn có thể lọc sản phẩm theo danh mục (ví dụ: bấm chọn danh mục **"Điện thoại & Phụ kiện"** để xem ngay iPhone 15 Pro Max và Samsung Galaxy S24 Ultra từ shop Vipo Tech).
   - Bạn có thể click vào xem chi tiết sản phẩm, xem trang thông tin chi tiết riêng của từng Shop (`pages/shop.html?id=...`), thêm sản phẩm vào giỏ hàng và tiến hành thanh toán đặt hàng bình thường.

---

> [!NOTE]
> Mật khẩu của các tài khoản trên đã được mã hóa một chiều an toàn trong bảng `nguoi_dung` bằng thuật toán **Bcrypt** với độ dài salt = 10, đảm bảo tính bảo mật đúng tiêu chuẩn kỹ thuật của một hệ thống thực tế.
