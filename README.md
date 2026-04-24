# BÁO CÁO TIẾN ĐỘ DỰ ÁN KHÓA LUẬN TỐT NGHIỆP
## SÀN THƯƠNG MẠI ĐIỆN TỬ ĐA NGƯỜI BÁN - KLTN2026

---

## TỔNG QUAN DỰ ÁN

Dự án xây dựng một sàn thương mại điện tử đa người bán hoàn chỉnh, phục vụ ba nhóm đối tượng chính: người mua hàng, người bán hàng và quản trị viên hệ thống. Hệ thống được phát triển bằng công nghệ Node.js, Express.js cho backend và HTML/CSS/JavaScript cho frontend, sử dụng cơ sở dữ liệu MySQL.

---

## CÁC NGHIỆP VỤ CHÍNH ĐÃ TRIỂN KHAI

### 1. NGHIỆP VỤ QUẢN LÝ NGƯỜI DÙNG
Hệ thống hỗ trợ ba loại tài khoản với các quyền hạn khác nhau:
- **Khách hàng (Customer)**: Có thể mua sắm, đánh giá sản phẩm, chat với người bán
- **Người bán (Seller)**: Quản lý gian hàng, sản phẩm, đơn hàng, tạo khuyến mãi
- **Quản trị viên (Admin)**: Quản lý toàn bộ hệ thống, duyệt gian hàng, xử lý khiếu nại

### 2. NGHIỆP VỤ QUẢN LÝ GIAN HÀNG
Người bán có thể tạo và quản lý gian hàng của mình bao gồm:
- Đăng ký gian hàng với thông tin chi tiết
- Cập nhật logo, mô tả, địa chỉ gian hàng
- Theo dõi trạng thái hoạt động của gian hàng
- Quản lý danh tiếng và đánh giá từ khách hàng

### 3. NGHIỆP VỤ QUẢN LÝ SẢN PHẨM
Hệ thống quản lý sản phẩm đầy đủ với các chức năng:
- Thêm, sửa, xóa sản phẩm với hình ảnh và mô tả chi tiết
- Phân loại sản phẩm theo danh mục
- Quản lý giá gốc và giá khuyến mãi
- Theo dõi số lượng tồn kho
- Hiển thị sản phẩm theo độ phổ biến và mới nhất

### 4. NGHIỆP VỤ MUA SẮM VÀ THANH TOÁN
Quy trình mua sắm hoàn chỉnh từ A đến Z:
- Tìm kiếm và lọc sản phẩm theo nhiều tiêu chí
- Thêm sản phẩm vào giỏ hàng và quản lý giỏ hàng
- Đặt hàng với thông tin giao hàng chi tiết
- Thanh toán qua nhiều phương thức: COD, VNPay, Momo
- Theo dõi trạng thái đơn hàng real-time

### 5. NGHIỆP VỤ ĐÁNH GIÁ VÀ NHẬN XÉT
Hệ thống đánh giá minh bạch giúp xây dựng lòng tin:
- Khách hàng đánh giá sản phẩm sau khi mua
- Hệ thống sao từ 1-5 với nhận xét chi tiết
- Hiển thị điểm trung bình và số lượng đánh giá
- Người bán có thể phản hồi đánh giá

### 6. NGHIỆP VỤ CHAT VÀ HỖ TRỢ
Hệ thống giao tiếp đa dạng:
- Chat trực tiếp giữa người mua và người bán
- Chatbot AI hỗ trợ 24/7 với Google Gemini
- Hệ thống khiếu nại và xử lý tranh chấp
- Thông báo real-time qua Socket.IO

### 7. NGHIỆP VỤ KHUYẾN MẠI VÀ MARKETING
Công cụ marketing mạnh mẽ cho người bán:
- Tạo chương trình khuyến mãi theo thời gian
- Giảm giá theo phần trăm hoặc số tiền cố định
- Quản lý mã giảm giá và điều kiện áp dụng
- Theo dõi hiệu quả các chương trình khuyến mãi

### 8. NGHIỆP VỤ BÁO CÁO VÀ THỐNG KÊ
Hệ thống báo cáo chi tiết cho từng vai trò:
- **Seller**: Doanh thu, đơn hàng, sản phẩm bán chạy
- **Admin**: Thống kê tổng quan hệ thống, người dùng, giao dịch
- Biểu đồ trực quan và xuất báo cáo

---

## CÁC TRANG GIAO DIỆN ĐÃ HOÀN THÀNH

Dự án đã hoàn thành tổng cộng 24 trang giao diện người dùng với đầy đủ chức năng, được phân chia theo từng nhóm đối tượng sử dụng cụ thể như sau:

### NHÓM TRANG CÔNG CỘNG

**Trang chủ** là trang đầu tiên người dùng truy cập, hiển thị banner quảng cáo hấp dẫn, danh mục sản phẩm với các icon trực quan, sản phẩm nổi bật được yêu thích nhất, sản phẩm mới nhất vừa ra mắt, và thông tin về các ưu điểm nổi bật của sàn thương mại như bảo mật, giao hàng nhanh, hỗ trợ 24/7.

