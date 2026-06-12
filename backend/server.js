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
    res.status(404).json({ success: false, message: `API endpoint không tồn tại: ${req.method} ${req.path}` });
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
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📦 API: http://localhost:${PORT}/api`);
});

module.exports = { app, server, io };
