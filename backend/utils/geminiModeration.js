const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

/**
 * Kiểm duyệt hình ảnh sản phẩm bằng Gemini Pro Vision
 * @param {string} filePath - Đường dẫn tuyệt đối tới file ảnh hoặc URL
 * @returns {Promise<{label: string, confidence: number, reason: string}>}
 */
async function moderateImage(filePath) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY is not set. Skipping real AI image moderation, returning safe.');
        return { label: 'approved', confidence: 1.0, reason: 'No API Key' };
    }

    try {
        let imageData = null;
        let mimeType = 'image/jpeg';
        
        // Handle Cloudinary URL or HTTP URL
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            const response = await fetch(filePath);
            const arrayBuffer = await response.arrayBuffer();
            imageData = Buffer.from(arrayBuffer).toString("base64");
            mimeType = response.headers.get('content-type') || 'image/jpeg';
        } else {
            // Local file path
            // The file might be in public/uploads or backend/uploads
            const localPath = path.resolve(__dirname, '..', filePath.replace(/^\/+/, ''));
            if (fs.existsSync(localPath)) {
                imageData = fs.readFileSync(localPath).toString("base64");
                const ext = path.extname(localPath).toLowerCase();
                if (ext === '.png') mimeType = 'image/png';
                else if (ext === '.webp') mimeType = 'image/webp';
            } else {
                console.warn('Image file not found locally for moderation:', localPath);
                return { label: 'approved', confidence: 1.0, reason: 'File not found locally' };
            }
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Bạn là một hệ thống kiểm duyệt AI CỰC KỲ NGHIÊM NGẶT cho một sàn thương mại điện tử tại Việt Nam.
Nhiệm vụ của bạn là phân tích hình ảnh này và quyết định xem nó có được phép đăng bán hay không.
Hãy trả lời DUY NHẤT bằng một chuỗi JSON có cấu trúc sau:
{
    "isSafe": boolean,
    "confidence": number,
    "reason": string
}

=== NGUYÊN TẮC QUAN TRỌNG NHẤT ===
Khi bạn KHÔNG CHẮC CHẮN hình ảnh an toàn hay không, hãy LUÔN LUÔN TỪ CHỐI (isSafe: false).
Nguyên tắc: "Thà từ chối nhầm còn hơn để lọt hàng cấm".

=== DANH SÁCH VẬT PHẨM BỊ CẤM TUYỆT ĐỐI (TỪ CHỐI NGAY) ===

**1. VŨ KHÍ - BẤT KỲ LOẠI NÀO:**
- Súng thật, súng nhựa, súng đồ chơi giống thật, súng nước có hình dáng giống súng thật, súng bi, súng hơi, súng bắn đạn gel
- Đạn dược, hộp đạn, vỏ đạn
- Dao găm, dao bấm, dao butterfly, dao Karambit, machete, dao phay lớn, dao săn, dao quân dụng
- Kiếm, katana, gươm, đao, mã tấu, rìu chiến
- Cung, nỏ, cung crossbow, tên bắn
- NÁ CAO SU (SLINGSHOT) - kể cả ná đơn giản bằng gỗ hay ná chuyên nghiệp bằng kim loại
- Côn nhị khúc (nunchaku), tay gấu (brass knuckles), gậy baton, roi điện
- Bình xịt hơi cay, taser, súng điện, đèn pin chích điện
- Phi tiêu (shuriken), dao ném, lưỡi dao giấu
- Vũ khí tự chế, vũ khí ngụy trang (dao giấu trong bút, gậy kiếm)
- BẤT KỲ vật thể nào có thể được sử dụng chính yếu như vũ khí gây sát thương

**2. NỘI DUNG NHẠY CẢM:**
- Khiêu dâm, NSFW, hở hang quá mức, nội dung phản cảm
- Máu me, bạo lực, gore, kinh dị, cổ xúy bạo lực
- Biểu tượng thù hận, phân biệt chủng tộc

**3. CHẤT CẤM:**
- Ma túy, cần sa, thuốc phiện, heroin, methamphetamine
- Thuốc lá, xì gà, thuốc lá điện tử, vape, pod, shisha
- Dụng cụ sử dụng ma túy (bong, pipe)

=== HÌNH ẢNH AN TOÀN (CHO PHÉP) ===
- Quần áo, giày dép, túi xách, phụ kiện thời trang
- Điện thoại, máy tính, đồ điện tử
- Đồ gia dụng, nội thất, đồ trang trí
- Mỹ phẩm, chăm sóc da, nước hoa
- Thực phẩm, đồ uống (không có cồn quá mức)
- Sách, đồ chơi an toàn, đồ thể thao (không phải vũ khí)
- Dao nhà bếp thông thường (dao gọt trái cây, dao thái bếp nhỏ) - CHỈ HỢP LỆ nếu rõ ràng là dụng cụ nhà bếp
- Người mẫu mặc quần áo bình thường, đang cầm/mặc sản phẩm an toàn

=== VÍ DỤ PHÂN LOẠI ===
- Áo thun trắng trên mannequin -> {"isSafe": true, "confidence": 0.99, "reason": "Hình ảnh hợp lệ"}
- Người cầm điện thoại -> {"isSafe": true, "confidence": 0.99, "reason": "Hình ảnh hợp lệ"}
- Bộ dao nhà bếp trong hộp -> {"isSafe": true, "confidence": 0.85, "reason": "Hình ảnh hợp lệ - dụng cụ nhà bếp"}
- Ná cao su / slingshot -> {"isSafe": false, "confidence": 0.98, "reason": "Vũ khí tự chế: ná cao su có thể gây sát thương"}
- Dao găm dã ngoại -> {"isSafe": false, "confidence": 0.97, "reason": "Vũ khí: dao găm/dao săn nguy hiểm"}
- Dao bấm butterfly -> {"isSafe": false, "confidence": 0.99, "reason": "Vũ khí: dao bấm bị cấm"}
- Súng đồ chơi nhựa giống thật -> {"isSafe": false, "confidence": 0.95, "reason": "Vũ khí: súng đồ chơi có hình dáng giống súng thật"}
- Côn nhị khúc -> {"isSafe": false, "confidence": 0.98, "reason": "Vũ khí: côn nhị khúc bị cấm"}
- Tay gấu brass knuckles -> {"isSafe": false, "confidence": 0.99, "reason": "Vũ khí: tay gấu (brass knuckles) bị cấm"}
- Crossbow / nỏ -> {"isSafe": false, "confidence": 0.99, "reason": "Vũ khí: nỏ bắn tên bị cấm"}
- Bình xịt hơi cay -> {"isSafe": false, "confidence": 0.96, "reason": "Vũ khí: bình xịt hơi cay bị cấm"}
- Thuốc lá điện tử / vape -> {"isSafe": false, "confidence": 0.97, "reason": "Chất cấm: thuốc lá điện tử bị cấm"}
- Gậy bóng chày bình thường -> {"isSafe": true, "confidence": 0.90, "reason": "Hình ảnh hợp lệ - dụng cụ thể thao"}

Hãy quan sát THẬT KỸ TỪNG CHI TIẾT trong ảnh. Chú ý đặc biệt đến:
- Hình dáng vật thể (có giống vũ khí không?)
- Lưỡi dao, đầu nhọn, dây cao su kéo căng
- Cơ chế bắn/phóng (trigger, dây cung, ống ngắm)
- Vật liệu (kim loại sắc bén, gỗ cứng dạng vũ khí)

KHÔNG bị đánh lừa bởi tên sản phẩm hoặc mô tả. CHỈ phân tích dựa trên hình ảnh.
Chỉ trả về chuỗi JSON hợp lệ, không có markdown hoặc text thừa xung quanh.`;

        const imagePart = {
            inlineData: {
                data: imageData,
                mimeType
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        // Cố gắng parse JSON từ responseText
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        if (parsed.isSafe) {
            return { label: 'approved', confidence: parsed.confidence, reason: parsed.reason };
        } else {
            return { label: 'rejected', confidence: parsed.confidence, reason: parsed.reason };
        }

    } catch (error) {
        console.error('Gemini image moderation error:', error);
        // Fallback to safe if API fails to not block users
        return { label: 'approved', confidence: 1.0, reason: 'API Error' };
    }
}

module.exports = {
    moderateImage
};
