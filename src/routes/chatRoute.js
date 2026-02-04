const express = require('express');
const {
  createChatRoom,
  getUserChatRooms,
  getChatMessages,
  sendMessage,
  joinChatRoom,
  leaveChatRoom,
} = require('../controllers/chatController');

const router = express.Router();

// Chat room routes
router.post('/rooms', createChatRoom);
router.get('/rooms/user/:userId', getUserChatRooms);
router.post('/rooms/:roomId/join', joinChatRoom);
router.post('/rooms/:roomId/leave', leaveChatRoom);

// Message routes
router.get('/rooms/:roomId/messages', getChatMessages);
router.post('/rooms/:roomId/messages', sendMessage);

module.exports = router;