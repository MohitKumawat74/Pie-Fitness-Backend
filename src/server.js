// app.js or server.js
require('dotenv').config();  // Load environment variables from .env file
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// If PUBLIC_BASE_URL is not provided, default to the dev tunnel
process.env.PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;

const connectDB = require('./config/database'); // Database connection
const config = require('./config/config'); // Import the centralized config
const userRoutes = require('./routes/userRoute'); // Import user routes
const userFormRoutes = require('./routes/userFormRoute');
const bookFreeTrialRoute = require('./routes/bookFreeTrialRoute');
const reserveSpotRoute = require('./routes/reserveSpotRoute');
const subscriptionRoute = require('./routes/subscriptionRoute');
const ContactUsMessageRoute = require('./routes/ContactUsMessageRoute'); // Import contact us message routes
const paymentRoute = require('./routes/paymentRoute'); // Import payment routes
const chatRoute = require('./routes/chatRoute'); // Import chat routes
const aiChatbotRoute = require('./routes/aiChatbotRoute'); // Import AI chatbot routes
const adminRoute = require('./admin/routes/adminRoute'); // Import admin routes

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
// Determine allowed origins. Support comma-separated list in CORS_ORIGIN.
// If not provided, default to localhost:3000 for local frontend testing.
const DEFAULT_FRONTEND_ORIGIN = process.env.DEFAULT_FRONTEND_ORIGIN || 'http://localhost:3000';
const rawCors = process.env.CORS_ORIGIN || DEFAULT_FRONTEND_ORIGIN; // comma-separated or single value
const ALLOWED_ORIGINS = rawCors.split(',').map(s => s.trim()).filter(Boolean);
const ALLOW_ALL_ORIGINS = ALLOWED_ORIGINS.includes('*');
const CORS_ALLOW_CREDENTIALS = process.env.CORS_ALLOW_CREDENTIALS === 'true';

// Helper to check localhost patterns (allow any port for localhost/127.0.0.1 during dev)
const isLocalhostOrigin = (origin) => {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    const host = u.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch (e) {
    return false;
  }
};

// Robust origin validator. Supports:
// - exact origins (https://app.example.com)
// - host-only entries (example.com or localhost:5173)
// - simple wildcard entries like *.example.com
const isOriginAllowed = (origin) => {
  if (!origin) return true; // allow tools like curl/Postman that omit Origin

  // Global allow-all if configured
  if (ALLOW_ALL_ORIGINS) return true;

  const normalized = origin.replace(/\/$/, ''); // strip trailing slash

  // Exact match first
  if (ALLOWED_ORIGINS.includes(normalized)) return true;

  // Try matching by hostname:port entries in ALLOWED_ORIGINS
  try {
    const { hostname, port, protocol } = new URL(normalized);

    for (const entry of ALLOWED_ORIGINS) {
      if (!entry) continue;
      const e = entry.trim();

      // wildcard like *.example.com
      if (e.startsWith('*.')) {
        const base = e.slice(2);
        if (hostname === base || hostname.endsWith('.' + base)) return true;
        continue;
      }

      // If entry includes protocol, compare full normalized origin
      try {
        const ue = new URL(e);
        if (ue.origin === normalized) return true;
      } catch (err) {
        // not a full origin, fallthrough to host comparison
      }

      // host-only match: example.com or example.com:5173
      const hostOnly = e.replace(/https?:\/\//, '').replace(/\/$/, '');
      if (hostOnly === `${hostname}${port ? ':' + port : ''}`) return true;
      if (hostOnly === hostname) return true;
    }

    // allow localhost in non-production regardless of port
    if (process.env.NODE_ENV !== 'production' && isLocalhostOrigin(normalized)) return true;

    // If PUBLIC_BASE_URL is set and appears to be a dev tunnel host, allow other
    // origins that share the same devtunnels domain suffix in development.
    // Example: PUBLIC_BASE_URL=https://s7q5nl38-5000.inc1.devtunnels.ms
    // will permit https://s7q5nl38-8080.inc1.devtunnels.ms as a sibling.
    try {
      const publicBase = process.env.PUBLIC_BASE_URL;
      if (publicBase && process.env.NODE_ENV !== 'production') {
        const pbHost = new URL(publicBase).hostname; // e.g., s7q5nl38-5000.inc1.devtunnels.ms
        const pbParts = pbHost.split('.');
        if (pbParts.length >= 3) {
          // take suffix like inc1.devtunnels.ms
          const suffix = pbParts.slice(1).join('.');
          if (hostname.endsWith(suffix)) return true;
        }
      }
    } catch (e) {
      // ignore parsing errors
    }
  } catch (e) {
    // If URL parsing fails, do a plain string check against allowed list
    if (ALLOWED_ORIGINS.includes(origin)) return true;
  }

  return false;
};

// Startup diagnostic log to make CORS troubleshooting easier
const prettyOrigins = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS.join(', ') : '(none)';
if (ALLOW_ALL_ORIGINS) {
  console.warn('CORS: Allow-all enabled via CORS_ORIGIN="*" - this is insecure for production');
} else {
  console.log(`CORS: allowed origins = ${prettyOrigins}`);
}

if (process.env.PUBLIC_BASE_URL) {
  console.log(`PUBLIC_BASE_URL is set to ${process.env.PUBLIC_BASE_URL}`);
}

const io = socketIo(server, {
  cors: {
    origin: function(origin, callback) {
      // allow non-browser tools
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);

      // Helpful debug logging in development to see what was rejected
      console.warn(`Socket.IO CORS blocked origin: ${origin}`);
      return callback(new Error('CORS policy does not allow access from the specified Origin.'), false);
    },
    methods: ['GET', 'POST'],
    credentials: CORS_ALLOW_CREDENTIALS,
  },
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
// Use a validator so we can allow requests from tools (no origin) while
// still restricting browser origins when credentials are used.
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (e.g., curl, Postman)
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) return callback(null, true);

    // Deny other origins
    console.warn(`CORS middleware blocked origin: ${origin}`);
    return callback(new Error('CORS policy does not allow access from the specified Origin.'), false);
  },
  credentials: CORS_ALLOW_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

