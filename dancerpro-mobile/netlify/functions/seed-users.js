const bcrypt = require('bcryptjs');
const { handleCors, createResponse, readUsers, writeUsers, findUserByEmail } = require('./shared/utils');

// Test users to seed
const testUsers = [
  {
    id: "1760088294446",
    email: "danteswife4@gmail.com",
    password: "Whittaker444", // Will be hashed
    firstName: "Lindsay",
    lastName: "Jade",
    phoneNumber: null,
    createdAt: "2025-10-10T09:24:54.446Z",
    lastLogin: null
  },
  {
    id: "1759940645816",
    email: "testuser@example.com",
    password: "StrongPassword123!", // Will be hashed
    firstName: "Test",
    lastName: "User",
    phoneNumber: null,
    createdAt: "2025-10-08T16:24:05.816Z",
    lastLogin: null
  }
];

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  try {
    const users = readUsers();
    let seededCount = 0;

    for (const testUser of testUsers) {
      const existingUser = findUserByEmail(testUser.email);
      
      if (!existingUser) {
        // Hash the password
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        
        const newUser = {
          ...testUser,
          password: hashedPassword
        };
        
        users.push(newUser);
        seededCount++;
        console.log(`Seeded user: ${testUser.email}`);
      } else {
        console.log(`User already exists: ${testUser.email}`);
      }
    }

    if (seededCount > 0) {
      writeUsers(users);
    }

    return createResponse(200, {
      message: 'User seeding completed',
      seededCount,
      totalUsers: users.length,
      users: users.map(u => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName }))
    });

  } catch (error) {
    console.error('Seed users error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};