const express = require("express");
const stdRouter = express.Router();
const Student = require("../models/student");
const Grade = require("../models/grade");
const Attendance = require("../models/attendance");
const Subject = require("../models/subject");
const User = require("../models/user");

// 입력 검증 함수들
const validateStudentData = (data) => {
  const errors = [];
  
  if (!data.name || !data.name.toString().trim()) {
    errors.push('Student name is required');
  } else if (data.name.toString().trim().length < 2) {
    errors.push('Student name must be at least 2 characters');
  }
  
  if (!data.birthDate) {
    errors.push('Birth date is required');
  } else {
    const birthDate = new Date(data.birthDate);
    if (isNaN(birthDate.getTime())) {
      errors.push('Birth date must be a valid date');
    }
  }
  
  if (!data.gender || !['male', 'female'].includes(data.gender)) {
    errors.push('Gender is required and must be male or female');
  }
  
  if (!data.subject || !data.subject.toString().trim()) {
    errors.push('Subject is required');
  }
  
  if (!data.bio || !data.bio.toString().trim()) {
    errors.push('Biography is required');
  }
  
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

stdRouter.get("/", async (req, res) => {
  try {
    const studentName = req.query.name;
    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ message: 'Student name is required' });
    }

    const student = await Student.findOne({ name: studentName.trim() });
    if (!student) {
      return res.status(404).json({ message: `Student "${studentName.trim()}" not found` });
    }

    const subjectFilter = req.query.subject;
    let grades = await Grade.find({ student: student._id }).sort({ year: -1, term: 1 });
    if (subjectFilter) {
      grades = grades.filter(grade => grade.subject === subjectFilter);
    }

    const termAggregates = {};
    grades.forEach(grade => {
      const key = `${grade.year}-${grade.term}`;
      if (!termAggregates[key]) {
        termAggregates[key] = { year: grade.year, term: grade.term, total: 0, count: 0 };
      }
      termAggregates[key].total += grade.score;
      termAggregates[key].count += 1;
    });

    const termAverages = Object.values(termAggregates).map(item => ({
      year: item.year,
      term: item.term,
      average: item.count ? (item.total / item.count).toFixed(2) : '0.00'
    }));

    let subjectAverage = null;
    if (subjectFilter) {
      const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
      const countScore = grades.length;
      subjectAverage = countScore ? (totalScore / countScore).toFixed(2) : '0.00';
    }

    const attendances = await Attendance.find({ student: student._id });
    let presentCount = 0;
    let absentCount = 0;
    const absentDates = [];
    attendances.forEach(att => {
      if (att.status === 'present' || att.status === 'late') presentCount++;
      if (att.status === 'absent') {
        absentCount++;
        absentDates.push(att.date);
      }
    });

    const data = {
      username: student.name,
      birthDate: student.birthDate,
      gender: student.gender,
      subjects: student.subject,
      bio: student.bio,
      grades: grades,
      attendances: attendances,
      studentId: student._id,
      studentName: student.name,
      presentCount: presentCount,
      absentCount: absentCount,
      absentDates: absentDates,
      selectedSubject: subjectFilter || "",
      termAverages: termAverages,
      subjectAverage: subjectAverage,
    };
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ 
      message: err.message || 'Failed to fetch student data' 
    });
  }
});

stdRouter.get("/by-id/:id", async (req, res) => {
  try {
    const studentId = req.params.id;
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: `Student not found` });
    }

    const subjectFilter = req.query.subject;
    let grades = await Grade.find({ student: student._id }).sort({ year: -1, term: 1 });
    if (subjectFilter) {
      grades = grades.filter(grade => grade.subject === subjectFilter);
    }

    const termAggregates = {};
    grades.forEach(grade => {
      const key = `${grade.year}-${grade.term}`;
      if (!termAggregates[key]) {
        termAggregates[key] = { year: grade.year, term: grade.term, total: 0, count: 0 };
      }
      termAggregates[key].total += grade.score;
      termAggregates[key].count += 1;
    });

    const termAverages = Object.values(termAggregates).map(item => ({
      year: item.year,
      term: item.term,
      average: item.count ? (item.total / item.count).toFixed(2) : '0.00'
    }));

    let subjectAverage = null;
    if (subjectFilter) {
      const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
      const countScore = grades.length;
      subjectAverage = countScore ? (totalScore / countScore).toFixed(2) : '0.00';
    }

    const attendances = await Attendance.find({ student: student._id });
    let presentCount = 0;
    let absentCount = 0;
    const absentDates = [];
    attendances.forEach(att => {
      if (att.status === 'present' || att.status === 'late') presentCount++;
      if (att.status === 'absent') {
        absentCount++;
        absentDates.push(att.date);
      }
    });

    const data = {
      username: student.name,
      birthDate: student.birthDate,
      gender: student.gender,
      subjects: student.subject,
      bio: student.bio,
      grades: grades,
      attendances: attendances,
      studentId: student._id,
      studentName: student.name,
      presentCount: presentCount,
      absentCount: absentCount,
      absentDates: absentDates,
      selectedSubject: subjectFilter || "",
      termAverages: termAverages,
      subjectAverage: subjectAverage,
    };
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching student by ID:', err);
    res.status(500).json({ 
      message: err.message || 'Failed to fetch student data' 
    });
  }
});

