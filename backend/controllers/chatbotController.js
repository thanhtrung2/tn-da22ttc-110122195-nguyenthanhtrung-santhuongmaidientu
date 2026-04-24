const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

let model = null;

try {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key') {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }
} catch (e) {
    console.log('⚠️ Gemini AI chưa được cấu hình');
}

const SYSTEM_CONTEXT = `Bạn là trợ lý ảo của sàn thương mại điện tử KLTN2026 Shop. 
Bạn giúp người dùng:
- Hướng dẫn mua hàng, đăng ký, đăng nhập
- Tra cứu thông tin đơn hàng
- Giải đáp chính sách đổi trả, khiếu nại
- Hướng dẫn bán hàng trên sàn
- Trả lời câu hỏi về sản phẩm

Quy tắc:
- Trả lời bằng tiếng Việt, ngắn gọn, thân thiện
- Nếu không biết câu trả lời, hướng dẫn liên hệ admin hoặc seller
- Không đưa ra lời khuyên y tế, pháp lý

Thông tin sàn:
- Tên: KLTN2026 Shop
- Hỗ trợ thanh toán: COD, VNPay, Momo
- Chính sách đổi trả: 7 ngày kể từ ngày nhận hàng
- Liên hệ admin: admin@kltn2026.com`;

// FAQ responses (fallback khi không có Gemini)
const FAQ_RESPONSES = {
    'đăng ký': 'Để đăng ký tài khoản, bạn vào trang Đăng ký, điền họ tên, email và mật khẩu. Bạn có thể đăng ký làm Người mua hoặc Người bán.',
    'đăng nhập': 'Để đăng nhập, bạn nhập email và mật khẩu đã đăng ký. Nếu quên mật khẩu, vui lòng liên hệ admin.',
    'mua hàng': 'Để mua hàng: 1) Tìm sản phẩm → 2) Thêm vào giỏ → 3) Vào giỏ hàng → 4) Thanh toán → 5) Nhập địa chỉ → 6) Xác nhận đơn hàng.',
    'thanh toán': 'Chúng tôi hỗ trợ 3 phương thức: Thanh toán khi nhận hàng (COD), VNPay, và Momo.',
    'đổi trả': 'Bạn có thể đổi trả trong vòng 7 ngày kể từ ngày nhận hàng. Sản phẩm phải còn nguyên tem, nhãn.',
    'khiếu nại': 'Để gửi khiếu nại: Vào Đơn hàng → Chọn đơn → Gửi khiếu nại. Mô tả chi tiết vấn đề để admin xử lý nhanh hơn.',
    'bán hàng': 'Để bán hàng: 1) Đăng ký tài khoản Seller → 2) Tạo gian hàng → 3) Đăng sản phẩm → 4) Quản lý đơn hàng.',
    'giao hàng': 'Thời gian giao hàng thông thường 2-5 ngày tùy khu vực. Bạn có thể theo dõi đơn hàng trong mục "Đơn hàng của tôi".',
    'liên hệ': 'Bạn có thể chat trực tiếp với người bán hoặc liên hệ admin qua email: admin@kltn2026.com',
    'đơn hàng': 'Để xem đơn hàng, vào mục "Đơn hàng của tôi". Bạn có thể theo dõi trạng thái: Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn thành.',
    'default': 'Xin lỗi, tôi chưa hiểu câu hỏi của bạn. Bạn có thể hỏi về: đăng ký, mua hàng, thanh toán, đổi trả, khiếu nại, giao hàng. Hoặc liên hệ admin để được hỗ trợ.'
};

const getChatbotResponse = async (message) => {
    // Try Gemini AI first
    if (model) {
        try {
            const result = await model.generateContent(`${SYSTEM_CONTEXT}\n\nCâu hỏi của khách hàng: ${message}`);
            const response = result.response.text();
            return response;
        } catch (error) {
            console.error('Gemini error:', error.message);
        }
    }

    // Fallback: keyword matching
    const lowerMsg = message.toLowerCase();
    for (const [keyword, response] of Object.entries(FAQ_RESPONSES)) {
        if (keyword !== 'default' && lowerMsg.includes(keyword)) {
            return response;
        }
    }
    return FAQ_RESPONSES['default'];
};

module.exports = { getChatbotResponse };
