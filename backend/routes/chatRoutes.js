const express = require('express');
const router = express.Router();
const { getConversations, getMessages, sendMessage, getUnreadCount, deleteMessage, deleteConversation } = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

router.get('/conversations', authenticate, getConversations);
router.get('/messages/:userId', authenticate, getMessages);
router.post('/messages', authenticate, sendMessage);
router.get('/unread', authenticate, getUnreadCount);
router.get('/unread-count', authenticate, getUnreadCount);
router.delete('/messages/:id', authenticate, deleteMessage);
router.delete('/conversations/:userId', authenticate, deleteConversation);

module.exports = router;
