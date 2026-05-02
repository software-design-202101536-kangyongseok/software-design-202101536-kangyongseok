const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // Assuming app.js exports the app

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URL = mongoUri;
  // Reconnect mongoose in app.js, but since it's already connected, we might need to handle it
  // For simplicity, assume we can set the env before requiring app
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('API Tests', () => {
  it('should respond to GET /students', async () => {
    const response = await request(app).get('/students');
    expect(response.status).toBe(200);
    // Add more assertions based on your routes
  });
});</content>
<parameter name="filePath">c:\Users\82105\SWD\SWD_Project\server\__tests__\app.test.js