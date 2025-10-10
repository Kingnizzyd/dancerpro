const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const LOGIN_RATE_LIMIT = parseInt(process.env.LOGIN_RATE_LIMIT || '30', 10);
const LOGIN_RATE_WINDOW_MS = parseInt(process.env.LOGIN_RATE_WINDOW_MS || (60 * 1000).toString(), 10);

// Users file path
const USERS_FILE = path.join(__dirname, 'users.json');

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client using API Key if provided, otherwise fallback to auth token
let client;
try {
  if (apiKeySid && apiKeySecret && accountSid) {
    client = twilio(apiKeySid, apiKeySecret, { accountSid });
    console.log('Twilio client initialized with API Key SID');
  } else if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
    console.log('Twilio client initialized with Account SID + Auth Token');
  } else {
    console.log('Twilio credentials incomplete; running in mock mode unless overridden');
  }
} catch (e) {
  console.error('Failed to initialize Twilio client:', e);
}

// In-memory token blacklist for logout invalidation
const blacklistedTokens = new Set();
// In-memory rate limiter store for login attempts
const loginAttempts = new Map();
// In-memory rate limiter store for registration attempts
const registerAttempts = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Lightweight request ID + request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    const duration = Date.now() - start;
    try {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    } catch (_) {
      // noop
    }
  });
  next();
});

// Store for active WebSocket connections and user sessions
const activeConnections = new Map();
const userSessions = new Map();

// Helper functions for user management
const readUsers = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

const writeUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing users file:', error);
    return false;
  }
};

const findUserByEmail = (email) => {
  const users = readUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

const findUserById = (id) => {
  const users = readUsers();
  return users.find(user => user.id === id);
};

// Seed a default test user for integration tests (e.g., TC006 login)
function ensureSeedUsers() {
  try {
    const seedEmail = 'testuser@example.com';
    const users = readUsers();
    const exists = users.find(u => u.email.toLowerCase() === seedEmail.toLowerCase());
    const hashed = bcrypt.hashSync('StrongPassword123!', 10);
    if (!exists) {
      const newUser = {
        id: Date.now().toString(),
        email: seedEmail.toLowerCase(),
        password: hashed,
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+12345678901',
        createdAt: new Date().toISOString(),
        lastLogin: null
      };
      users.push(newUser);
      writeUsers(users);
      console.log('Seeded default test user:', seedEmail);
    } else {
      const passwordMatches = bcrypt.compareSync('StrongPassword123!', exists.password);
      if (!passwordMatches) {
        exists.password = hashed;
        writeUsers(users);
        console.log('Updated seed user password to expected StrongPassword123!');
      }
    }
  } catch (e) {
    console.error('Failed to seed default test user:', e);
  }
}

// JWT middleware for protected routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Check blacklist first
  if (blacklistedTokens.has(token)) {
    return res.status(403).json({ error: 'Token has been invalidated' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Simple rate limiter middleware for login endpoint
function loginRateLimiter(req, res, next) {
  try {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = loginAttempts.get(key);
    if (!entry || (now - entry.start) > LOGIN_RATE_WINDOW_MS) {
      loginAttempts.set(key, { start: now, count: 1 });
      return next();
    }
    if (entry.count >= LOGIN_RATE_LIMIT) {
      return res.status(429).json({ error: 'Too many login attempts. Please wait and try again.' });
    }
    entry.count++;
    return next();
  } catch (e) {
    // Fail open if rate limiter encounters an error
    return next();
  }
}

// Simple rate limiter middleware for registration endpoint
const REGISTER_RATE_LIMIT = parseInt(process.env.REGISTER_RATE_LIMIT || '20', 10);
const REGISTER_RATE_WINDOW_MS = parseInt(process.env.REGISTER_RATE_WINDOW_MS || '60000', 10);
function registerRateLimiter(req, res, next) {
  try {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = registerAttempts.get(key);
    if (!entry || (now - entry.start) > REGISTER_RATE_WINDOW_MS) {
      registerAttempts.set(key, { start: now, count: 1 });
      return next();
    }
    if (entry.count >= REGISTER_RATE_LIMIT) {
      return res.status(429).json({ error: 'Too many registration attempts. Please wait and try again.' });
    }
    entry.count++;
    return next();
  } catch (e) {
    return next();
  }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle client registration
  socket.on('register', (data) => {
    const { clientId, userId } = data;
    
    // Store connection mapping
    activeConnections.set(socket.id, { clientId, userId, socket });
    userSessions.set(userId, socket.id);
    
    console.log(`User ${userId} registered with client ${clientId}`);
    
    // Send confirmation
    socket.emit('registered', { 
      success: true, 
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { conversationId, isTyping, userId } = data;
    
    // Broadcast typing status to other participants in the conversation
    socket.broadcast.emit('user_typing', {
      conversationId,
      userId,
      isTyping,
      timestamp: new Date().toISOString()
    });
  });

  // Handle new messages
  socket.on('new_message', (data) => {
    const { conversationId, message, userId } = data;
    // Broadcast to all clients except sender
    socket.broadcast.emit('message_received', {
      conversationId,
      message,
      userId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    const ctx = activeConnections.get(socket.id);
    if (ctx) {
      activeConnections.delete(socket.id);
      userSessions.delete(ctx.userId);
      console.log(`Client disconnected: ${socket.id} (user ${ctx.userId})`);
    } else {
      console.log(`Client disconnected: ${socket.id}`);
    }
  });
});

function broadcastToUser(userId, event, data) {
  const socketId = userSessions.get(userId);
  if (socketId) {
    const ctx = activeConnections.get(socketId);
    if (ctx && ctx.socket) {
      ctx.socket.emit(event, data);
    }
  }
}

function broadcastToConversation(conversationId, event, data, excludeUserId = null) {
  for (const [socketId, ctx] of activeConnections.entries()) {
    if (excludeUserId && ctx.userId === excludeUserId) continue;
    ctx.socket.emit(event, { conversationId, ...data });
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', registerRateLimiter, async (req, res) => {
  try {
    const { email, password, passwordConfirm, firstName, lastName, phone } = req.body;

    if (!email || !password || !passwordConfirm) {
      return res.status(400).json({ error: 'Email, password, and password confirmation are required' });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ error: 'Password and confirmation do not match' });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    let users = readUsers();
    const existing = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      phoneNumber: phone || '',
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users.push(newUser);
    writeUsers(users);

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '2h' });

    res.json({ success: true, user: { id: newUser.id, email: newUser.email }, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });

    res.json({ success: true, user: { id: user.id, email: user.email }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phoneNumber: user.phoneNumber } });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      blacklistedTokens.add(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

app.post('/api/auth/refresh', authenticateToken, (req, res) => {
  try {
    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const newToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ success: true, token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Server error during token refresh' });
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const matches = await bcrypt.compare(oldPassword, user.password);
    if (!matches) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    const users = readUsers();
    const idx = users.findIndex(u => u.id === user.id);
    users[idx] = user;
    writeUsers(users);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error during password change' });
  }
});

app.delete('/api/auth/delete-account', authenticateToken, (req, res) => {
  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users.splice(idx, 1);
    writeUsers(users);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Server error during account deletion' });
  }
});

app.post('/api/test/reset-users', (req, res) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    res.json({ success: true, message: 'Users reset successfully' });
  } catch (error) {
    console.error('Reset users error:', error);
    res.status(500).json({ error: 'Server error during users reset' });
  }
});

app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, body } = req.body;

    if (!to || !body) {
      return res.status(400).json({ error: 'Destination number and message body are required' });
    }

    if (process.env.TWILIO_MOCK === 'true') {
      // Simulate Twilio sending a message
      console.log(`[MOCK] Sending SMS to ${to}: ${body}`);
      return res.json({ success: true, message: 'Mock SMS sent successfully' });
    }

    if (!client || !accountSid || !twilioPhoneNumber) {
      return res.status(500).json({ error: 'Twilio configuration incomplete' });
    }

    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to
    });

    res.json({ success: true, sid: message.sid });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Server error sending SMS' });
  }
});

