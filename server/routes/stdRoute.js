const express = require("express");
const stdRouter = express.Router();
const mongoose = require("mongoose");
const Student = require("../models/student");
const Grade = require("../models/grade");
const Attendance = require("../models/attendance");
const Subject = require("../models/subject");
const User = require("../models/user");
const Feedback = require("../models/feedback");
const Notification = require("../models/notification");

// ==================== Input Validation Utilities ====================
/**
 * Validate MongoDB ObjectId format
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate and sanitize string input
 */
const validateString = (value, minLength = 1, maxLength = 500) => {
  if (!value) return { valid: false, error: 'Value is required' };
  const trimmed = String(value).trim();
  if (trimmed.length < minLength) {
    return { valid: false, error: `Value must be at least ${minLength} character(s)` };
  }
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Value must not exceed ${maxLength} character(s)` };
  }
  return { valid: true, value: trimmed };
};

/**
 * Validate numeric input within range
 */
const validateNumber = (value, min = 0, max = 100) => {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return { valid: false, error: 'Value must be a number' };
  }
  if (num < min || num > max) {
    return { valid: false, error: `Value must be between ${min} and ${max}` };
  }
  return { valid: true, value: num };
};

/**
 * Validate year
 */
const validateYear = (value) => {
  const num = Number(value);
  const currentYear = new Date().getFullYear();
  if (Number.isNaN(num) || num < 1900 || num > currentYear) {
    return { valid: false, error: 'Year is invalid' };
  }
  return { valid: true, value: num };
};

/**
 * Validate term (1 or 2)
 */
const validateTerm = (value) => {
  const num = Number(value);
  if (Number.isNaN(num) || (num !== 1 && num !== 2)) {
    return { valid: false, error: 'Term must be 1 or 2' };
  }
  return { valid: true, value: num };
};

/**
 * Validate enum value
 */
const validateEnum = (value, allowedValues) => {
  const trimmed = String(value).trim();
  if (!allowedValues.includes(trimmed)) {
    return { valid: false, error: `Value must be one of: ${allowedValues.join(', ')}` };
  }
  return { valid: true, value: trimmed };
};

/**
 * Validate date format
 */
const validateDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  return { valid: true, value: date };
};

// ==================== Original Validation Functions ====================
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
    if (Number.isNaN(birthDate.getTime())) {
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
    
    // Validate studentId
    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
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
        _id: student._id,
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
    
    // Validate name
    const nameValidation = validateString(name, 2, 100);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: `Name: ${nameValidation.error}` });
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
      { name: nameValidation.value },
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
    
    // Validate name
    const nameValidation = validateString(name, 2, 100);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: `Name: ${nameValidation.error}` });
    }
    
    const result = await Student.findOneAndDelete({ name: nameValidation.value });
    
    if (!result) {
      return res.status(404).json({ 
        message: `Student "${nameValidation.value}" not found`
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
    
    // Validate studentId
    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }
    
    // Validate subject
    const subjectValidation = validateString(subject, 1, 100);
    if (!subjectValidation.valid) {
      return res.status(400).json({ message: `Subject: ${subjectValidation.error}` });
    }
    
    // Validate score
    const scoreValidation = validateNumber(score, 0, 100);
    if (!scoreValidation.valid) {
      return res.status(400).json({ message: `Score: ${scoreValidation.error}` });
    }
    
    // Validate year
    const yearValidation = validateYear(year);
    if (!yearValidation.valid) {
      return res.status(400).json({ message: yearValidation.error });
    }
    
    // Validate term
    const termValidation = validateTerm(term);
    if (!termValidation.valid) {
      return res.status(400).json({ message: termValidation.error });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Use validated values in query
    const grade = await Grade.findOneAndUpdate(
      { 
        student: mongoose.Types.ObjectId(studentId), 
        subject: subjectValidation.value, 
        year: yearValidation.value, 
        term: termValidation.value 
      },
      { 
        student: mongoose.Types.ObjectId(studentId), 
        subject: subjectValidation.value, 
        year: yearValidation.value, 
        term: termValidation.value, 
        score: scoreValidation.value 
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    const notificationMessage = `${student.name} 학생의 ${subjectValidation.value} ${yearValidation.value}학기 ${termValidation.value}차 성적이 ${scoreValidation.value}점으로 등록되었습니다.`;
    await Notification.create({
      studentId: mongoose.Types.ObjectId(studentId),
      recipientType: 'student',
      recipientName: student.name,
      message: notificationMessage,
      type: 'grade',
      relatedData: { 
        subject: subjectValidation.value, 
        score: scoreValidation.value, 
        year: yearValidation.value, 
        term: termValidation.value 
      }
    });
    await Notification.create({
      studentId: mongoose.Types.ObjectId(studentId),
      recipientType: 'parent',
      message: notificationMessage,
      type: 'grade',
      relatedData: { 
        subject: subjectValidation.value, 
        score: scoreValidation.value, 
        year: yearValidation.value, 
        term: termValidation.value 
      }
    });

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
    
    // Validate studentId
    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }
    
    // Validate date
    const dateValidation = validateDate(date);
    if (!dateValidation.valid) {
      return res.status(400).json({ message: dateValidation.error });
    }
    
    // Validate status
    const validStatuses = ['present', 'absent', 'late'];
    const statusValidation = validateEnum(status, validStatuses);
    if (!statusValidation.valid) {
      return res.status(400).json({ message: statusValidation.error });
    }
    
    const normalizedDate = new Date(dateValidation.value);
    normalizedDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { student: mongoose.Types.ObjectId(studentId), date: normalizedDate },
      { status: statusValidation.value, date: normalizedDate },
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
    
    // Validate subject name
    const nameValidation = validateString(name, 1, 100);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: `Subject name: ${nameValidation.error}` });
    }
    
    const existing = await Subject.findOne({ name: nameValidation.value });
    if (existing) {
      return res.status(400).json({ message: 'Subject already exists' });
    }
    
    const subject = await Subject.create({ name: nameValidation.value });
    res.status(201).json(subject);
  } catch (err) {
    console.error('Error creating subject:', err);
    res.status(400).json({ message: err.message || 'Failed to create subject' });
  }
});

stdRouter.delete("/subjects/:name", async (req, res) => {
  try {
    const { name } = req.params;
    
    // Validate subject name
    const nameValidation = validateString(name, 1, 100);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: `Subject name: ${nameValidation.error}` });
    }
    
    const subject = await Subject.findOneAndDelete({ name: nameValidation.value });
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

    // Validate username
    const usernameValidation = validateString(username, 1, 100);
    if (!usernameValidation.valid) {
      return res.status(400).json({ message: `Username: ${usernameValidation.error}` });
    }

    // Validate password
    const passwordValidation = validateString(password, 1, 500);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: `Password: ${passwordValidation.error}` });
    }

    // Validate userType
    const validUserTypes = ['student', 'teacher', 'parent', 'admin'];
    const userTypeValidation = validateEnum(userType, validUserTypes);
    if (!userTypeValidation.valid) {
      return res.status(400).json({ message: userTypeValidation.error });
    }

    const user = await User.findOne({ username: usernameValidation.value, userType: userTypeValidation.value });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 간단한 비밀번호 비교 (실제로는 bcrypt 사용 권장)
    if (user.password !== passwordValidation.value) {
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

    // Validate username
    const usernameValidation = validateString(username, 1, 100);
    if (!usernameValidation.valid) {
      return res.status(400).json({ message: `Username: ${usernameValidation.error}` });
    }

    // Validate password
    const passwordValidation = validateString(password, 1, 500);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: `Password: ${passwordValidation.error}` });
    }

    // Validate userType
    const validUserTypes = ['student', 'teacher', 'parent', 'admin'];
    const userTypeValidation = validateEnum(userType, validUserTypes);
    if (!userTypeValidation.valid) {
      return res.status(400).json({ message: userTypeValidation.error });
    }

    // Validate studentId if required
    let validatedStudentId = null;
    if (userTypeValidation.value === 'student' || userTypeValidation.value === 'parent') {
      if (studentId && !isValidObjectId(studentId)) {
        return res.status(400).json({ message: 'Invalid student ID format' });
      }
      validatedStudentId = studentId ? mongoose.Types.ObjectId(studentId) : null;
    }

    // 중복 확인
    const existingUser = await User.findOne({ username: usernameValidation.value });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = new User({
      username: usernameValidation.value,
      password: passwordValidation.value, // 실제로는 해시화해야 함
      userType: userTypeValidation.value,
      studentId: validatedStudentId
    });

    const newUser = await user.save();
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (err) {
    console.error('User registration error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// ==================== Feedback Routes ====================

// GET /students/:studentId/feedbacks - 특정 학생의 피드백 조회
stdRouter.get("/:studentId/feedbacks", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { viewerType, viewerName } = req.query;
    
    // Validate studentId
    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    let filter = { studentId: mongoose.Types.ObjectId(studentId) };
    
    if (viewerType) {
      // Validate viewerType
      const viewerTypeValidation = validateEnum(viewerType, ['teacher', 'student', 'parent']);
      if (!viewerTypeValidation.valid) {
        return res.status(400).json({ message: viewerTypeValidation.error });
      }
      
      if (viewerTypeValidation.value === 'teacher' && viewerName) {
        // Validate viewerName
        const viewerNameValidation = validateString(viewerName, 1, 100);
        if (!viewerNameValidation.valid) {
          return res.status(400).json({ message: `Viewer name: ${viewerNameValidation.error}` });
        }
        
        filter = {
          studentId: mongoose.Types.ObjectId(studentId),
          $or: [
            { shareWithTeachers: true },
            { teacherName: viewerNameValidation.value }
          ]
        };
      }
    }

    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 });
    
    res.status(200).json(feedbacks);
  } catch (err) {
    console.error('Error fetching feedbacks:', err);
    res.status(500).json({ 
      message: err.message || 'Failed to fetch feedbacks' 
    });
  }
});

// POST /students/feedbacks - 피드백 등록
stdRouter.post("/feedbacks", async (req, res) => {
  try {
    const { 
      studentId, 
      teacherName,
      academicPerformance, 
      attendance, 
      behavior, 
      attitude, 
      additionalComments,
      shareWithTeachers 
    } = req.body;

    // Validate studentId
    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }
    
    // Validate teacherName
    const teacherNameValidation = validateString(teacherName, 1, 100);
    if (!teacherNameValidation.valid) {
      return res.status(400).json({ message: `Teacher name: ${teacherNameValidation.error}` });
    }

    // 학생 존재 여부 확인
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // 최소 한 가지 항목은 입력되어야 함
    if (!academicPerformance && !attendance && !behavior && !attitude && !additionalComments) {
      return res.status(400).json({ 
        message: 'At least one feedback field is required' 
      });
    }

    const feedback = new Feedback({
      studentId: mongoose.Types.ObjectId(studentId),
      teacherName: teacherNameValidation.value,
      academicPerformance: academicPerformance ? String(academicPerformance).trim() : '',
      attendance: attendance ? String(attendance).trim() : '',
      behavior: behavior ? String(behavior).trim() : '',
      attitude: attitude ? String(attitude).trim() : '',
      additionalComments: additionalComments ? String(additionalComments).trim() : '',
      shareWithTeachers: !!shareWithTeachers
    });

    const newFeedback = await feedback.save();

    const notificationMessage = `${student.name} 학생에 대한 새로운 피드백이 등록되었습니다.`;
    await Notification.create({
      studentId: mongoose.Types.ObjectId(studentId),
      recipientType: 'student',
      recipientName: student.name,
      message: notificationMessage,
      type: 'feedback',
      relatedData: { teacherName: teacherNameValidation.value, feedbackId: newFeedback._id }
    });
    await Notification.create({
      studentId: mongoose.Types.ObjectId(studentId),
      recipientType: 'parent',
      message: notificationMessage,
      type: 'feedback',
      relatedData: { teacherName: teacherNameValidation.value, feedbackId: newFeedback._id }
    });

    res.status(201).json({ 
      message: 'Feedback added successfully',
      feedback: newFeedback 
    });
  } catch (err) {
    console.error('Error creating feedback:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to create feedback' 
    });
  }
});

// GET /notifications - 특정 학생/학부모의 알림 조회
stdRouter.get("/notifications", async (req, res) => {
  try {
    const { viewerType, viewerName, studentId } = req.query;
    
    // Validate required parameters
    if (!viewerType || !studentId) {
      return res.status(400).json({ message: 'viewerType and studentId are required' });
    }

    // Validate studentId
    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    // Validate viewerType
    const validViewerTypes = ['student', 'parent'];
    const viewerTypeValidation = validateEnum(viewerType, validViewerTypes);
    if (!viewerTypeValidation.valid) {
      return res.status(400).json({ message: viewerTypeValidation.error });
    }

    let filter;
    if (viewerTypeValidation.value === 'student') {
      if (!viewerName) {
        return res.status(400).json({ message: 'viewerName is required for student notifications' });
      }
      // Validate viewerName
      const viewerNameValidation = validateString(viewerName, 1, 100);
      if (!viewerNameValidation.valid) {
        return res.status(400).json({ message: `Viewer name: ${viewerNameValidation.error}` });
      }
      filter = { studentId: mongoose.Types.ObjectId(studentId), recipientType: 'student', recipientName: viewerNameValidation.value };
    } else {
      filter = { studentId: mongoose.Types.ObjectId(studentId), recipientType: 'parent' };
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch notifications' });
  }
});

// POST /notifications/mark-all-read - 알림을 모두 읽음 처리
stdRouter.post("/notifications/mark-all-read", async (req, res) => {
  try {
    const { viewerType, viewerName, studentId } = req.query;
    
    // Validate required parameters
    if (!viewerType || !studentId) {
      return res.status(400).json({ message: 'viewerType and studentId are required' });
    }

    // Validate studentId
    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    // Validate viewerType
    const validViewerTypes = ['student', 'parent'];
    const viewerTypeValidation = validateEnum(viewerType, validViewerTypes);
    if (!viewerTypeValidation.valid) {
      return res.status(400).json({ message: viewerTypeValidation.error });
    }

    let filter;
    if (viewerTypeValidation.value === 'student') {
      if (!viewerName) {
        return res.status(400).json({ message: 'viewerName is required for student notifications' });
      }
      // Validate viewerName
      const viewerNameValidation = validateString(viewerName, 1, 100);
      if (!viewerNameValidation.valid) {
        return res.status(400).json({ message: `Viewer name: ${viewerNameValidation.error}` });
      }
      filter = { studentId: mongoose.Types.ObjectId(studentId), recipientType: 'student', recipientName: viewerNameValidation.value };
    } else {
      filter = { studentId: mongoose.Types.ObjectId(studentId), recipientType: 'parent' };
    }

    await Notification.updateMany(filter, { read: true });
    res.status(200).json({ message: 'Notifications marked read' });
  } catch (err) {
    console.error('Error marking notifications read:', err);
    res.status(500).json({ message: err.message || 'Failed to mark notifications read' });
  }
});

// PUT /students/feedbacks/:feedbackId - 피드백 수정 (선택사항)
stdRouter.put("/feedbacks/:feedbackId", async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { 
      academicPerformance, 
      attendance, 
      behavior, 
      attitude, 
      additionalComments 
    } = req.body;
    
    // Validate feedbackId
    if (!feedbackId || !isValidObjectId(feedbackId)) {
      return res.status(400).json({ message: 'Invalid feedback ID' });
    }
    
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    // 최소 한 가지 항목은 입력되어야 함
    if (!academicPerformance && !attendance && !behavior && !attitude && !additionalComments) {
      return res.status(400).json({ 
        message: 'At least one feedback field is required' 
      });
    }
    
    const updatedFeedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      {
        academicPerformance: academicPerformance ? String(academicPerformance).trim() : '',
        attendance: attendance ? String(attendance).trim() : '',
        behavior: behavior ? String(behavior).trim() : '',
        attitude: attitude ? String(attitude).trim() : '',
        additionalComments: additionalComments ? String(additionalComments).trim() : ''
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ 
      message: 'Feedback updated successfully',
      feedback: updatedFeedback 
    });
  } catch (err) {
    console.error('Error updating feedback:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to update feedback' 
    });
  }
});

// DELETE /students/feedbacks/:feedbackId - 피드백 삭제 (선택사항)
stdRouter.delete("/feedbacks/:feedbackId", async (req, res) => {
  try {
    const { feedbackId } = req.params;
    
    // Validate feedbackId
    if (!feedbackId || !isValidObjectId(feedbackId)) {
      return res.status(400).json({ message: 'Invalid feedback ID' });
    }
    
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    await Feedback.findByIdAndDelete(feedbackId);
    res.status(200).json({ 
      message: 'Feedback deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).json({ 
      message: err.message || 'Failed to delete feedback' 
    });
  }
});

module.exports = stdRouter;