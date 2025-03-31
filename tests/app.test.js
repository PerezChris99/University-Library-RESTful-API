const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

describe('Test the API endpoints', () => {
  // Connect to a test database before running tests
  beforeAll(async () => {
    const url = process.env.MONGODB_URL || 'mongodb://localhost:27017/library_test';
    await mongoose.connect(url);
  });

  // Close database connection after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Basic test
  test('Server responds to /', async () => {
    // Update app.js to add this route
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
  });
});