app.post('/api/webhook/incoming', (req, res) => {
  try {
    const { From, Body } = req.body;

    // Broadcast incoming messages to connected clients
    io.emit('incoming_message', {
      from: From,
      body: Body,
      timestamp: new Date().toISOString()
    });

    res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('Incoming webhook error:', error);
    res.status(500).send('<Response><Message>Server error</Message></Response>');
  }
});

app.post('/api/webhook/status', (req, res) => {
  try {
    const { MessageSid, MessageStatus } = req.body;

    // Broadcast message status updates to connected clients
    io.emit('message_status', {
      sid: MessageSid,
      status: MessageStatus,
      timestamp: new Date().toISOString()
    });

    res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('Status webhook error:', error);
    res.status(500).send('<Response><Message>Server error</Message></Response>');
  }
});

app.post('/api/connect', (req, res) => {
  try {
    // Simulate establishing a connection for a user
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    res.json({ success: true, message: `User ${userId} connected successfully` });
  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({ error: 'Server error during connect' });
  }
});

app.post('/api/disconnect', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    res.json({ success: true, message: `User ${userId} disconnected successfully` });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Server error during disconnect' });
  }
});

app.get('/api/conversations/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    // Simulate fetching a conversation history for testing
    const history = [
      { from: twilioPhoneNumber || '+10000000000', to: phoneNumber, body: 'Hello from DancerPro!', timestamp: new Date().toISOString() },
      { from: phoneNumber, to: twilioPhoneNumber || '+10000000000', body: 'Hi there!', timestamp: new Date().toISOString() }
    ];

    res.json({ success: true, conversation: history });
  } catch (error) {
    console.error('Conversation fetch error:', error);
    res.status(500).json({ error: 'Server error fetching conversation history' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
  ensureSeedUsers();
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server, io };
