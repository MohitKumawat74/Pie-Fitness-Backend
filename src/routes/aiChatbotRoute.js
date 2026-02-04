const express = require('express');
const router = express.Router();
const AIChatbotController = require('../controllers/aiChatbotController');

// Middleware for request validation
const validateSessionId = (req, res, next) => {
  const { sessionId } = req.body || req.query;
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Session ID is required',
    });
  }
  next();
};

const validateMessage = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid message text is required',
    });
  }
  if (message.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Message too long. Maximum 2000 characters allowed.',
    });
  }
  next();
};

// Initialize or get existing conversation
// POST /api/ai-chatbot/conversation
router.post('/conversation', AIChatbotController.getOrCreateConversation);

// Send message and get AI response  
// POST /api/ai-chatbot/message
router.post('/message', validateSessionId, validateMessage, AIChatbotController.sendMessage);

// Get AI suggestions based on context
// POST /api/ai-chatbot/suggestions  
router.post('/suggestions', AIChatbotController.getSuggestions);

// Get conversation history
// GET /api/ai-chatbot/history?sessionId=xxx&userId=xxx&limit=50
router.get('/history', AIChatbotController.getConversationHistory);

// Provide feedback on bot response
// POST /api/ai-chatbot/feedback
router.post('/feedback', validateSessionId, AIChatbotController.provideFeedback);

// Health check endpoint
// GET /api/ai-chatbot/health
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Chatbot service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Get chatbot statistics (optional - for admin/analytics)
// GET /api/ai-chatbot/stats
router.get('/stats', async (req, res) => {
  try {
    const AIChatbotConversation = require('../models/AIChatbot');
    
    const stats = await AIChatbotConversation.aggregate([
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          activeConversations: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          totalMessages: { $sum: '$analytics.totalMessages' },
          averageConversationDuration: { $avg: '$analytics.conversationDuration' },
          topTopics: {
            $push: '$context.currentTopic'
          }
        }
      }
    ]);

    const topicCounts = {};
    if (stats.length > 0 && stats[0].topTopics) {
      stats[0].topTopics.forEach(topic => {
        if (topic) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      });
    }

    const response = {
      success: true,
      stats: stats.length > 0 ? {
        ...stats[0],
        topTopics: topicCounts,
      } : {
        totalConversations: 0,
        activeConversations: 0,
        totalMessages: 0,
        averageConversationDuration: 0,
        topTopics: {},
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting chatbot stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message,
    });
  }
});

// Archive old conversations (utility endpoint)
// POST /api/ai-chatbot/archive
router.post('/archive', async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    const AIChatbotConversation = require('../models/AIChatbot');
    
    const result = await AIChatbotConversation.archiveOldConversations(daysOld);
    
    res.status(200).json({
      success: true,
      message: `Archived ${result.modifiedCount} conversations older than ${daysOld} days`,
      archivedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error archiving conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive conversations',
      error: error.message,
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('AI Chatbot route error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error in AI chatbot service',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

module.exports = router;