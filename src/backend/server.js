require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve frontend
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/addresses', require('./routes/addressRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/shops', require('./routes/shopRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/promotions', require('./routes/promotionRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));

// Custom Admin Routes
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/admin/login.html'));
});
app.get('/admin', (req, res) => {
    res.redirect('/admin/login');
});

// API 404 - trả lỗi rõ ràng thay vì hang khi route không tồn tại
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `API endpoint không tồn tại: ${req.method} ${req.originalUrl}` });
});

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
    const filePath = path.join(__dirname, '../frontend/public', req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
    }
    res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'));
});

// Socket.io
const { initSocket } = require('./socket/chatSocket');
initSocket(io);

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Tự động huấn luyện mô hình kiểm duyệt khi khởi động nếu chưa có trọng số
const moderationModel = require('./utils/moderationModel');
const moderationModelPath = path.join(__dirname, 'data/moderation_model.json');
if (!fs.existsSync(moderationModelPath)) {
    console.log('🔄 Đang tự động huấn luyện mô hình kiểm duyệt lần đầu...');
    moderationModel.trainModel()
        .then(() => console.log('✅ Huấn luyện mô hình lần đầu hoàn tất!'))
        .catch(err => console.error('❌ Lỗi tự động huấn luyện mô hình:', err));
}

const PORT = process.env.PORT || 3000;

// Cập nhật Database Schema cho chức năng Quên mật khẩu
const pool = require('./config/database');
pool.query('ALTER TABLE nguoi_dung ADD COLUMN reset_token VARCHAR(255) NULL;')
    .catch(err => { if (err.code !== 'ER_DUP_FIELDNAME') console.error('Error adding reset_token column:', err.message); });
pool.query('ALTER TABLE nguoi_dung ADD COLUMN reset_token_expires TIMESTAMP NULL;')
    .catch(err => { if (err.code !== 'ER_DUP_FIELDNAME') console.error('Error adding reset_token_expires column:', err.message); });
pool.query("ALTER TABLE san_pham MODIFY COLUMN trang_thai ENUM('active', 'inactive', 'banned', 'deleted') DEFAULT 'active';")
    .catch(err => { console.error('Error updating trang_thai enum:', err.message); });
pool.query('ALTER TABLE nguoi_dung ADD COLUMN ngay_sinh DATE DEFAULT NULL;')
    .catch(err => { if (err.code !== 'ER_DUP_FIELDNAME') console.error('Error adding ngay_sinh column:', err.message); });
const addColumns = async () => {
    try {
        const [spCols] = await pool.query("SHOW COLUMNS FROM san_pham");
        const spColNames = spCols.map(c => c.Field);
        if (!spColNames.includes('video_url')) {
            await pool.query('ALTER TABLE san_pham ADD COLUMN video_url VARCHAR(500) NULL;');
        }
        if (!spColNames.includes('hinh_anh_phu')) {
            await pool.query('ALTER TABLE san_pham ADD COLUMN hinh_anh_phu JSON NULL;');
        }
        
        const [btCols] = await pool.query("SHOW COLUMNS FROM san_pham_bien_the");
        const btColNames = btCols.map(c => c.Field);
        if (!btColNames.includes('hinh_anh')) {
            await pool.query('ALTER TABLE san_pham_bien_the ADD COLUMN hinh_anh VARCHAR(500) NULL;');
        }
        
        const [dhCols] = await pool.query("SHOW COLUMNS FROM don_hang");
        const dhColNames = dhCols.map(c => c.Field);
        if (!dhColNames.includes('vi_voucher_id')) {
            await pool.query('ALTER TABLE don_hang ADD COLUMN vi_voucher_id INT NULL;');
        }
    } catch (err) {
        console.error('Error in addColumns startup script:', err.message);
    }
};
addColumns();

server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📦 API: http://localhost:${PORT}/api`);
});

module.exports = { app, server, io };
