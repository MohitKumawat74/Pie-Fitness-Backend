const jwt = require('jsonwebtoken');
const RegisterUser = require('../../models/RegisterUser');
const AdminDashboard = require('../models/AdminDashboard');

// Verify admin token middleware (checks if user is the first registered user)
const authenticateAdmin = async (req, res, next) => {
  try {
    let token = req.header('Authorization');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Remove 'Bearer ' prefix if present
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    
    // Find user in database
    const user = await RegisterUser.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Check if this user is admin (first registered user)
    const isAdmin = await AdminDashboard.isUserAdmin(user._id);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Add user to request object with admin flag
    req.admin = user;
    req.isAdmin = true;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

// Log admin activity middleware
const logAdminActivity = (action, resource) => {
  return async (req, res, next) => {
    try {
      // Store activity info in request for potential logging after response
      req.adminActivity = {
        adminId: req.admin?._id,
        adminEmail: req.admin?.email,
        action,
        resource,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        requestData: {
          method: req.method,
          url: req.originalUrl,
          params: req.params,
          query: req.query,
          // Don't log sensitive data like passwords
          body: action === 'login' ? { email: req.body?.email } : req.body
        }
      };

      // Log the activity (you can expand this to save to database)
      console.log(`Admin Activity: ${req.admin?.fullName || 'Unknown'} performed ${action} on ${resource}`);

      // Continue to next middleware
      next();

    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't fail the request if logging fails
      next();
    }
  };
};

// Rate limiting for admin actions
const adminRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.admin?.email || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or initialize request log for this key
    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const requestLog = requests.get(key);

    // Remove old requests outside the window
    while (requestLog.length > 0 && requestLog[0] < windowStart) {
      requestLog.shift();
    }

    // Check if limit exceeded
    if (requestLog.length >= max) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((requestLog[0] + windowMs - now) / 1000)
      });
    }

    // Add current request to log
    requestLog.push(now);
    requests.set(key, requestLog);

    next();
  };
};

module.exports = {
  authenticateAdmin,
  logAdminActivity,
  adminRateLimit
};