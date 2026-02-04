const AIChatbotConversation = require('../models/AIChatbot');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const Groq = require('groq-sdk');

// Initialize AI clients based on configuration
let openai = null;
let groq = null;
let aiProvider = process.env.AI_PROVIDER || 'groq';

// Initialize Groq client (FREE alternative)
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  console.log('Groq client initialized successfully (FREE AI provider)');
} else {
  console.warn('Groq API key not configured.');
}

// Initialize OpenAI client (fallback)
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('OpenAI client initialized successfully');
} else {
  console.warn('OpenAI API key not configured.');
}

// Determine which AI client to use
const getActiveAI = () => {
  if (aiProvider === 'groq' && groq) return { client: groq, type: 'groq' };
  if (aiProvider === 'openai' && openai) return { client: openai, type: 'openai' };
  if (groq) return { client: groq, type: 'groq' }; // Default to Groq if available
  if (openai) return { client: openai, type: 'openai' }; // Fallback to OpenAI
  return null; // No AI available, use rule-based
};

// Fitness knowledge base and response templates
const fitnessKnowledge = {
  workouts: {
    beginner: {
      fullBody: "For beginners, I recommend 3 full-body workouts per week: Squats, Push-ups, Planks, Lunges, and basic cardio. Start with 2-3 sets of 8-12 reps.",
      split: "A simple 3-day split: Day 1: Upper body (push-ups, rows, shoulder press), Day 2: Lower body (squats, lunges, calf raises), Day 3: Core and cardio.",
    },
    intermediate: {
      fullBody: "4-day upper/lower split: Day 1 & 3: Upper (bench press, rows, shoulder press, bicep/tricep work), Day 2 & 4: Lower (squats, deadlifts, lunges, calf work).",
      split: "4-day split: Day 1: Chest & Triceps, Day 2: Back & Biceps, Day 3: Legs & Glutes, Day 4: Shoulders & Core. Focus on progressive overload!",
    },
    advanced: {
      fullBody: "6-day push/pull/legs split repeated twice weekly with advanced techniques like drop sets, supersets, and periodization.",
      split: "Advanced 5-6 day split with specialization: Push/Pull/Legs/Push/Pull/Legs or Body part splits with advanced techniques.",
    },
  },
  
  nutrition: {
    weightLoss: "For weight loss: Create a 300-500 calorie deficit, prioritize protein (0.8-1g per lb), eat whole foods, track calories, stay hydrated. Include both cardio and strength training.",
    muscleGain: "For muscle gain: Eat in a 300-500 calorie surplus, consume 0.8-1g protein per lb bodyweight, focus on complex carbs around workouts, healthy fats 20-30% of calories.",
    maintenance: "For maintenance: Eat at your TDEE, balance macronutrients (protein 25-30%, carbs 40-50%, fats 20-30%), focus on nutrient-dense whole foods.",
  },
  
  supplements: {
    basic: "Essential supplements: Whey protein powder, creatine monohydrate (3-5g daily), multivitamin, omega-3 fish oil, vitamin D3.",
    performance: "Performance supplements: Pre-workout (caffeine + citrulline), beta-alanine, HMB for recovery, ZMA for sleep and recovery.",
    specialized: "Specialized needs: BCAAs for fasted training, casein protein before bed, digestive enzymes, probiotics for gut health.",
  },
  
  exercises: {
    chest: "Best chest exercises: Bench press, incline dumbbell press, dips, push-ups, chest flyes. Focus on full range of motion and progressive overload.",
    back: "Best back exercises: Pull-ups, rows (barbell/dumbbell), lat pulldowns, deadlifts, face pulls. Maintain proper posture and squeeze shoulder blades.",
    legs: "Best leg exercises: Squats, deadlifts, lunges, leg press, Bulgarian split squats, calf raises. Don't skip leg day!",
    shoulders: "Best shoulder exercises: Overhead press, lateral raises, rear delt flyes, upright rows. Focus on form over weight.",
    arms: "Best arm exercises: Bicep curls, tricep dips, hammer curls, close-grip push-ups, overhead tricep extension.",
  },
};

// Intent recognition patterns
const intentPatterns = {
  workout: /workout|exercise|train|split|routine|gym|fitness|muscle|strength/i,
  nutrition: /diet|nutrition|eat|food|meal|calorie|macro|protein|carb|fat/i,
  supplements: /supplement|protein|creatine|vitamin|pre.?workout|bcaa|whey/i,
  weightLoss: /lose weight|fat loss|cutting|slim|diet|cardio/i,
  muscleGain: /muscle gain|bulk|mass|size|grow|build muscle/i,
  form: /form|technique|how to|proper|correct|safety/i,
  motivation: /motivation|inspire|goal|progress|consistency|discipline/i,
  equipment: /equipment|gym|home|dumbbells|barbell|machine/i,
  beginner: /beginner|start|new|first time|just started/i,
  advanced: /advanced|experienced|expert|professional|years/i,
};

// Entity extraction patterns
const entityPatterns = {
  bodyParts: /chest|back|legs|shoulders|arms|biceps|triceps|abs|core|glutes/gi,
  timeFrames: /\d+\s*(day|week|month|year)s?/gi,
  numbers: /\d+/g,
  equipment: /dumbbell|barbell|machine|cable|bodyweight|resistance band/gi,
};

class AIChatbotController {
  // Initialize or get existing conversation
  static async getOrCreateConversation(req, res) {
    try {
      const { sessionId, userId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required',
        });
      }

      // Try to find existing conversation
      let conversation = await AIChatbotConversation.findBySessionId(sessionId);
      
