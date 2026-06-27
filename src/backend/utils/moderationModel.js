const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const MODEL_PATH = path.join(__dirname, '../data/moderation_model.json');

// Tokenizer đơn giản cho tiếng Việt: chuyển thường, bỏ dấu câu, tách từ theo khoảng trắng
function tokenize(text) {
    if (!text) return [];
    return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?@+"']/g, ' ')
        .split(/\s+/)
        .filter(word => word.trim().length > 0);
}

// Hàm huấn luyện mô hình Naive Bayes từ cơ sở dữ liệu
async function trainModel() {
    try {
        console.log('🔮 Bắt đầu huấn luyện mô hình tự kiểm duyệt Naive Bayes...');
        const [rows] = await pool.query('SELECT text, label FROM huan_luyen_mau');
        
        if (rows.length === 0) {
            console.log('⚠️ Không có dữ liệu huấn luyện trong database!');
            return false;
        }

        const totalDocs = rows.length;
        const classes = { approved: 0, rejected: 0 };
        const wordCounts = { approved: {}, rejected: {} };
        const totalWords = { approved: 0, rejected: 0 };
        const vocabulary = new Set();

        // Đếm tần suất xuất hiện của từ theo nhãn
        rows.forEach(row => {
            const label = row.label;
            classes[label]++;
            const words = tokenize(row.text);
            words.forEach(word => {
                vocabulary.add(word);
                wordCounts[label][word] = (wordCounts[label][word] || 0) + 1;
                totalWords[label]++;
            });
        });

        // Tính xác suất tiên nghiệm (Priors)
        const priors = {
            approved: classes.approved / totalDocs,
            rejected: classes.rejected / totalDocs
        };

        // Tính xác suất điều kiện với Laplace Smoothing (Likelihoods)
        const vocabSize = vocabulary.size;
        const likelihoods = { approved: {}, rejected: {} };

        vocabulary.forEach(word => {
            likelihoods.approved[word] = ((wordCounts.approved[word] || 0) + 1) / (totalWords['approved'] + vocabSize);
            likelihoods.rejected[word] = ((wordCounts.rejected[word] || 0) + 1) / (totalWords['rejected'] + vocabSize);
        });

        const modelData = {
            priors,
            likelihoods,
            vocabSize,
            totalWords,
            trainedAt: new Date().toISOString(),
            totalDocs
        };

        // Đảm bảo thư mục dữ liệu tồn tại
        const dataDir = path.dirname(MODEL_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(MODEL_PATH, JSON.stringify(modelData, null, 2), 'utf8');
        console.log(`✅ Huấn luyện mô hình thành công! Đã xử lý ${totalDocs} mẫu, kích thước từ vựng: ${vocabSize}`);
        return modelData;
    } catch (error) {
        console.error('❌ Lỗi khi huấn luyện mô hình:', error);
        throw error;
    }
}

// Hàm dự đoán nhãn của một văn bản
function predictClass(text) {
    try {
        if (!fs.existsSync(MODEL_PATH)) {
            console.log('⚠️ Không tìm thấy file trọng số mô hình. Thực hiện gắn nhãn mặc định: approved');
            return { label: 'approved', confidence: 1.0 };
        }

        const model = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
        const words = tokenize(text);

        if (words.length === 0) {
            return { label: 'approved', confidence: 0.5 };
        }

        // Tính xác suất theo logarit để tránh hiện tượng tràn số dưới (underflow)
        let logApproved = Math.log(model.priors.approved);
        let logRejected = Math.log(model.priors.rejected);

        words.forEach(word => {
            // Xác suất điều kiện của từ, nếu không có trong từ vựng, tính theo Laplace smoothing mặc định
            const pWordApproved = model.likelihoods.approved[word] || (1 / (model.totalWords.approved + model.vocabSize));
            const pWordRejected = model.likelihoods.rejected[word] || (1 / (model.totalWords.rejected + model.vocabSize));

            logApproved += Math.log(pWordApproved);
            logRejected += Math.log(pWordRejected);
        });

        // Chuyển đổi log-odds về xác suất để hiển thị độ tin cậy (Confidence)
        // P(c1 | x) = 1 / (1 + exp(log P(c2 | x) - log P(c1 | x)))
        const diff = logRejected - logApproved;
        const pRejected = 1 / (1 + Math.exp(-diff));
        const pApproved = 1 - pRejected;

        if (pApproved >= pRejected) {
            return { label: 'approved', confidence: pApproved };
        } else {
            return { label: 'rejected', confidence: pRejected };
        }
    } catch (error) {
        console.error('❌ Lỗi khi dự đoán nhãn:', error);
        return { label: 'approved', confidence: 0.5 };
    }
}

module.exports = {
    trainModel,
    predictClass
};
