const mongoose = require('mongoose');

// AI Chatbot Conversation Schema
const aiChatbotConversationSchema = new mongoose.Schema({
  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RegisterUser',
    default: null, // Allow anonymous users
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  
  // Conversation metadata
  conversationTitle: {
    type: String,
    default: 'Fitness Chat',
    maxlength: 100,
  },
  
  // Messages in the conversation
  messages: [{
    messageId: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    sender: {
      type: String,
      enum: ['user', 'bot'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Bot-specific metadata
    botMetadata: {
      responseTime: Number, // ms
      confidence: Number, // 0-1
      intent: String,
      // entities may be objects like { type: 'bodyParts', value: 'chest' }
      // so use a Mixed type array to accept either strings or objects
      entities: [mongoose.Schema.Types.Mixed],
      suggestedActions: [String],
    },
    // User feedback on bot responses
    feedback: {
      helpful: {
        type: Boolean,
        default: null,
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
    },
  }],
  
  // Conversation context and state
  context: {
    // User's fitness profile
    fitnessLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'unknown'],
      default: 'unknown',
    },
    fitnessGoals: [{
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'general_fitness'],
    }],
    // currentTopic previously had a strict enum that caused validation
    // errors when newer topic strings (for example 'weightLoss') were
    // introduced by the AI or frontend. Make this a flexible string to
    // accept free-form topics while keeping a sensible default.
    currentTopic: {
      type: String,
      default: 'general',
      // We intentionally avoid enum here to allow evolving topic names.
      // Optionally, callers may normalize topics before saving.
    },
    previousTopics: [String],
    
    // Preferences learned during conversation
    preferredWorkoutTypes: [String],
    dietaryRestrictions: [String],
    availableEquipment: [String],
    timeConstraints: String,
    
    // Conversation flow
    lastBotSuggestions: [String],
    conversationStage: {
      type: String,
      enum: ['greeting', 'assessment', 'recommendation', 'follow_up', 'closing'],
      default: 'greeting',
    },
  },
  
  // Analytics and tracking
  analytics: {
    totalMessages: {
      type: Number,
      default: 0,
    },
    conversationDuration: Number, // minutes
    topicsDiscussed: [String],
    satisfactionScore: Number, // 0-10
    resolvedQueries: Number,
    followUpNeeded: {
      type: Boolean,
      default: false,
    },
  },
  
  // Status and metadata
  isActive: {
    type: Boolean,
    default: true,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  
}, {
  timestamps: true,
});

// Indexes for performance
aiChatbotConversationSchema.index({ sessionId: 1, createdAt: -1 });
aiChatbotConversationSchema.index({ userId: 1, createdAt: -1 });
aiChatbotConversationSchema.index({ 'context.currentTopic': 1 });
aiChatbotConversationSchema.index({ isActive: 1, lastActivity: -1 });

// Pre-save middleware to update analytics
aiChatbotConversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.analytics.totalMessages = this.messages.length;
    this.lastActivity = new Date();
    
    // Update conversation duration
    if (this.messages.length > 1) {
      const firstMessage = this.messages[0];
      const lastMessage = this.messages[this.messages.length - 1];
      this.analytics.conversationDuration = Math.round(
        (lastMessage.timestamp - firstMessage.timestamp) / (1000 * 60)
      );
    }
    
    // Extract topics discussed
    const topics = new Set();
    this.messages.forEach(msg => {
      if (msg.botMetadata && msg.botMetadata.intent) {
        topics.add(msg.botMetadata.intent);
      }
    });
    this.analytics.topicsDiscussed = Array.from(topics);
  }
  next();
});

// Normalize some legacy topic variants to a consistent naming scheme.
// This helps when older clients or external LLMs use different casing
// or naming (for example 'weightLoss' vs 'weight_loss'). Keep this
// lightweight; callers can provide more advanced normalization if needed.
aiChatbotConversationSchema.pre('save', function(next) {
  if (this.context && typeof this.context.currentTopic === 'string') {
    const topic = this.context.currentTopic;
    // simple normalization: convert camelCase to snake_case and lower-case
    const snake = topic.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    this.context.currentTopic = snake;
    this.markModified('context.currentTopic');
  }
  next();
});

