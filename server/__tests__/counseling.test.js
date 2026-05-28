const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongoServer;
let testStudent;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URL = mongoUri;
  process.env.NODE_ENV = 'test';
  app = require('../app');
  
  // Create test student
  const Student = require('../models/student');
  testStudent = await Student.create({
    name: 'Test Student',
    birthDate: new Date('2005-01-01'),
    gender: 'male',
    subject: ['Math'],
    bio: 'test'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Counseling API', () => {
  let createdCounselingId;

  describe('POST /:studentId/counselings - Create counseling request', () => {
    it('should create a counseling request without studentNote', async () => {
      const response = await request(app)
        .post(`/students/${testStudent._id}/counselings`)
        .send({
          teacherName: 'Mr. Teacher',
          date: '2026-01-15',
          time: '14:00'
        })
        .expect(201);

      expect(response.body.counseling).toBeDefined();
      expect(response.body.counseling.studentId.toString()).toBe(testStudent._id.toString());
      expect(response.body.counseling.studentName).toBe('Test Student');
      expect(response.body.counseling.status).toBe('pending');
      expect(response.body.counseling.teacherNotes).toBe('');
      createdCounselingId = response.body.counseling._id;
    });

    it('should reject counseling request without required fields', async () => {
      const response = await request(app)
        .post(`/students/${testStudent._id}/counselings`)
        .send({
          teacherName: 'Mr. Teacher'
          // missing date and time
        })
        .expect(400);

      expect(response.body.message).toContain('date');
    });
  });

  describe('PUT /counselings/:counselingId/status - Update counseling status', () => {
    it('should accept a counseling request', async () => {
      const response = await request(app)
        .put(`/students/counselings/${createdCounselingId}/status`)
        .send({ status: 'accepted' })
        .expect(200);

      expect(response.body.counseling.status).toBe('accepted');
    });

    it('should reject a counseling request with reason', async () => {
      // Create another counseling first
      const Counseling = require('../models/counseling');
      const counseling = await Counseling.create({
        studentId: testStudent._id,
        studentName: testStudent.name,
        dateTime: new Date(),
        teacherName: 'Mr. Teacher',
        status: 'pending'
      });

      const response = await request(app)
        .put(`/students/counselings/${counseling._id}/status`)
        .send({ 
          status: 'rejected',
          rejectionReason: 'Schedule conflict'
        })
        .expect(200);

      expect(response.body.counseling.status).toBe('rejected');
      expect(response.body.counseling.rejectionReason).toBe('Schedule conflict');
    });
  });

  describe('PUT /counselings/:counselingId/notes - Update counseling notes', () => {
    it('should allow updating notes only for accepted counseling', async () => {
      // createdCounselingId should now be in accepted status from previous test
      const response = await request(app)
        .put(`/students/counselings/${createdCounselingId}/notes`)
        .send({ teacherNotes: 'Student is doing well in Math.' })
        .expect(200);

      expect(response.body.counseling.teacherNotes).toBe('Student is doing well in Math.');
    });

    it('should reject updating notes for pending counseling', async () => {
      // Create a pending counseling
      const Counseling = require('../models/counseling');
      const pendingCounseling = await Counseling.create({
        studentId: testStudent._id,
        studentName: testStudent.name,
        dateTime: new Date(),
        teacherName: 'Mr. Teacher',
        status: 'pending'
      });

      const response = await request(app)
        .put(`/students/counselings/${pendingCounseling._id}/notes`)
        .send({ teacherNotes: 'This should fail' })
        .expect(400);

      expect(response.body.message).toContain('accepted');
    });

    it('should reject updating notes for rejected counseling', async () => {
      // Create a rejected counseling
      const Counseling = require('../models/counseling');
      const rejectedCounseling = await Counseling.create({
        studentId: testStudent._id,
        studentName: testStudent.name,
        dateTime: new Date(),
        teacherName: 'Mr. Teacher',
        status: 'rejected',
        rejectionReason: 'Not available'
      });

      const response = await request(app)
        .put(`/students/counselings/${rejectedCounseling._id}/notes`)
        .send({ teacherNotes: 'This should fail' })
        .expect(400);

      expect(response.body.message).toContain('accepted');
    });
  });

  describe('GET /teacher/counselings - Fetch all counselings', () => {
    it('should return all counselings', async () => {
      const response = await request(app)
        .get('/students/teacher/counselings')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /:studentId/counselings - Fetch student counselings', () => {
    it('should return student specific counselings', async () => {
      const response = await request(app)
        .get(`/students/${testStudent._id}/counselings`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(c => c.studentId.toString() === testStudent._id.toString())).toBe(true);
    });
  });
});

