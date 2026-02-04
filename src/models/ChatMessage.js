const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RegisterUser',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system', 'bot'],
      default: 'text',
    },
    isBot: {
      type: Boolean,
      default: false,
    },
    botResponse: {
      intent: {
        type: String,
        default: null,
      },
      confidence: {
        type: Number,
        default: 0,
      },
      responseType: {
        type: String,
        enum: ['greeting', 'workout', 'nutrition', 'subscription', 'general', 'unknown'],
        default: 'general',
      },
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RegisterUser',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    editedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'file', 'link'],
      },
      url: String,
      filename: String,
      size: Number,
    }],
    metadata: {
      userAgent: String,
      ipAddress: String,
      deviceType: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
chatMessageSchema.index({ chatRoom: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });
chatMessageSchema.index({ isDeleted: 1, createdAt: -1 });
chatMessageSchema.index({ messageType: 1 });

// Pre-save middleware to update last activity in chat room
chatMessageSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      await mongoose.model('ChatRoom').findByIdAndUpdate(
        this.chatRoom,
        { 
          lastMessage: this._id,
          lastActivity: new Date(),
        }
      );
    } catch (error) {
      console.error('Error updating chat room last activity:', error);
    }
  }
  next();
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;