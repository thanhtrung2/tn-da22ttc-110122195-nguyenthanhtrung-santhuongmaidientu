const express = require('express');
const router = express.Router();
const { getChatbotResponse } = require('../controllers/chatbotController');

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập câu hỏi' });
        }
        const response = await getChatbotResponse(message);
        res.json({ success: true, data: { response } });
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ success: false, message: 'Lỗi chatbot' });
    }
});

module.exports = router;