      if (!conversation) {
        // Create new conversation
        conversation = await AIChatbotConversation.createNewConversation(sessionId, userId);
      }

      // Prepare messages for output: coalesce multipart bot messages into
      // single responses for easier frontend rendering.
      const recent = conversation.getRecentMessages(50);
      const outMsgs = AIChatbotController.coalesceMessagesForOutput(recent);

      const response = {
        success: true,
        conversation: {
          id: conversation._id,
          sessionId: conversation.sessionId,
          title: conversation.conversationTitle,
          messages: outMsgs.slice(-20), // Last 20 coalesced messages
          context: conversation.context,
          isActive: conversation.isActive,
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get or create conversation',
        error: error.message,
      });
    }
  }

  // Coalesce saved messages: if multiple consecutive bot messages have
  // botMetadata.part/totalParts, merge them into one logical reply in the
  // API response while leaving the DB unchanged. Returns an array of
  // simplified message objects for API output.
  static coalesceMessagesForOutput(messages) {
    const out = [];
    let i = 0;
    while (i < messages.length) {
      const msg = messages[i];
      if (msg.sender === 'bot' && msg.botMetadata && msg.botMetadata.totalParts && msg.botMetadata.totalParts > 1) {
        // Collect all parts belonging to this multipart message
        const total = msg.botMetadata.totalParts;
        const parts = [msg];
        let j = i + 1;
        while (j < messages.length && parts.length < total) {
          const next = messages[j];
          if (next.sender === 'bot' && next.botMetadata && next.botMetadata.part) {
            parts.push(next);
            j++;
          } else {
            break;
          }
        }

        // Sort by part index just in case
        parts.sort((a, b) => (a.botMetadata.part || 0) - (b.botMetadata.part || 0));
        const mergedText = parts.map(p => p.text).join('\n\n');
        const mergedMeta = Object.assign({}, parts[0].botMetadata || {});
        mergedMeta.merged = true;
        mergedMeta.parts = parts.map(p => p.messageId);

        out.push({ id: parts[0].messageId, text: mergedText, sender: 'bot', timestamp: parts[parts.length - 1].timestamp, metadata: mergedMeta });

        i = j; // skip consumed parts
        continue;
      }

      // Normal message, push simplified shape
      out.push({ id: msg.messageId, text: msg.text, sender: msg.sender, timestamp: msg.timestamp, metadata: msg.botMetadata });
      i++;
    }
    return out;
  }

  // Send message and get AI response
  static async sendMessage(req, res) {
    try {
      const { sessionId, message, userId } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({
          success: false,
          message: 'Session ID and message are required',
        });
      }

      // Get conversation
      let conversation = await AIChatbotConversation.findBySessionId(sessionId);
      
      if (!conversation) {
        conversation = await AIChatbotConversation.createNewConversation(sessionId, userId);
      }

      // Ensure context object exists to avoid undefined lookups later
      conversation.context = conversation.context || {};

      // Add user message
      const userMessage = conversation.addMessage({
        text: message.trim(),
        sender: 'user',
      });

      // Generate bot response
      const botResponseData = await AIChatbotController.generateBotResponse(message, conversation);
      
      // Add bot message(s). The schema limits message.text to 2000 chars. If
      // the AI response is longer, split into multiple messages at sensible
      // boundaries (paragraphs or sentences) and save each as a separate
      // message with part metadata so the frontend can reassemble if needed.
      const MAX_LEN = 2000;
      const botText = botResponseData.response || '';
      const createdBotMessages = [];

      // Simple splitter: prefer paragraph breaks, then sentence punctuation,
      // otherwise hard split by max length.
      function splitTextIntoChunks(text, maxLen) {
        if (!text) return [];
        const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
        const chunks = [];

        for (const para of paragraphs) {
          if (para.length <= maxLen) {
            chunks.push(para);
            continue;
          }
          // Try split by sentences
          const sentences = para.match(/[^.!?。！？]+[.!?。！？]?/g) || [para];
          let buffer = '';
          for (const s of sentences) {
            if ((buffer + ' ' + s).trim().length <= maxLen) {
              buffer = (buffer + ' ' + s).trim();
            } else {
              if (buffer) chunks.push(buffer);
              if (s.length > maxLen) {
                // hard split the long sentence
                for (let i = 0; i < s.length; i += maxLen) {
                  chunks.push(s.slice(i, i + maxLen));
                }
                buffer = '';
              } else {
                buffer = s.trim();
              }
            }
          }
          if (buffer) chunks.push(buffer);
        }
        // If still empty (no paragraphs), fall back to hard splits
        if (chunks.length === 0 && text.length > 0) {
          for (let i = 0; i < text.length; i += maxLen) {
            chunks.push(text.slice(i, i + maxLen));
          }
        }
        return chunks;
      }

      const chunks = splitTextIntoChunks(botText, MAX_LEN);
      const total = chunks.length || 1;

      for (let i = 0; i < Math.max(1, chunks.length); i++) {
        const chunkText = chunks[i] || botText.slice(0, MAX_LEN);
        const meta = Object.assign({}, botResponseData.metadata || {});
        if (total > 1) {
          meta.truncated = true;
          meta.part = i + 1;
          meta.totalParts = total;
        }

        const bmsg = conversation.addMessage({
          text: chunkText,
          sender: 'bot',
          botMetadata: meta,
        });
        createdBotMessages.push(bmsg);
      }

      // Update conversation context
      if (botResponseData.contextUpdates) {
        conversation.updateContext(botResponseData.contextUpdates);
      }

      // Save conversation
      await conversation.save();

      // Build response messages: include the user message and bot messages.
      // If the bot response was split into multiple saved chunks, return a
      // merged/combined bot message in the API response for simpler frontend
      // display, while keeping chunked messages saved in the DB.
      const outMessages = [];

      outMessages.push({
        id: userMessage.messageId,
        text: userMessage.text,
        sender: userMessage.sender,
        timestamp: userMessage.timestamp,
      });

      if (createdBotMessages.length <= 1) {
        // No chunking - return the single bot message as-is
        for (const b of createdBotMessages) {
          outMessages.push({
            id: b.messageId,
            text: b.text,
            sender: b.sender,
            timestamp: b.timestamp,
            metadata: b.botMetadata,
          });
        }
      } else {
        // We saved multiple parts. Build a merged message for the response
        // so the frontend sees one coherent reply.
        const partsOrdered = createdBotMessages
          .slice()
          .sort((a, b) => (a.botMetadata?.part || 1) - (b.botMetadata?.part || 1));

        const mergedText = partsOrdered.map(p => p.text).join('\n\n');
        const mergedMetadata = Object.assign({}, partsOrdered[0].botMetadata || {});
        mergedMetadata.merged = true;
        mergedMetadata.totalParts = partsOrdered[0].botMetadata?.totalParts || partsOrdered.length;
        mergedMetadata.part = 1;
        mergedMetadata.parts = partsOrdered.map(p => p.messageId);

        outMessages.push({
          id: partsOrdered[0].messageId,
          text: mergedText,
          sender: partsOrdered[0].sender,
          timestamp: partsOrdered[partsOrdered.length - 1].timestamp,
          metadata: mergedMetadata,
        });
      }

      const response = {
        success: true,
        messages: outMessages,
        conversation: {
          id: conversation._id,
          context: conversation.context,
          analytics: conversation.analytics,
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process message',
        error: error.message,
      });
    }
  }

  // Generate AI suggestions
  static async getSuggestions(req, res) {
    try {
      const { sessionId, context } = req.body;
      
      let suggestions = [];
      
      if (context && context.currentTopic) {
        suggestions = AIChatbotController.getTopicBasedSuggestions(context.currentTopic, context);
      } else {
        // Default suggestions
        suggestions = [
          "Suggest me a 4-day workout split",
          "What is the best diet for muscle gain?",
          "How do I lose weight effectively?",
          "What supplements should I take?",
          "How to improve my squat form?",
          "Best exercises for building chest muscles",
          "How many rest days do I need per week?",
          "What's the ideal protein intake for my goals?",
        ];
      }

      return res.status(200).json({
        success: true,
        suggestions: suggestions.slice(0, 25), // Limit to 25 suggestions
      });
    } catch (error) {
      console.error('Error in getSuggestions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get suggestions',
        error: error.message,
      });
    }
  }

  // Get conversation history
  static async getConversationHistory(req, res) {
    try {
      const { sessionId, userId, limit = 50 } = req.query;
      
      let conversations;
      
      if (sessionId) {
        // Get specific conversation
        const conversation = await AIChatbotConversation.findBySessionId(sessionId);
        conversations = conversation ? [conversation] : [];
      } else {
        // Get user's conversations
        conversations = await AIChatbotConversation.getActiveConversations(userId, parseInt(limit));
      }

      const formattedConversations = conversations.map(conv => ({
        id: conv._id,
        sessionId: conv.sessionId,
        title: conv.conversationTitle,
        messageCount: conv.analytics.totalMessages,
        lastActivity: conv.lastActivity,
        currentTopic: conv.context.currentTopic,
        duration: conv.analytics.conversationDuration,
        summary: conv.summary,
      }));

      return res.status(200).json({
        success: true,
        conversations: formattedConversations,
      });
    } catch (error) {
      console.error('Error in getConversationHistory:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get conversation history',
        error: error.message,
      });
    }
  }

  // Provide feedback on bot response
  static async provideFeedback(req, res) {
    try {
      const { sessionId, messageId, helpful, rating, comment } = req.body;
      
      if (!sessionId || !messageId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID and message ID are required',
        });
      }

      const conversation = await AIChatbotConversation.findBySessionId(sessionId);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      // Find and update message feedback
      const message = conversation.messages.find(msg => msg.messageId === messageId);
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      message.feedback = {
        helpful: helpful !== undefined ? helpful : message.feedback.helpful,
        rating: rating !== undefined ? rating : message.feedback.rating,
        comment: comment || message.feedback.comment,
      };

      await conversation.save();

      return res.status(200).json({
        success: true,
        message: 'Feedback recorded successfully',
      });
    } catch (error) {
      console.error('Error in provideFeedback:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record feedback',
        error: error.message,
      });
    }
  }

  // Generate AI response with fitness expertise (supports Groq and OpenAI)
  static async generateAIResponse(userMessage, conversation) {
    const activeAI = getActiveAI();
    if (!activeAI) {
      throw new Error('No AI provider configured');
    }

    // Build conversation history for context
    const recentMessages = conversation.getRecentMessages ? conversation.getRecentMessages(6) : [];
    
    // Check if message is fitness-related or off-topic
    const fitnessAnalysis = AIChatbotController.analyzeFitnessRelevance(userMessage, conversation);
    
    // Create system prompt that adapts to user input and fitness scope
    const isGreeting = /^(hi+|hello+|hey+|hii+|hey there|hiya|yo|sup|what's up)\b/i.test(userMessage.trim());
    const isQuestion = userMessage.includes('?') || /^(what|how|why|when|where|which|who|can|should|will|do|does|is|are)/i.test(userMessage.trim());
    
    let systemPrompt;
    
    if (fitnessAnalysis.isOffTopic && fitnessAnalysis.consecutiveOffTopicCount >= 2) {
      // User has asked 2+ consecutive off-topic questions
      systemPrompt = `You are PIE Fitness Assistant, a dedicated AI fitness coach. The user has been asking questions outside your expertise area (fitness, health, bodybuilding, nutrition, workouts).

IMPORTANT: You must politely but firmly redirect them back to fitness topics. Use this exact approach:
1. Acknowledge their question briefly but don't answer it
2. Explain you're specifically designed as a PIE Fitness Assistant 
3. Motivate them toward fitness/health topics
4. Ask a specific fitness-related question to engage them

Example response style: "I understand you're curious about [topic], but I'm PIE Fitness Assistant - your dedicated fitness companion! I'm specifically designed to help you achieve your health and fitness goals. Instead of [off-topic], let me help you build strength, improve your nutrition, or create a workout plan that transforms your body and mind. What's your current fitness goal? Are you looking to build muscle, lose weight, or improve your overall health?"

Be encouraging, motivational, and always redirect to fitness. Don't answer non-fitness questions.`;
    } else if (fitnessAnalysis.isOffTopic) {
      // First off-topic question - be gentle but redirect
      systemPrompt = `You are PIE Fitness Assistant, a friendly AI fitness coach. The user asked something outside fitness/health topics.

Respond warmly but redirect to fitness:
1. Briefly acknowledge their question without fully answering it
2. Introduce yourself as PIE Fitness Assistant
3. Gently steer toward fitness topics
4. Ask about their fitness interests

Keep it friendly and motivational, focusing on how fitness can improve their life.`;
    } else {
      // Fitness-related question - normal comprehensive response
      systemPrompt = `You are PIE Fitness Assistant, a highly knowledgeable and motivational AI fitness coach. You specialize in workouts, nutrition, bodybuilding, health, supplements, and fitness motivation.

Key guidelines:
- Always finish your sentences completely. Never leave thoughts incomplete.
- Reply in the same language as the user's message (Hindi, Urdu, English, etc.)
- For greetings: Be enthusiastic about fitness, introduce yourself as PIE Fitness Assistant
- For fitness questions: Provide comprehensive, expert advice with practical tips
- Be motivational and encouraging - remind users of the benefits of fitness
- Include specific actionable advice (sets, reps, timing, techniques)
- Relate everything back to achieving their fitness transformation
- If uncertain about medical issues, recommend consulting healthcare professionals

Your personality: Enthusiastic, knowledgeable, motivational, like a personal trainer who genuinely cares about results.`;
    }

    systemPrompt += `

Current user context:
- Fitness Level: ${conversation.context?.fitnessLevel || 'unknown'}
- Goals: ${conversation.context?.fitnessGoals?.join(', ') || 'general fitness'}
- Current Topic: ${conversation.context?.currentTopic || 'general'}
- Off-topic streak: ${fitnessAnalysis.consecutiveOffTopicCount}/3`;
    

    const messages = [{ role: 'system', content: systemPrompt }];

    // Add recent conversation history
    recentMessages.forEach(msg => {
      if (msg.sender === 'user' || msg.sender === 'bot') {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text || msg.message
        });
      }
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Determine max tokens based on input and message type.
    // Use conservative limits for greetings and very short messages so replies stay concise (1-2 lines).
    const words = userMessage.trim().split(/\s+/).filter(Boolean).length || 1;
    const chars = userMessage.trim().length;
    let maxTokens;
    // Desired maximum characters for the final reply when we need to enforce conciseness
    let desiredMaxChars = null;

    if (isGreeting) {
      // Very short reply for greetings
      maxTokens = 60;
      desiredMaxChars = 200; // ~1-2 short sentences
    } else if (words <= 3) {
      // Very short messages (single words / short exclamations)
      maxTokens = 120;
      desiredMaxChars = 180;
    } else if (!isQuestion && words <= 8) {
      // Short conversational messages
      maxTokens = 180;
      desiredMaxChars = 250;
    } else if (isQuestion || words > 10) {
      maxTokens = Math.min(2000, Math.max(500, words * 25)); // generous for real questions
      desiredMaxChars = Math.min(4000, maxTokens * 4);
    } else {
      maxTokens = Math.min(1200, Math.max(300, chars * 3));
      desiredMaxChars = Math.min(2000, maxTokens * 4);
    }

    try {
      let completion;
      
      if (activeAI.type === 'groq') {
        completion = await activeAI.client.chat.completions.create({
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          stream: false,
        });
      } else if (activeAI.type === 'openai') {
        completion = await activeAI.client.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        });
      }

      let response = completion.choices?.[0]?.message?.content?.trim();
      if (!response) {
        throw new Error('Empty response from AI');
      }

      // Post-process: detect if the response appears truncated or incomplete.
      // Check for: trailing connectors, incomplete words, mid-sentence cuts, etc.
      const trimmedResponse = response.trim();
      const lastWord = trimmedResponse.split(/\s+/).pop() || '';
      
      // More aggressive detection for incomplete responses
      const endsWithoutProperPunctuation = !/[.!?।॥]$/.test(trimmedResponse);
      const endsWithConnector = /[,;:\-\(\[]$|\b(and|but|or|because|so|then|however|ki|ka|ke|ko|se|mein|hai|ho|aur|lekin|par|main|yeh|dhyan|karna|chahiye|batata|karein)\s*$/i.test(trimmedResponse);
      const endsWithIncompletePhrase = /\b(main aapko|yeh dhyan|karna chahiye|batata hoon|karein aur|tareeke se|chahiye aur|hoon jo|kar sakte|ho sakta|raha hai|karne ka|se pehle)\s*$/i.test(trimmedResponse);
      const seemsUnfinished = trimmedResponse.length > 50 && (endsWithoutProperPunctuation && (endsWithConnector || endsWithIncompletePhrase));
      
      const likelyTruncated = seemsUnfinished;
      
      // Debug logging
      console.log(`Response analysis - Length: ${trimmedResponse.length}, MaxTokens: ${maxTokens}, Truncated: ${likelyTruncated}`);
      console.log(`Last 50 chars: "${trimmedResponse.slice(-50)}"`);
      
      if (likelyTruncated) {
        try {
          // Create a more natural continuation prompt
          const lastSentence = trimmedResponse.split(/[.!?।॥]/).pop().trim();
          const finishPrompt = `Continue and complete this fitness advice response naturally in the same language (Hindi/Urdu). The response was cut off mid-sentence.\n\nIncomplete text: "${lastSentence}"\n\nComplete the sentence and add a brief conclusion:`;
          
          let finishCompletion;
          if (activeAI.type === 'groq') {
            finishCompletion = await activeAI.client.chat.completions.create({
              model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
              messages: [
                { role: 'system', content: 'Complete the incomplete fitness advice naturally in Hindi/Urdu. Be helpful and finish the thought properly.' },
                { role: 'user', content: finishPrompt }
              ],
              max_tokens: 200,
              temperature: 0.7,
              top_p: 0.9,
            });
          } else if (activeAI.type === 'openai') {
            finishCompletion = await activeAI.client.chat.completions.create({
              model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: 'Complete the incomplete fitness advice naturally in Hindi/Urdu. Be helpful and finish the thought properly.' },
                { role: 'user', content: finishPrompt }
              ],
              max_tokens: 200,
              temperature: 0.7,
            });
          }
          
          const finishText = finishCompletion?.choices?.[0]?.message?.content?.trim();
          if (finishText && finishText.length > 5) {
            // Clean up the junction between original and completion
            const junction = response.trim().endsWith(' ') ? '' : ' ';
            response = (response.trim() + junction + finishText).trim();
          }
        } catch (errFinish) {
          // If finishing fails, just return the original response
          console.warn('Attempt to finish truncated response failed:', errFinish?.message || errFinish);
        }
      }

      // Enforce concise responses for very short inputs/greetings when desired
      const shouldEnforceConcise = isGreeting || words <= 3 || (!isQuestion && words <= 8);
      if (shouldEnforceConcise && desiredMaxChars) {
        response = AIChatbotController.enforceConciseResponse(response, desiredMaxChars, true);
      }

      return response;
    } catch (err) {
      console.error(`${activeAI.type.toUpperCase()} call failed:`, err?.message || err);
      throw new Error(`${activeAI.type} request failed: ` + (err?.message || 'unknown'));
    }
  }

  // Generate bot response with AI logic
  static async generateBotResponse(userMessage, conversation) {
    const startTime = Date.now();
    
    try {
      // Analyze user message for intent and entities
      const analysis = AIChatbotController.analyzeMessage(userMessage, conversation.context);
      
      // Analyze fitness relevance and off-topic tracking
      const fitnessAnalysis = AIChatbotController.analyzeFitnessRelevance(userMessage, conversation);
      
      let response;
      let aiPowered = false;

      // Try AI providers first, fallback to rule-based
      const activeAI = getActiveAI();
      if (activeAI) {
        try {
          response = await AIChatbotController.generateAIResponse(userMessage, conversation);
          aiPowered = true;
        } catch (aiError) {
          console.warn(`${activeAI.type.toUpperCase()} API error, falling back to rule-based response:`, aiError.message);
          response = AIChatbotController.generateContextualResponseWithScope(analysis, fitnessAnalysis, conversation);
        }
      } else {
        // Use rule-based response with scope management
        response = AIChatbotController.generateContextualResponseWithScope(analysis, fitnessAnalysis, conversation);
      }
      
      // Add helpful suggestions based on intent and scope
      const suggestions = fitnessAnalysis.shouldRedirect || fitnessAnalysis.isOffTopic
        ? AIChatbotController.getMotivationalFitnessSuggestions()
        : AIChatbotController.getTopicBasedSuggestions(analysis.intent, conversation.context);
      
      const responseTime = Date.now() - startTime;
      
      return {
        response,
        metadata: {
          responseTime,
          confidence: aiPowered ? 0.95 : analysis.confidence,
          intent: fitnessAnalysis.isOffTopic ? 'off_topic' : analysis.intent,
          entities: analysis.entities,
          suggestedActions: suggestions.slice(0, 20),
          aiPowered,
          model: aiPowered ? (activeAI?.type === 'groq' ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant') : (process.env.OPENAI_MODEL || 'gpt-3.5-turbo')) : 'rule-based',
          fitnessRelevance: fitnessAnalysis,
        },
        contextUpdates: {
          currentTopic: fitnessAnalysis.isOffTopic ? 'off_topic' : analysis.intent,
          previousTopics: [...(conversation.context.previousTopics || []), analysis.intent].slice(-5),
          conversationStage: AIChatbotController.determineConversationStage(conversation, analysis),
          lastBotSuggestions: suggestions.slice(0, 20),
          consecutiveOffTopicCount: fitnessAnalysis.consecutiveOffTopicCount,
          fitnessRelatedCount: (conversation.context.fitnessRelatedCount || 0) + (fitnessAnalysis.isFitnessRelated ? 1 : 0),
        },
      };
    } catch (error) {
      console.error('Error generating bot response:', error);
      return {
        response: "I'm sorry, I'm having trouble processing your request right now. As your PIE Fitness Assistant, I'm here to help with all your fitness and health questions. What fitness goal can I help you achieve today?",
        metadata: {
          responseTime: Date.now() - startTime,
          confidence: 0.1,
          intent: 'error',
          entities: [],
          suggestedActions: ['Ask about workouts', 'Ask about nutrition', 'Ask about supplements'],
          aiPowered: false,
          model: 'error-fallback',
        },
        contextUpdates: {},
      };
    }
  }

  // Analyze if message is fitness-related and track off-topic patterns
  static analyzeFitnessRelevance(message, conversation) {
    const lowerMessage = message.toLowerCase();
    
    // Fitness-related keywords (expanded list)
    const fitnessKeywords = /\b(workout|exercise|gym|fitness|muscle|strength|diet|nutrition|protein|weight|fat|cardio|training|bodybuilding|squat|deadlift|bench|bicep|tricep|abs|core|calories|supplement|creatine|whey|vitamins|health|body|physique|bulk|cut|lean|reps|sets|form|technique|yoga|pilates|crossfit|running|jogging|swimming|cycling|marathon|athlete|sports|recovery|rest|sleep|hydration|meal|macros|carbs|fats|vitamins|minerals|coach|trainer|challenge|transformation|motivation|discipline|consistency|gains|progress|goals|target|achievement)\b/i;
    
    // Health and wellness related
    const healthKeywords = /\b(health|healthy|wellness|wellbeing|medical|doctor|injury|pain|recovery|rehabilitation|therapy|medicine|treatment|disease|illness|mental health|stress|anxiety|depression|energy|stamina|endurance|flexibility|mobility|posture|spine|joint|bone|heart|blood|pressure|diabetes|cholesterol)\b/i;
    
    // Greeting patterns
    const greetings = /^(hi+|hello+|hey+|hii+|namaste|salaam|adaab|kaise ho|kya haal|how are you|what's up|good morning|good evening)\b/i;
    
    // Definitely off-topic patterns
    const offTopicPatterns = [
      /\b(movie|film|cinema|bollywood|hollywood|actor|actress|song|music|singer|dance|party|politics|politician|election|government|news|weather|cooking|recipe|travel|vacation|holiday|business|job|career|money|shopping|fashion|clothes|technology|phone|computer|software|gaming|game|cricket|football|soccer|IPL|world cup|exam|study|school|college|university|relationship|girlfriend|boyfriend|marriage|wedding|family|friends|love|romance)\b/i,
      /\b(kya kar rahe|kaise ho|kya haal|movie dekhi|film dekhi|gaana|music|paisa|paise|job|career|padhai|study|exam|shaadi|wedding|girlfriend|boyfriend|pyaar|mohabbat|dost|friend|family|ghar|home|office|kaam|business)\b/i
    ];
    
    // Check if message is clearly fitness/health related
    const isFitnessRelated = fitnessKeywords.test(message) || healthKeywords.test(message);
    
    // Check if message is greeting (always acceptable)
    const isGreeting = greetings.test(message.trim());
    
    // Check if message is clearly off-topic
    const isOffTopic = !isFitnessRelated && !isGreeting && offTopicPatterns.some(pattern => pattern.test(message));
    
    // Get conversation context for tracking consecutive off-topic messages
    const context = conversation.context || {};
    const previousOffTopicCount = context.consecutiveOffTopicCount || 0;
    
    let consecutiveOffTopicCount = previousOffTopicCount;
    
    if (isOffTopic) {
      consecutiveOffTopicCount = previousOffTopicCount + 1;
    } else if (isFitnessRelated) {
      consecutiveOffTopicCount = 0; // Reset counter on fitness-related question
    }
    // For greetings or neutral messages, don't change the counter
    
    return {
      isOffTopic,
      isFitnessRelated,
      isGreeting,
      consecutiveOffTopicCount,
      shouldRedirect: consecutiveOffTopicCount >= 2
    };
  }

  // Analyze user message for intent and entities
  static analyzeMessage(message, context) {
    const lowerMessage = message.toLowerCase();
    let intent = 'general';
    let confidence = 0.5;
    const entities = [];

    // Intent detection
    for (const [intentName, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(message)) {
        intent = intentName;
        confidence = 0.8;
        break;
      }
    }

    // Entity extraction
    for (const [entityType, pattern] of Object.entries(entityPatterns)) {
      const matches = message.match(pattern);
      if (matches) {
        entities.push(...matches.map(match => ({ type: entityType, value: match })));
      }
    }

    // Context-based intent refinement
    if (context.currentTopic && intent === 'general') {
      intent = context.currentTopic;
      confidence = 0.6;
    }

    return { intent, confidence, entities };
  }

  // Enforce a concise reply by trimming to sentence boundaries when possible.
  // If the text must be shortened, append a brief offer to elaborate.
  static enforceConciseResponse(text, maxChars, allowOffer = true) {
    if (!text) return text;
    const trimmed = text.trim();
    if (!maxChars || trimmed.length <= maxChars) return trimmed;

    // Split into sentences (supporting common sentence terminators and Indian scripts)
    const sentences = trimmed.match(/[^.!?।॥]+[.!?।॥]?/g) || [trimmed];
    let out = '';
    for (const s of sentences) {
      if ((out + s).trim().length <= maxChars) {
        out += s;
      } else {
        break;
      }
    }

    if (!out) {
      // No full sentence fits; hard truncate at maxChars
      out = trimmed.slice(0, maxChars).trim();
    }

    out = out.trim();
    // Ensure it ends with punctuation for readability
    if (!/[.!?।॥]$/.test(out)) {
      out = out.replace(/[,:;\-\s]+$/g, '');
      if (out.length + 3 <= maxChars) out += '...';
    }

    if (allowOffer) {
      // Keep the offer short so we don't bloat the message
      const offer = ' If you want more details, ask me to elaborate.';
      if (out.length + offer.length <= Math.max(maxChars, out.length + offer.length)) {
        out = out + offer;
      }
    }

    return out;
  }

  // Generate contextual response with scope management
  static generateContextualResponseWithScope(analysis, fitnessAnalysis, conversation) {
    const { intent, entities } = analysis;
    const context = conversation.context || {};
    const userMessages = conversation.getUserMessages();
    const isFirstInteraction = userMessages.length <= 1;

    // Handle off-topic questions based on consecutive count
    if (fitnessAnalysis.isOffTopic) {
      if (fitnessAnalysis.consecutiveOffTopicCount >= 2) {
        // Firm redirect after multiple off-topic questions
        return "I understand you have various interests, but I'm PIE Fitness Assistant - your dedicated fitness companion! 💪 I'm specifically designed to help you transform your body and achieve your health goals. Instead of other topics, let me help you build strength, lose fat, gain muscle, or create the perfect workout routine. Your fitness journey is what I'm passionate about! What's your main fitness goal right now - building muscle, losing weight, or getting stronger? Let's make it happen together! 🔥";
      } else {
        // Gentle redirect for first off-topic question
        return "That's an interesting question! However, I'm PIE Fitness Assistant, your personal AI fitness coach. 🏋️‍♂️ I'm here to help you achieve amazing results with workouts, nutrition, bodybuilding, and fitness motivation. Fitness is not just about physical transformation - it builds mental strength, confidence, and discipline that helps in all areas of life! What fitness challenge can I help you conquer today? Are you looking to build muscle, lose weight, or improve your overall health? Let's get started! 💪";
      }
    }

    // Greeting and assessment
    if (isFirstInteraction || intent === 'general') {
      return "Hello! I'm PIE Fitness Assistant, your dedicated AI fitness coach! 💪 I'm here to help you transform your body and achieve incredible results. Whether you want to build muscle, lose fat, create workout routines, get nutrition advice, or need motivation - I've got you covered! What's your fitness goal? Let's build something amazing together! 🔥";
    }

    // Workout-related responses
    if (intent === 'workout') {
      const candidateLevel = (context.fitnessLevel || 'intermediate').toLowerCase();
      const level = (fitnessKnowledge.workouts[candidateLevel]) ? candidateLevel : 'intermediate';
      const hasEquipment = entities.some(e => e.type === 'equipment');

      const baseAdvice = fitnessKnowledge.workouts[level] && (fitnessKnowledge.workouts[level].split || fitnessKnowledge.workouts[level].fullBody)
        ? (fitnessKnowledge.workouts[level].split || fitnessKnowledge.workouts[level].fullBody)
        : 'Focus on compound movements, progressive overload, and proper form.';

      if (hasEquipment) {
        return `Great question about workouts! ${baseAdvice} Remember, consistency and progressive overload are key to amazing results! Make sure to adjust exercises based on your available equipment and always maintain proper form. Your transformation starts with each rep! 💪`;
      }
      return `${baseAdvice} Would you like me to customize this based on your experience level and available equipment? I'm here to help you build the perfect routine for maximum results! 🔥`;
    }

    // Nutrition responses
    if (intent === 'nutrition' || intent === 'weightLoss' || intent === 'muscleGain') {
      if (intent === 'weightLoss') {
        return `${fitnessKnowledge.nutrition.weightLoss} Remember, sustainable fat loss is about creating healthy habits that last! Would you like me to help you calculate your specific caloric needs? Your transformation journey starts with proper nutrition! 🔥`;
      }
      if (intent === 'muscleGain') {
        return `${fitnessKnowledge.nutrition.muscleGain} Timing your nutrition around workouts can also enhance your results! Fuel your body right and watch those gains happen! 💪`;
      }
      return `${fitnessKnowledge.nutrition.maintenance} Let me know your specific goals and I can provide more targeted advice! Proper nutrition is 70% of your results! 🥗`;
    }

    // Supplement responses
    if (intent === 'supplements') {
      return `${fitnessKnowledge.supplements.basic} These cover the fundamentals for supporting your fitness goals! Remember, supplements support a good diet and training - they're not magic pills, but they can definitely help optimize your results! For specific goals or advanced training, we can discuss additional options. What's your primary fitness goal? 💊💪`;
    }

    // Exercise form responses
    if (intent === 'form') {
      const bodyPart = entities.find(e => e.type === 'bodyParts')?.value || 'general';
      if (fitnessKnowledge.exercises[bodyPart.toLowerCase()]) {
        return `${fitnessKnowledge.exercises[bodyPart.toLowerCase()]} Perfect form equals better results and injury prevention! Would you like detailed form cues for any specific exercise? Let's make every rep count! 🎯`;
      }
      return "Excellent question about form! Proper technique is crucial for both safety and maximum effectiveness! Focus on controlled movements, full range of motion, and really feel that mind-muscle connection. Which specific exercise would you like form tips for? Let's perfect your technique! 💪";
    }

    // Motivation responses
    if (intent === 'motivation') {
      return "You're asking the right questions! 🔥 Consistency is the secret to achieving your fitness goals! Remember: progress isn't always linear, small daily actions lead to BIG transformations, and every single workout counts toward your dream physique. What's your biggest challenge right now? I'm here to help you crush through any obstacle and achieve incredible results! Your transformation starts NOW! 💪";
    }

    // Default contextual response
    return `That's a great fitness question! As your PIE Fitness Assistant, I'm here to help you achieve amazing results. Based on our conversation, I'd recommend focusing on consistency and gradual progression. Would you like me to provide more specific guidance tailored to your fitness goals? Let's build something incredible together! 🔥💪`;
  }

  // Get motivational fitness suggestions for off-topic redirects
  static getMotivationalFitnessSuggestions() {
    return [
      "What's the best workout for beginners?",
      "How do I build muscle fast?",
      "Create a fat loss meal plan for me",
      "What supplements should I take?",
      "How to stay motivated in fitness?",
      "Best exercises for building strength",
      "How to lose belly fat effectively?",
      "Design a home workout routine",
      "What's the perfect diet for muscle gain?",
      "How to improve my squat form?",
      "Best cardio for fat burning",
      "How to build bigger arms?",
      "Create a weekly workout schedule",
      "What are macros and how to track them?",
      "How to overcome fitness plateaus?",
    ];
  }

  // Generate contextual response based on analysis (legacy - keeping for fallback)
  static generateContextualResponse(analysis, conversation) {
    return AIChatbotController.generateContextualResponseWithScope(analysis, { isOffTopic: false, consecutiveOffTopicCount: 0 }, conversation);
  }

  // Get topic-based suggestions
  static getTopicBasedSuggestions(topic, context) {
    // Normalize topic input (accept camelCase, snake_case, different spellings)
    function normalizeTopicKey(t) {
      if (!t) return 'general';
      const s = String(t).replace(/[_\-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
      if (/weight|fat|cut|lose/.test(s)) return 'weightLoss';
      if (/muscle|bulk|mass|hypertrophy/.test(s)) return 'muscleGain';
      if (/nutri|diet|calorie|macro|food/.test(s)) return 'nutrition';
      if (/supplement|protein|creatine|omega|vitamin|probiotic|probiotics/.test(s)) return 'supplements';
      if (/workout|exercise|training|routine|split|gym|fitness/.test(s)) return 'workout';
      return 'general';
    }

    const key = normalizeTopicKey(topic);

    const suggestions = {
      workout: [
        'Suggest me a 4-day workout split',
        'Recommend a beginner home workout routine',
        'What is the best workout split for beginners?',
        'How many sets and reps should I do?',
        'How often should I change my routine?',
        'Suggest ways to increase workout intensity',
        'What is the ideal workout duration for results?',
        'Advice for preventing workout injuries',
        'How can I improve my workout recovery?',
        'Explain progressive overload in training',
        'Give tips for staying motivated with exercise',
      ],
      nutrition: [
        'What is the best diet for muscle gain?',
        'How do I lose weight effectively?',
        'How much protein do I need per day?',
        'Share a sample meal plan for muscle building',
        'What foods should I avoid for fat loss?',
        'How do I track my calorie intake?',
        'What are the top mistakes people make while dieting?',
        'How to meal prep for busy schedules',
        'What are healthy snack options?',
        'Timing nutrition around workouts',
      ],
      supplements: [
        'What supplements should I take?',
        'Do I really need protein powder?',
        'When should I take creatine?',
        'Are pre-workouts necessary?',
        'Best supplements for recovery',
        'Omega-3 vs fish oil: what to choose?',
        'Are multivitamins useful for athletes?',
        'How to choose a quality supplement brand',
        'Probiotics: benefits and sources',
      ],
      weightLoss: [
        'How do I lose weight effectively?',
        'How fast should I lose weight?',
        'Best cardio for fat loss',
        'Should I do weights while cutting?',
        'How to avoid losing muscle while dieting',
        'What are low-calorie high-volume foods?',
        'How to maintain energy while in a calorie deficit',
        'What are the best cardio exercises for fat loss?',
      ],
      muscleGain: [
        'How much weight should I gain per week?',
        'Best exercises for mass building',
        'How important is post-workout nutrition?',
        'Should I bulk or stay lean?',
        'How to structure a hypertrophy program',
        'How to progressively overload for muscle',
        'How do I track my muscle-building progress?',
      ],
      general: [
        'Suggest me a 4-day workout split',
        'What is the best diet for muscle gain?',
        'How do I lose weight effectively?',
        'What supplements should I take?',
        'Give tips for staying motivated with exercise',
        'How do I build healthy habits around food and exercise?',
        'What are the benefits of stretching regularly?',
        'How do I track my fitness progress?',
      ],
    };

    // Merge some general items and dedupe the final list
    const merged = [...(suggestions[key] || []), ...(suggestions.general || [])];
    // Deduplicate while preserving order
    const seen = new Set();
    const final = [];
    for (const s of merged) {
      const k = (s || '').toString().trim();
      if (!k) continue;
      if (!seen.has(k)) {
        seen.add(k);
        final.push(k);
      }
    }

    return final;
  }

  // Determine conversation stage
  static determineConversationStage(conversation, analysis) {
    const messageCount = conversation.messages.length;
    
    if (messageCount <= 2) return 'greeting';
    if (messageCount <= 5) return 'assessment';
    if (messageCount <= 10) return 'recommendation';
    if (messageCount <= 15) return 'follow_up';
    return 'closing';
  }
}

module.exports = AIChatbotController;