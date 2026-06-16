require('dotenv').config();

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
    const apiKey = process.env.GROQ_API_KEY;
    
    // Try Groq AI first
    if (apiKey && apiKey !== 'your_groq_api_key') {
        try {
            // Sử dụng global fetch hoặc fallback sang node-fetch
            const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
            const response = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: SYSTEM_CONTEXT
                        },
                        {
                            role: 'user',
                            content: message
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.choices && data.choices[0] && data.choices[0].message) {
                    return data.choices[0].message.content;
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Groq API response error:', errorData);
            }
        } catch (error) {
            console.error('Groq AI error:', error.message);
        }
    } else {
        console.log('⚠️ Groq AI chưa được cấu hình key hoặc key mặc định');
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