**Trang danh sách sản phẩm** cho phép người dùng xem tất cả sản phẩm có trên sàn với hệ thống phân trang thông minh, tìm kiếm sản phẩm theo tên hoặc từ khóa, lọc sản phẩm theo danh mục, khoảng giá, mức độ đánh giá, và sắp xếp theo nhiều tiêu chí như giá tăng dần, giảm dần, độ phổ biến, hoặc sản phẩm mới nhất.

**Trang chi tiết sản phẩm** cung cấp thông tin đầy đủ về từng sản phẩm bao gồm hình ảnh chất lượng cao có thể phóng to, mô tả chi tiết và thông số kỹ thuật, giá gốc và giá khuyến mãi nếu có, thông tin về gian hàng bán sản phẩm, các đánh giá và nhận xét từ khách hàng đã mua, cùng với nút thêm vào giỏ hàng và mua ngay.

**Trang đăng nhập** được thiết kế đơn giản với form nhập email và mật khẩu, tùy chọn ghi nhớ đăng nhập để lần sau không cần nhập lại, liên kết đến trang đăng ký cho người dùng mới, và liên kết quên mật khẩu để khôi phục tài khoản.

**Trang đăng ký** hỗ trợ tạo tài khoản cho cả khách hàng và người bán với form nhập thông tin cá nhân đầy đủ, xác thực thông tin đầu vào để đảm bảo tính chính xác, lựa chọn vai trò là khách hàng hoặc người bán, và gửi email xác nhận để kích hoạt tài khoản.

### NHÓM TRANG NGƯỜI MUA

**Trang giỏ hàng** hiển thị danh sách tất cả sản phẩm người dùng đã thêm vào giỏ với hình ảnh và thông tin cơ bản, cho phép cập nhật số lượng từng sản phẩm hoặc xóa sản phẩm không mong muốn, tính toán tự động tổng tiền hàng và phí vận chuyển, hiển thị tổng thanh toán cuối cùng, và có nút chuyển đến trang thanh toán.

**Trang thanh toán** cho phép người mua nhập đầy đủ thông tin giao hàng bao gồm họ tên, số điện thoại, địa chỉ chi tiết, lựa chọn phương thức thanh toán giữa COD, VNPay hoặc Momo, xem lại thông tin đơn hàng trước khi xác nhận, và thực hiện thanh toán an toàn thông qua các cổng thanh toán tích hợp.

**Trang đơn hàng** hiển thị danh sách tất cả đơn hàng người dùng đã đặt theo thứ tự thời gian, cho phép lọc đơn hàng theo trạng thái như chờ xác nhận, đang giao, đã giao, đã hủy, xem thông tin tóm tắt từng đơn hàng, và có liên kết đến trang chi tiết để theo dõi cụ thể hơn.

**Trang chi tiết đơn hàng** cung cấp thông tin đầy đủ về một đơn hàng cụ thể bao gồm danh sách sản phẩm đã mua, timeline trạng thái đơn hàng từ lúc đặt đến khi giao, thông tin người giao hàng và thời gian dự kiến, thông tin thanh toán và phương thức đã chọn, cùng với các nút hành động như hủy đơn, xác nhận nhận hàng, hoặc đánh giá sản phẩm.

**Trang hồ sơ cá nhân** cho phép người dùng cập nhật thông tin cá nhân như họ tên, số điện thoại, ngày sinh, thay đổi mật khẩu với xác thực mật khẩu cũ, quản lý nhiều địa chỉ giao hàng khác nhau, upload và thay đổi ảnh đại diện, và xem lịch sử hoạt động trên hệ thống.

**Trang chat** hiển thị danh sách tất cả cuộc trò chuyện với các người bán khác nhau, giao diện chat real-time với khả năng gửi tin nhắn văn bản, gửi hình ảnh và file đính kèm, hiển thị trạng thái online/offline của người bán, thông báo tin nhắn mới ngay lập tức, và lưu trữ lịch sử trò chuyện để tham khảo sau này.

**Trang khiếu nại** cung cấp form để người mua gửi khiếu nại về đơn hàng có vấn đề hoặc về người bán không uy tín, cho phép đính kèm hình ảnh minh chứng, theo dõi trạng thái xử lý khiếu nại từ phía admin, xem lịch sử tất cả khiếu nại đã gửi, và nhận phản hồi từ bộ phận hỗ trợ.

### NHÓM TRANG NGƯỜI BÁN

**Dashboard người bán** hiển thị tổng quan về hoạt động kinh doanh với các thống kê quan trọng như doanh thu hôm nay, tuần này, tháng này, số đơn hàng mới cần xử lý, biểu đồ doanh thu theo thời gian, danh sách sản phẩm bán chạy nhất, thông báo từ hệ thống, và tin nhắn mới từ khách hàng.

**Trang quản lý gian hàng** cho phép người bán cập nhật thông tin gian hàng như tên cửa hàng, mô tả chi tiết về gian hàng, upload logo và banner đẹp mắt, cập nhật địa chỉ và thông tin liên hệ, thiết lập chính sách bán hàng và đổi trả, xem các đánh giá và phản hồi từ khách hàng về gian hàng.