// Connect to MongoDB
connectDB();

// Initialize first user message
const checkFirstUser = async () => {
  try {
    const RegisterUser = require('./models/RegisterUser');
    const firstUser = await RegisterUser.findOne({}).sort({ createdAt: 1 });
    
    if (firstUser) {
      console.log(`Admin User: ${firstUser.fullName} (${firstUser.email}) - First registered user has admin access`);
    } else {
      console.log('No users found. First registered user will become admin.');
    }
  } catch (error) {
    console.error('Error checking first user:', error);
  }
};

// Check first user after database connection
setTimeout(checkFirstUser, 2000); // Delay to ensure DB connection


// Routes
app.use('/api/user', userRoutes);
app.use('/api/form', userFormRoutes);
app.use('/api/contactus', ContactUsMessageRoute);
app.use('/api/book-free-trial', bookFreeTrialRoute);
app.use('/api/reserve-spot', reserveSpotRoute);
app.use('/api/payment', paymentRoute);
app.use('/api/subscription', subscriptionRoute);
app.use('/api/chat', chatRoute); // Chat routes
app.use('/api/ai-chatbot', aiChatbotRoute); // AI Chatbot routes
app.use('/api/admin', adminRoute); // Admin routes

// Socket.IO connection handling
const ChatMessage = require('./models/ChatMessage');
const ChatRoom = require('./models/ChatRoom');
const chatBot = require('./controllers/chatBotController');

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a chat room
  socket.on('join-room', async (data) => {
    try {
      const { roomId, userId } = data;
      
      // Verify user is participant in the room
      const chatRoom = await ChatRoom.findOne({
        _id: roomId,
        'participants.user': userId,
        isActive: true,
      });

      if (chatRoom) {
        socket.join(roomId);
        socket.userId = userId;
        socket.currentRoom = roomId;
        
        console.log(`User ${userId} joined room ${roomId}`);
        
        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
          userId,
          message: 'A user has joined the chat',
          timestamp: new Date().toISOString(),
        });
      } else {
        socket.emit('error', { message: 'Unauthorized or room not found' });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Send message
  socket.on('send-message', async (data) => {
    try {
      const { roomId, message, senderId } = data;
      
      if (!socket.currentRoom || socket.currentRoom !== roomId) {
        socket.emit('error', { message: 'Not joined to this room' });
        return;
      }

      // Save message to database
      const newMessage = new ChatMessage({
        chatRoom: roomId,
        sender: senderId,
        message: message.trim(),
        messageType: 'text',
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

      // Broadcast message to all users in the room
      io.to(roomId).emit('new-message', formattedMessage);

      // Check if bot should respond
      const chatRoom = await ChatRoom.findById(roomId);
      if (chatRoom && chatBot.shouldRespond(message, chatRoom)) {
        // Add delay for more natural bot response
        setTimeout(async () => {
          try {
            const botResponse = await chatBot.processMessage(message, roomId, senderId);
            io.to(roomId).emit('new-message', botResponse);
          } catch (error) {
            console.error('Bot response error:', error);
          }
        }, chatRoom.botSettings.responseDelay || 1000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Leave room
  socket.on('leave-room', (data) => {
    const { roomId } = data;
    
    if (socket.currentRoom === roomId) {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        message: 'A user has left the chat',
        timestamp: new Date().toISOString(),
      });
      
      socket.currentRoom = null;
      console.log(`User ${socket.userId} left room ${roomId}`);
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { roomId, userId, userName } = data;
    socket.to(roomId).emit('user-typing', { userId, userName, isTyping: true });
  });

  socket.on('typing-stop', (data) => {
    const { roomId, userId } = data;
    socket.to(roomId).emit('user-typing', { userId, isTyping: false });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('user-left', {
        userId: socket.userId,
        message: 'A user has disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  });
});

// Start the server
server.listen(config.serverConfig.port, () => {
  console.log(`Server is running on port ${config.serverConfig.port}`);
  console.log(`Socket.IO enabled for real-time chat`);
});
