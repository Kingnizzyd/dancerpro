const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { handleCors, createResponse, findUserByEmail, upsertUser, JWT_SECRET } = require('./shared/utils');

// Rate limiting storage
const registerAttempts = new Map();
const REGISTER_RATE_LIMIT = parseInt(process.env.REGISTER_RATE_LIMIT || '20', 10);
const REGISTER_RATE_WINDOW_MS = parseInt(process.env.REGISTER_RATE_WINDOW_MS || '60000', 10);

function registerRateLimiter(clientIp) {
  const now = Date.now();
  const windowStart = now - REGISTER_RATE_WINDOW_MS;
  
  if (!registerAttempts.has(clientIp)) {
    registerAttempts.set(clientIp, []);
  }
  
  const attempts = registerAttempts.get(clientIp);
  const recentAttempts = attempts.filter(timestamp => timestamp > windowStart);
  
  if (recentAttempts.length >= REGISTER_RATE_LIMIT) {
    return false;
  }
  
  recentAttempts.push(now);
  registerAttempts.set(clientIp, recentAttempts);
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
    const { name, firstName, lastName, email, password, phone } = JSON.parse(event.body);
    
    // Handle both name formats - single name field or firstName/lastName
    const fullName = name || (firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || lastName || '');
    
    if (!fullName || !email || !password) {
      return createResponse(400, { error: 'Name, email, and password are required' });
    }

    // Rate limiting
    const clientIp = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    if (!registerRateLimiter(clientIp)) {
      return createResponse(429, { error: 'Too many registration attempts. Please try again later.' });
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return createResponse(409, { error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: uuidv4(),
      name: fullName,
      email,
      password: hashedPassword,
      phone: phone || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isVerified: false,
      webauthn: {
        credentials: [],
        currentChallenge: null
      }
    };

    // Save user
    upsertUser(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        name: newUser.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const { password: _, ...userData } = newUser;

    return createResponse(201, {
      message: 'User registered successfully',
      authToken: token,
      userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};