**Trang quản lý sản phẩm** hiển thị danh sách tất cả sản phẩm của gian hàng với khả năng tìm kiếm và lọc, thêm sản phẩm mới với đầy đủ thông tin như tên, mô tả, giá, hình ảnh, danh mục, chỉnh sửa thông tin sản phẩm đã có, xóa sản phẩm không còn bán, quản lý nhiều hình ảnh cho mỗi sản phẩm, và cập nhật số lượng tồn kho.

**Trang quản lý đơn hàng** hiển thị tất cả đơn hàng của gian hàng được phân loại theo trạng thái, cho phép xác nhận đơn hàng mới, cập nhật trạng thái đơn hàng như đang chuẩn bị, đang giao, đã giao, in hóa đơn và phiếu giao hàng, liên hệ trực tiếp với khách hàng qua chat, và xử lý các yêu cầu hủy đơn hoặc đổi trả.

**Trang quản lý khuyến mãi** cho phép tạo các chương trình khuyến mãi mới với nhiều hình thức như giảm giá theo phần trăm, giảm giá cố định, mua nhiều giảm nhiều, thiết lập thời gian bắt đầu và kết thúc chương trình, điều kiện áp dụng như số lượng tối thiểu, khách hàng mục tiêu, theo dõi hiệu quả của từng chương trình khuyến mãi, và quản lý các mã giảm giá độc quyền.

**Trang báo cáo doanh thu** cung cấp báo cáo chi tiết về doanh thu theo ngày, tuần, tháng, quý, năm, biểu đồ trực quan về xu hướng bán hàng và doanh thu, thống kê sản phẩm bán chạy nhất và ít bán nhất, phân tích khách hàng và hành vi mua sắm, so sánh doanh thu giữa các khoảng thời gian, và xuất báo cáo dưới định dạng Excel hoặc PDF.

### NHÓM TRANG QUẢN TRỊ VIÊN

**Dashboard admin** hiển thị tổng quan toàn bộ hệ thống với các chỉ số quan trọng như tổng số người dùng, gian hàng, sản phẩm, đơn hàng, thống kê người dùng mới đăng ký theo thời gian, biểu đồ doanh thu của toàn sàn thương mại, danh sách gian hàng mới cần duyệt, các cảnh báo về vi phạm hoặc khiếu nại, và thông báo quan trọng cần xử lý.

**Trang quản lý người dùng** hiển thị danh sách tất cả người dùng trên hệ thống với thông tin cơ bản, tìm kiếm người dùng theo tên, email, số điện thoại, lọc theo vai trò như admin, seller, customer, lọc theo trạng thái tài khoản active hoặc locked, khóa hoặc mở khóa tài khoản người dùng vi phạm, xem chi tiết hoạt động và lịch sử giao dịch của từng người dùng.

**Trang quản lý gian hàng** hiển thị danh sách tất cả gian hàng trên sàn với thông tin tóm tắt, duyệt các gian hàng mới đăng ký với đầy đủ thông tin xác minh, tạm ngưng hoạt động của gian hàng vi phạm chính sách, cấm vĩnh viễn gian hàng có hành vi gian lận nghiêm trọng, xem báo cáo chi tiết về hiệu quả kinh doanh của từng gian hàng, và theo dõi đánh giá từ khách hàng.

**Trang quản lý sản phẩm** hiển thị tất cả sản phẩm có trên sàn thương mại với khả năng tìm kiếm và lọc mạnh mẽ, kiểm duyệt sản phẩm mới được đăng bán để đảm bảo chất lượng, gỡ bỏ sản phẩm vi phạm chính sách hoặc có nội dung không phù hợp, quản lý danh mục sản phẩm với khả năng thêm, sửa, xóa, theo dõi sản phẩm bán chạy và ít bán trên toàn sàn.

**Trang quản lý đơn hàng** cho phép theo dõi tất cả đơn hàng trên hệ thống với các bộ lọc chi tiết, can thiệp xử lý các đơn hàng có vấn đề hoặc tranh chấp, thống kê đơn hàng theo trạng thái và xu hướng theo thời gian, báo cáo doanh thu tổng thể của toàn sàn, phân tích hiệu quả hoạt động của từng gian hàng, và xuất báo cáo tổng hợp cho ban lãnh đạo.

**Trang xử lý khiếu nại** hiển thị danh sách tất cả khiếu nại từ người dùng với mức độ ưu tiên khác nhau, phân loại khiếu nại theo loại như sản phẩm, dịch vụ, giao hàng, thanh toán, liên hệ với các bên liên quan để thu thập thông tin và làm rõ vấn đề, đưa ra quyết định giải quyết công bằng và hợp lý, theo dõi việc thực hiện các biện pháp khắc phục, và lưu trữ hồ sơ xử lý để tham khảo cho các trường hợp tương tự.

---

*Báo cáo tiến độ dự án KLTN2026 - Sàn Thương Mại Điện Tử Đa Người Bán*