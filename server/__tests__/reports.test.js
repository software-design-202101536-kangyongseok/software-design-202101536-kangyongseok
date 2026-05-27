const request = require('supertest');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
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
  it('generates XLSX for each report type', async () => {
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
      const xlsxRes = await request(app)
        .get(`/students/${student._id}/reports/${t}?format=xlsx`)
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => callback(null, Buffer.from(data, 'binary')));
        })
        .expect(200);
      expect(xlsxRes.headers['content-type']).toMatch(/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(xlsxRes.body);
      const sheet = workbook.getWorksheet('Report');
      expect(sheet).toBeDefined();
      const titleFound = sheet.getRows(1, sheet.rowCount).some((row) =>
        Array.isArray(row.values) && row.values.some((value) => typeof value === 'string' && value.includes('ReportTester'))
      );
      expect(titleFound).toBe(true);
      if (t === 'grade-analysis') {
        const rankHeader = sheet.getRows(1, sheet.rowCount).some((row) =>
          Array.isArray(row.values) && row.values.includes('과목별 등수')
        );
        expect(rankHeader).toBe(true);
      }
    }
  }, 20000);
});
