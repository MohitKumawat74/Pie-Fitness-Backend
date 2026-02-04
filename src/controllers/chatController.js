const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const RegisterUser = require('../models/RegisterUser');
const mongoose = require('mongoose');

// Create a new chat room
exports.createChatRoom = async (req, res) => {
  try {
    const { name, description, type = 'private', participants, botEnabled = false } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Chat room name is required' });
    }

    // Validate participants
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: 'At least one participant is required' });
    }

    // Check if all participant users exist
    const validUsers = await RegisterUser.find({ 
      _id: { $in: participants.map(p => p.user || p) } 
    });

    if (validUsers.length !== participants.length) {
      return res.status(400).json({ message: 'Some participants do not exist' });
    }

    const chatRoom = new ChatRoom({
      name,
      description,
      type,
      participants: participants.map(p => ({
        user: p.user || p,
        role: p.role || 'member',
        joinedAt: new Date(),
      })),
      botEnabled,
      lastActivity: new Date(),
    });

    await chatRoom.save();
    await chatRoom.populate('participants.user', 'fullName email');

    res.status(201).json({
      message: 'Chat room created successfully',
      chatRoom: {
        id: chatRoom._id.toString(),
        name: chatRoom.name,
        description: chatRoom.description,
        type: chatRoom.type,
        participants: chatRoom.participants.map(p => ({
          id: p.user._id.toString(),
          fullName: p.user.fullName,
          email: p.user.email,
          role: p.role,
          joinedAt: p.joinedAt.toISOString(),
        })),
        botEnabled: chatRoom.botEnabled,
        createdAt: chatRoom.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ message: 'Error creating chat room', error: error.message });
  }
};

// Get user's chat rooms
exports.getUserChatRooms = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const chatRooms = await ChatRoom.find({
      'participants.user': userId,
      isActive: true,
    })
      .populate('participants.user', 'fullName email')
      .populate('lastMessage')
      .sort({ lastActivity: -1 })
      .limit(50);

    const formattedRooms = chatRooms.map(room => ({
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      type: room.type,
      participants: room.participants.map(p => ({
        id: p.user._id.toString(),
        fullName: p.user.fullName,
        email: p.user.email,
        role: p.role,
        joinedAt: p.joinedAt.toISOString(),
      })),
      botEnabled: room.botEnabled,
      lastMessage: room.lastMessage ? {
        id: room.lastMessage._id.toString(),
        message: room.lastMessage.message,
        sender: room.lastMessage.sender.toString(),
        createdAt: room.lastMessage.createdAt.toISOString(),
      } : null,
      lastActivity: room.lastActivity.toISOString(),
      createdAt: room.createdAt.toISOString(),
    }));

    res.json({ chatRooms: formattedRooms });
  } catch (error) {
    console.error('Error fetching user chat rooms:', error);
    res.status(500).json({ message: 'Error fetching chat rooms', error: error.message });
  }
};

// Get chat room messages
exports.getChatMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    // Check if chat room exists
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await ChatMessage.find({
      chatRoom: roomId,
      isDeleted: false,
    })
      .populate('sender', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const formattedMessages = messages.reverse().map(msg => ({
      id: msg._id.toString(),
      message: msg.message,
      messageType: msg.messageType,
      isBot: msg.isBot,
      sender: {
        id: msg.sender._id.toString(),
        fullName: msg.sender.fullName,
        email: msg.sender.email,
      },
      botResponse: msg.botResponse,
      attachments: msg.attachments,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    }));

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
};

// Send a message (REST endpoint - real-time handled by Socket.IO)
exports.sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message, senderId, messageType = 'text' } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: 'Invalid room ID or sender ID' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Check if chat room exists and user is participant
    const chatRoom = await ChatRoom.findOne({
      _id: roomId,
      'participants.user': senderId,
      isActive: true,
    });

    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found or user not authorized' });
    }

    const newMessage = new ChatMessage({
      chatRoom: roomId,
      sender: senderId,
      message: message.trim(),
      messageType,
      isBot: false,
    });

    await newMessage.save();
    await newMessage.populate('sender', 'fullName email');

    const formattedMessage = {
      id: newMessage._id.toString(),
      message: newMessage.message,
      messageType: newMessage.messageType,
      isBot: newMessage.isBot,
      sender: {
        id: newMessage.sender._id.toString(),
        fullName: newMessage.sender.fullName,
        email: newMessage.sender.email,
      },
      createdAt: newMessage.createdAt.toISOString(),
    };

    res.status(201).json({
      message: 'Message sent successfully',
      chatMessage: formattedMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
};

// Join a chat room
exports.joinChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, role = 'member' } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid room ID or user ID' });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user already in room
    const existingParticipant = chatRoom.participants.find(p => p.user.toString() === userId);
    if (existingParticipant) {
      return res.status(400).json({ message: 'User already in chat room' });
    }

    // Check if user exists
    const user = await RegisterUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    chatRoom.participants.push({
      user: userId,
      role,
      joinedAt: new Date(),
    });

    await chatRoom.save();

    res.json({ message: 'Successfully joined chat room' });
  } catch (error) {
    console.error('Error joining chat room:', error);
    res.status(500).json({ message: 'Error joining chat room', error: error.message });
  }
};

// Leave a chat room
exports.leaveChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid room ID or user ID' });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Remove user from participants
    chatRoom.participants = chatRoom.participants.filter(p => p.user.toString() !== userId);

    // If no participants left, deactivate the room
    if (chatRoom.participants.length === 0) {
      chatRoom.isActive = false;
    }

    await chatRoom.save();

    res.json({ message: 'Successfully left chat room' });
  } catch (error) {
    console.error('Error leaving chat room:', error);
    res.status(500).json({ message: 'Error leaving chat room', error: error.message });
  }
};