stdRouter.get("/all", async (req, res) => {
  try {
    const students = await Student.find({}, 'name subject');
    const allGrades = await Grade.find({});
    
    const studentsWithGrades = students.map(student => {
      const studentGrades = allGrades.filter(grade => grade.student.toString() === student._id.toString());
      return {
        name: student.name,
        subject: student.subject,
        grades: studentGrades
      };
    });
    
    res.status(200).json(studentsWithGrades);
  } catch (err) {
    console.error('Error fetching all students:', err);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

stdRouter.post("/", async (req, res) => {
  try {
    const { name, birthDate, gender, subject, bio } = req.body;
    
    // 입력 검증
    const validation = validateStudentData({ name, birthDate, gender, subject, bio });
    if (!validation.valid) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validation.errors 
      });
    }
    
    // 중복 확인
    const existingStudent = await Student.exists({ name: name.toString().trim() });
    if (existingStudent) {
      return res.status(400).json({ 
        message: `Student with name "${name.toString().trim()}" already exists` 
      });
    }
    
    const student = new Student({
      name: name.toString().trim(),
      birthDate: new Date(birthDate),
      gender: gender,
      subject: Array.isArray(subject) ? subject : [subject],
      bio: bio.toString().trim(),
    });
    
    const newStudent = await student.save();
    res.status(201).json(newStudent);
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to create student' 
    });
  }
});

stdRouter.put("/:name", async (req, res) => {
  try {
    const { name, birthDate, gender, subject, bio } = req.body;
    
    if (!name || !name.toString().trim()) {
      return res.status(400).json({ message: 'Student name is required' });
    }
    
    // 입력 검증
    const validation = validateStudentData({ name, birthDate, gender, subject, bio });
    if (!validation.valid) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validation.errors 
      });
    }
    
    const student = await Student.findOneAndUpdate(
      { name: name.toString().trim() },
      { birthDate: new Date(birthDate), gender: gender, subject: Array.isArray(subject) ? subject : [subject], bio: bio.toString().trim() },
      { returnDocument: 'after', runValidators: true }
    );
    
    if (!student) {
      return res.status(404).json({ 
        message: `Student "${name.toString().trim()}" not found` 
      });
    }
    
    res.status(200).json(student);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to update student' 
    });
  }
});

stdRouter.delete("/", async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.toString().trim()) {
      return res.status(400).json({ message: 'Student name is required' });
    }
    
    const result = await Student.findOneAndDelete({ name: name.toString().trim() });
    
    if (!result) {
      return res.status(404).json({ 
        message: `Student "${name.toString().trim()}" not found` 
      });
    }
    
    res.status(200).json({ 
      message: `Student "${result.name}" deleted successfully`,
      student: result 
    });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to delete student' 
    });
  }
});

stdRouter.post("/grades", async (req, res) => {
  try {
    const { studentId, subject, score, year, term } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }
    if (!subject || !subject.toString().trim()) {
      return res.status(400).json({ message: 'Subject is required' });
    }
    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ message: 'Score must be between 0 and 100' });
    }
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
      return res.status(400).json({ message: 'Year is invalid' });
    }
    if (!term || (term !== 1 && term !== 2)) {
      return res.status(400).json({ message: 'Term must be 1 or 2' });
    }
    
    const grade = await Grade.findOneAndUpdate(
      { student: studentId, subject: subject.toString().trim(), year: Number(year), term: Number(term) },
      { student: studentId, subject: subject.toString().trim(), year: Number(year), term: Number(term), score: Number(score) },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    res.status(200).json({ 
      message: 'Grade added successfully',
      grade: grade 
    });
  } catch (err) {
    console.error('Error adding grade:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to add grade' 
    });
  }
});

stdRouter.post("/attendances", async (req, res) => {
  try {
    const { studentId, date, status } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    const validStatuses = ['present', 'absent', 'late'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const normalizedDate = new Date(date);
    if (isNaN(normalizedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    normalizedDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { student: studentId, date: normalizedDate },
      { status: status, date: normalizedDate },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    res.status(200).json({ 
      message: 'Attendance updated successfully',
      attendance: attendance 
    });
  } catch (err) {
    console.error('Error updating attendance:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to update attendance' 
    });
  }
});

// Subjects management
stdRouter.get("/subjects", async (req, res) => {
  try {
    const subjects = await Subject.find({}, 'name').sort({ name: 1 });
    res.status(200).json(subjects.map(s => s.name));
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ message: 'Failed to fetch subjects' });
  }
});

stdRouter.post("/subjects", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Subject name is required' });
    }
    
    const existing = await Subject.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Subject already exists' });
    }
    
    const subject = await Subject.create({ name: name.trim() });
    res.status(201).json(subject);
  } catch (err) {
    console.error('Error creating subject:', err);
    res.status(400).json({ message: err.message || 'Failed to create subject' });
  }
});

stdRouter.delete("/subjects/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const subject = await Subject.findOneAndDelete({ name: name.trim() });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (err) {
    console.error('Error deleting subject:', err);
    res.status(400).json({ message: err.message || 'Failed to delete subject' });
  }
});

// User authentication routes
stdRouter.post("/login", async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    if (!username || !password || !userType) {
      return res.status(400).json({ message: 'Username, password, and user type are required' });
    }

    const user = await User.findOne({ username, userType });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 간단한 비밀번호 비교 (실제로는 bcrypt 사용 권장)
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 로그인 성공
    const userData = {
      username: user.username,
      userType: user.userType,
      studentId: user.studentId
    };

    res.status(200).json({ message: 'Login successful', user: userData });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

stdRouter.post("/register-user", async (req, res) => {
  try {
    const { username, password, userType, studentId } = req.body;

    if (!username || !password || !userType) {
      return res.status(400).json({ message: 'Username, password, and user type are required' });
    }

    // 중복 확인
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = new User({
      username,
      password, // 실제로는 해시화해야 함
      userType,
      studentId: (userType === 'student' || userType === 'parent') ? studentId : null
    });

    const newUser = await user.save();
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (err) {
    console.error('User registration error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = stdRouter;