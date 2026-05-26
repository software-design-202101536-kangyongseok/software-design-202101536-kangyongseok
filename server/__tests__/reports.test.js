const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URL = mongoUri;
  process.env.NODE_ENV = 'test';
  app = require('../app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Report generation endpoints', () => {
  it('generates PDF and XLSX for each report type', async () => {
    const Student = require('../models/student');
    const Grade = require('../models/grade');
    const Counseling = require('../models/counseling');
    const Feedback = require('../models/feedback');

    // create a student and sample data
    const student = await Student.create({ name: 'ReportTester', birthDate: new Date(), gender: 'male', subject: ['Math'], bio: 'test' });
    await Grade.create({ student: student._id, subject: 'Math', year: 2026, term: 1, score: 95 });
    await Counseling.create({ studentId: student._id, studentName: student.name, dateTime: new Date(), status: 'accepted', teacherName: 'Mr. T' });
    await Feedback.create({ studentId: student._id, teacherName: 'Ms. F' });

    const types = ['grade-analysis', 'counseling-history', 'feedback-summary'];

    for (const t of types) {
      const pdfRes = await request(app).get(`/students/${student._id}/reports/${t}?format=pdf`).expect(200);
      expect(pdfRes.headers['content-type']).toMatch(/application\/pdf/);

      const xlsxRes = await request(app).get(`/students/${student._id}/reports/${t}?format=xlsx`).expect(200);
      expect(xlsxRes.headers['content-type']).toMatch(/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
    }
  }, 20000);
});
