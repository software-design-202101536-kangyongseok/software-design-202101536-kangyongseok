const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Student = require('../models/student');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Student Model', () => {
  it('should create a student successfully', async () => {
    const studentData = {
      name: 'John Doe',
      birthDate: new Date('2000-01-01'),
      gender: 'male',
      subject: ['Math', 'Science'],
      bio: 'A student'
    };

    const student = new Student(studentData);
    const savedStudent = await student.save();

    expect(savedStudent.name).toBe(studentData.name);
    expect(savedStudent.gender).toBe(studentData.gender);
  });

  it('should fail to create student without required fields', async () => {
    const student = new Student({ name: 'Jane Doe' });
    let err;
    try {
      await student.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });
});
<parameter name="filePath">c:\Users\82105\SWD\SWD_Project\server\__tests__\student.test.js </parameter>