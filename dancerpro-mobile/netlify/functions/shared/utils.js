const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Users file path - check for local file first, then use /tmp for temporary storage
const LOCAL_USERS_FILE = path.join(__dirname, '../users.json');
const USERS_FILE = fs.existsSync(LOCAL_USERS_FILE) ? LOCAL_USERS_FILE : '/tmp/users.json';
const SNAPSHOT_DIR = '/tmp/snapshots';

function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (e) {
    console.error('Failed to ensure directory:', dirPath, e);
    return false;
  }
}

function getSnapshotFile(userId) {
  return path.join(SNAPSHOT_DIR, `${userId}.json`);
}

function readUserSnapshot(userId) {
  try {
    ensureDir(SNAPSHOT_DIR);
    const file = getSnapshotFile(userId);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading snapshot for user:', userId, e);
    return null;
  }
}

function writeUserSnapshot(userId, snapshot, meta = {}) {
  try {
    ensureDir(SNAPSHOT_DIR);
    const file = getSnapshotFile(userId);
    const payload = {
      snapshot: snapshot || {},
      metadata: {
        updatedAt: new Date().toISOString(),
        version: 1,
        ...meta,
      },
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    return payload;
  } catch (e) {
    console.error('Error writing snapshot for user:', userId, e);
    return null;
  }
}

const readUsers = () => {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
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
  return users.find(user => user.email === email);
};

const findUserById = (id) => {
  const users = readUsers();
  return users.find(user => user.id === id);
};

function upsertUser(updatedUser) {
  const users = readUsers();
  const index = users.findIndex(u => u.id === updatedUser.id);
  if (index >= 0) {
    users[index] = { ...users[index], ...updatedUser };
  } else {
    users.push(updatedUser);
  }
  writeUsers(users);
  return updatedUser;
}

// CORS headers for Netlify Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Handle CORS preflight
function handleCors(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  return null;
}

// JWT token verification middleware
function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided' };
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { user: decoded };
  } catch (error) {
    return { error: 'Invalid token' };
  }
}

// Response helper
function createResponse(statusCode, body, additionalHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...additionalHeaders
    },
    body: JSON.stringify(body)
  };
}

module.exports = {
  ensureDir,
  getSnapshotFile,
  readUserSnapshot,
  writeUserSnapshot,
  readUsers,
  writeUsers,
  findUserByEmail,
  findUserById,
  upsertUser,
  corsHeaders,
  handleCors,
  verifyToken,
  createResponse,
  JWT_SECRET
};