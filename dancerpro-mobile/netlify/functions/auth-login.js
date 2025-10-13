const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { handleCors, createResponse, findUserByEmail, JWT_SECRET } = require('./shared/utils');

// Rate limiting storage (in-memory for simplicity, consider Redis for production)
const loginAttempts = new Map();
const LOGIN_RATE_LIMIT = parseInt(process.env.LOGIN_RATE_LIMIT || '30', 10);
const LOGIN_RATE_WINDOW_MS = parseInt(process.env.LOGIN_RATE_WINDOW_MS || (60 * 1000).toString(), 10);

function loginRateLimiter(clientIp) {
  const now = Date.now();
  const windowStart = now - LOGIN_RATE_WINDOW_MS;
  
  if (!loginAttempts.has(clientIp)) {
    loginAttempts.set(clientIp, []);
  }
  
  const attempts = loginAttempts.get(clientIp);
  const recentAttempts = attempts.filter(timestamp => timestamp > windowStart);
  
  if (recentAttempts.length >= LOGIN_RATE_LIMIT) {
    return false;
  }
  
  recentAttempts.push(now);
  loginAttempts.set(clientIp, recentAttempts);
  return true;
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  try {
    const { email, password } = JSON.parse(event.body);
    
    if (!email || !password) {
      return createResponse(400, { error: 'Email and password are required' });
    }

    // Rate limiting
    const clientIp = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    if (!loginRateLimiter(clientIp)) {
      return createResponse(429, { error: 'Too many login attempts. Please try again later.' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return createResponse(401, { error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return createResponse(401, { error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const { password: _, ...userData } = user;

    return createResponse(200, {
      message: 'Login successful',
      authToken: token,
      userData
    });

  } catch (error) {
    console.error('Login error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};