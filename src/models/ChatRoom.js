const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['private', 'group', 'support', 'bot'],
      default: 'private',
    },
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RegisterUser',
        required: true,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      role: {
        type: String,
        enum: ['admin', 'member', 'bot'],
        default: 'member',
      },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    botEnabled: {
      type: Boolean,
      default: false,
    },
    botSettings: {
      welcomeMessage: {
        type: String,
        default: 'Hello! I am your fitness assistant. How can I help you today?',
      },
      autoReply: {
        type: Boolean,
        default: true,
      },
      responseDelay: {
        type: Number,
        default: 1000, // milliseconds
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
chatRoomSchema.index({ 'participants.user': 1 });
chatRoomSchema.index({ type: 1, isActive: 1 });
chatRoomSchema.index({ lastActivity: -1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = ChatRoom;