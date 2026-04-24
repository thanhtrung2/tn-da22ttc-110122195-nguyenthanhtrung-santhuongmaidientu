const express = require('express');
const router = express.Router();
const { getConversations, getMessages, sendMessage, getUnreadCount } = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

router.get('/conversations', authenticate, getConversations);
router.get('/messages/:userId', authenticate, getMessages);
router.post('/messages', authenticate, sendMessage);
router.get('/unread', authenticate, getUnreadCount);

module.exports = router;
