const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const AIChatbotController = require('./aiChatbotController');

class ChatBot {
  constructor() {
    this.responses = {
      greeting: [
        "Hello! I'm your fitness assistant. How can I help you today?",
        "Hi there! Ready to crush your fitness goals?",
        "Welcome! I'm here to help with your fitness journey.",
      ],
      workout: [
        "Great question about workouts! Here are some tips: Start with compound exercises like squats, deadlifts, and push-ups. Aim for 3-4 workouts per week with rest days in between.",
        "For effective workouts, focus on progressive overload - gradually increase weight, reps, or intensity. Don't forget to warm up and cool down!",
        "Mix cardio and strength training for best results. Try HIIT workouts for efficient fat burning and muscle building.",
      ],
      nutrition: [
        "Nutrition is key! Focus on whole foods: lean proteins, complex carbs, healthy fats, and plenty of vegetables. Stay hydrated with 8+ glasses of water daily.",
        "For muscle building, aim for 0.8-1g protein per pound of body weight. Include sources like chicken, fish, eggs, beans, and greek yogurt.",
        "Meal prep can help you stay on track! Prepare balanced meals ahead of time with portion-controlled proteins, carbs, and veggies.",
      ],
      subscription: [
        "Our gym offers flexible membership plans! We have Monthly (₹2,999), Quarterly (₹8,499), Half-Yearly (₹15,999), and Annual (₹29,999) plans to fit your needs.",
        "Quarterly plans include additional benefits like nutrition guidance. Half-yearly adds group training sessions. Annual membership includes personal training and premium facilities access.",
        "All plans include a 7-day free trial. Longer plans offer better value per month. Would you like me to help you choose the best plan for your fitness goals?",
      ],
      general: [
        "I'm here to help with fitness, nutrition, workouts, and gym memberships. What specific topic interests you?",
        "Feel free to ask me about exercise routines, healthy eating, or our gym facilities. I'm here to support your fitness journey!",
        "Is there something specific about fitness or our gym services you'd like to know more about?",
      ],
      unknown: [
        "I'm not sure I understand. Could you ask about fitness, workouts, nutrition, or our gym membership plans?",
        "That's an interesting question! I specialize in fitness and gym-related topics. How can I help you with your fitness goals?",
        "I'd love to help! Try asking me about workout routines, nutrition tips, or our gym membership options.",
      ],
    };

    this.keywords = {
      greeting: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'greetings'],
      workout: ['workout', 'exercise', 'training', 'gym', 'fitness', 'muscle', 'strength', 'cardio', 'hiit', 'routine'],
      nutrition: ['nutrition', 'diet', 'food', 'eat', 'meal', 'protein', 'calories', 'healthy', 'weight loss', 'supplements'],
      subscription: ['membership', 'plan', 'price', 'cost', 'subscription', 'join', 'premium', 'basic', 'elite'],
    };
  }

  analyzeMessage(message) {
    const lowerMessage = message.toLowerCase();
    let bestMatch = 'unknown';
    let maxScore = 0;

    // Check for keyword matches
    for (const [category, keywords] of Object.entries(this.keywords)) {
      let score = 0;
      keywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) {
          score += keyword.length; // Longer keywords get higher weight
        }
      });

      if (score > maxScore) {
        maxScore = score;
        bestMatch = category;
      }
    }

    // Calculate confidence (0-1)
    const confidence = Math.min(maxScore / 10, 1);

    return {
      intent: bestMatch,
      confidence: confidence,
      responseType: bestMatch,
    };
  }

  generateResponse(intent) {
    const responses = this.responses[intent] || this.responses.unknown;
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }

  async processMessage(message, chatRoomId, senderId) {
    try {
      // Check if we should use the advanced AI system or fallback to basic responses
      const useAdvancedAI = process.env.USE_ADVANCED_AI !== 'false'; // Default to true
      
      let responseText, analysis;
      
      if (useAdvancedAI) {
        try {
          // Try to use the advanced AI system
          const aiConversation = { 
            context: { currentTopic: 'general' },
            messages: [],
            getUserMessages: () => [],
            updateContext: () => {},
          };
          
          const aiResponse = await AIChatbotController.generateBotResponse(message, aiConversation);
          responseText = aiResponse.response;
          analysis = {
            intent: aiResponse.metadata.intent,
            confidence: aiResponse.metadata.confidence,
            responseType: aiResponse.metadata.intent,
            suggestions: aiResponse.metadata.suggestedActions,
          };
        } catch (aiError) {
          console.warn('AI system unavailable, falling back to basic responses:', aiError.message);
          // Fallback to basic system
          analysis = this.analyzeMessage(message);
          responseText = this.generateResponse(analysis.intent);
        }
      } else {
        // Use basic system
        analysis = this.analyzeMessage(message);
        responseText = this.generateResponse(analysis.intent);
      }
      
      // Create bot message
      const botMessage = new ChatMessage({
        chatRoom: chatRoomId,
        sender: senderId, // In real implementation, create a dedicated bot user
        message: responseText,
        messageType: 'bot',
        isBot: true,
        botResponse: {
          intent: analysis.intent,
          confidence: analysis.confidence,
          responseType: analysis.responseType || analysis.intent,
          suggestions: analysis.suggestions || [],
          system: useAdvancedAI ? 'ai' : 'basic',
        },
      });

      await botMessage.save();
      await botMessage.populate('sender', 'fullName email');

      return {
        id: botMessage._id.toString(),
        message: botMessage.message,
        messageType: botMessage.messageType,
        isBot: botMessage.isBot,
        sender: {
          id: botMessage.sender._id.toString(),
          fullName: 'PieFitness AI',
          email: 'ai@zenithframe.com',
        },
        botResponse: botMessage.botResponse,
        createdAt: botMessage.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('Error processing bot message:', error);
      throw error;
    }
  }

  // Check if message should trigger bot response
  shouldRespond(message, chatRoom) {
    if (!chatRoom.botEnabled) return false;
    
    // Always respond in bot rooms
    if (chatRoom.type === 'bot') return true;
    
    // Respond if message mentions bot keywords or is a question
    const lowerMessage = message.toLowerCase();
    const botTriggers = ['bot', 'help', '?', 'question', 'assist'];
    
    return botTriggers.some(trigger => lowerMessage.includes(trigger));
  }
}

module.exports = new ChatBot();