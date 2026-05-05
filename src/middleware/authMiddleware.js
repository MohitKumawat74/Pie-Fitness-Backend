const secrets = require('../config/secrets');

// Simple admin authentication middleware
// Checks for either:
// - Authorization: Bearer <token>
// - x-admin-token: <token>
// Token is compared to secrets.secretKey or process.env.ADMIN_TOKEN
function authenticateAdmin(req, res, next) {
  const authHeader = (req.headers && req.headers.authorization) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const headerToken = req.headers && (req.headers['x-admin-token'] || req.headers['x-admin-token'.toLowerCase()]);
  const token = bearer || headerToken || req.query.token || req.body && req.body.token;

  const expected = secrets && secrets.secretKey ? secrets.secretKey : process.env.ADMIN_TOKEN;

  if (!expected) {
    // No configured token: allow through in development, but keep the warning.
    console.warn('authenticateAdmin: no admin token configured (secrets.secretKey or ADMIN_TOKEN); allowing request in development mode');
    req.isAdmin = true;
    return next();
  }

  if (!token || token !== expected) {
    return res.status(401).json({ message: 'Unauthorized: invalid admin token' });
  }

  // attach a simple flag for downstream handlers
  req.isAdmin = true;
  next();
}

module.exports = { authenticateAdmin };

// Basic user authentication middleware. It will check for a Bearer token or
// x-user-token header and compare it to a configured secret (secrets.secretKey
// or process.env.USER_TOKEN / process.env.SECRET_KEY). If no expected token is
// configured we allow requests through for development convenience but log a
// warning.
function authenticateUser(req, res, next) {
  const authHeader = (req.headers && req.headers.authorization) || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const headerToken = req.headers && (req.headers['x-user-token'] || req.headers['x-user-token'.toLowerCase()]);
  const token = bearer || headerToken || req.query.token || (req.body && req.body.token);

  const expected = (secrets && secrets.secretKey) || process.env.USER_TOKEN || process.env.SECRET_KEY;

  if (!expected) {
    // No configured token: allow through but warn in logs (useful for dev)
    console.warn('authenticateUser: no expected user token configured; allowing request (development mode)');
    req.user = { anonymous: true };
    return next();
  }

  if (!token || token !== expected) {
    return res.status(401).json({ message: 'Unauthorized: invalid or missing token' });
  }

  // Attach a minimal user marker
  req.user = { tokenValid: true };
  next();
}

module.exports = { authenticateAdmin, authenticateUser };