// Instance methods
aiChatbotConversationSchema.methods.addMessage = function(messageData) {
  const message = {
    messageId: new mongoose.Types.ObjectId().toString(),
    text: messageData.text,
    sender: messageData.sender,
    timestamp: new Date(),
    botMetadata: messageData.botMetadata || {},
    feedback: messageData.feedback || {},
  };
  
  this.messages.push(message);
  return message;
};

aiChatbotConversationSchema.methods.updateContext = function(contextUpdates) {
  Object.keys(contextUpdates).forEach(key => {
    if (key in this.context) {
      this.context[key] = contextUpdates[key];
    }
  });
  this.markModified('context');
};

aiChatbotConversationSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

aiChatbotConversationSchema.methods.getBotMessages = function() {
  return this.messages.filter(msg => msg.sender === 'bot');
};

aiChatbotConversationSchema.methods.getUserMessages = function() {
  return this.messages.filter(msg => msg.sender === 'user');
};

// Static methods
aiChatbotConversationSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ sessionId, isActive: true });
};

aiChatbotConversationSchema.statics.createNewConversation = function(sessionId, userId = null) {
  return this.create({
    sessionId,
    userId,
    conversationTitle: 'Fitness Chat',
    messages: [{
      messageId: new mongoose.Types.ObjectId().toString(),
      text: "Hi! I'm your PieFitness AI assistant. I'm here to help you with workout plans, nutrition advice, and fitness tips. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
      botMetadata: {
        intent: 'greeting',
        confidence: 1.0,
        suggestedActions: [
          'Suggest me a 4-day workout split',
          'What is the best diet for muscle gain?',
          'How do I lose weight effectively?',
          'What supplements should I take?',
          'Suggest me a 4-day workout split',
          'What is the best diet for muscle gain?',
          'How do I lose weight effectively?',
          'What supplements should I take?',
          'Recommend a beginner home workout routine',
          'What are the best cardio exercises for fat loss?',
          'How can I improve my workout recovery?',
          'Explain progressive overload in training',
          'Give tips for staying motivated with exercise',
          'What foods should I avoid for fat loss?',
          'Share a sample meal plan for muscle building',
          'How do I track my fitness progress?',
          'What are the benefits of stretching regularly?',
          'How much protein do I need per day?',
          'Suggest ways to increase workout intensity',
          'Advice for preventing workout injuries',
          'How much protein do I need per day?',
          'Suggest ways to increase workout intensity',
          'Advice for preventing workout injuries',
          'How do I build healthy habits around food and exercise?',
          'What is the ideal workout duration for results?',
          'What are the top mistakes people make while dieting?'
        ],
      },
    }],
    context: {
      conversationStage: 'greeting',
      currentTopic: 'general',
    },
  });
};

aiChatbotConversationSchema.statics.getActiveConversations = function(userId = null, limit = 50) {
  const query = { isActive: true };
  if (userId) {
    query.userId = userId;
  }
  
  return this.find(query)
    .sort({ lastActivity: -1 })
    .limit(limit)
    .select('sessionId conversationTitle lastActivity analytics.totalMessages context.currentTopic');
};

aiChatbotConversationSchema.statics.archiveOldConversations = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.updateMany(
    { lastActivity: { $lt: cutoffDate }, isActive: true },
    { $set: { isArchived: true, isActive: false } }
  );
};

// Virtual for conversation summary
aiChatbotConversationSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    sessionId: this.sessionId,
    title: this.conversationTitle,
    messageCount: this.analytics.totalMessages,
    duration: this.analytics.conversationDuration,
    currentTopic: this.context.currentTopic,
    lastActivity: this.lastActivity,
    isActive: this.isActive,
  };
});

// Ensure virtual fields are serialized
aiChatbotConversationSchema.set('toJSON', { virtuals: true });
aiChatbotConversationSchema.set('toObject', { virtuals: true });

const AIChatbotConversation = mongoose.model('AIChatbotConversation', aiChatbotConversationSchema);

module.exports = AIChatbotConversation;