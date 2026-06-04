const express = require("express");
const stdRouter = express.Router();
const mongoose = require("mongoose");
const Student = require("../models/student");
const StudentBackup = require("../models/studentBackup");
const StudentApplication = require("../models/studentApplication");
const StudentApplicationBackup = require("../models/studentApplicationBackup");
const Grade = require("../models/grade");
const GradeBackup = require("../models/gradeBackup");
const Attendance = require("../models/attendance");
const AttendanceBackup = require("../models/attendanceBackup");
const Subject = require("../models/subject");
const SubjectBackup = require("../models/subjectBackup");
const User = require("../models/user");
const UserBackup = require("../models/userBackup");
const Feedback = require("../models/feedback");
const FeedbackBackup = require("../models/feedbackBackup");
const Notification = require("../models/notification");
const NotificationBackup = require("../models/notificationBackup");
const Counseling = require("../models/counseling");
const CounselingBackup = require("../models/counselingBackup");
const ExcelJS = require('exceljs');

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
  
  if (!data.name?.toString().trim()) {
    errors.push('Student name is required');
  } else if (data.name.toString().trim().length < 2) {
    errors.push('Student name must be at least 2 characters');
  }
  
  if (data.birthDate) {
    const birthDate = new Date(data.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      errors.push('Birth date must be a valid date');
    }
  } else {
    errors.push('Birth date is required');
  }
  
  if (!data.gender || !['male', 'female'].includes(data.gender)) {
    errors.push('Gender is required and must be male or female');
  }
  
  if (!data.subject?.toString().trim()) {
    errors.push('Subject is required');
  }
  
  if (!data.bio?.toString().trim()) {
    errors.push('Biography is required');
  }
  
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

// ==================== Helper Functions ====================

/**
 * Convert string to MongoDB ObjectId
 */
const convertToObjectId = (value) => {
  return new mongoose.Types.ObjectId(value);
};

/**
 * Build student response data with grades and attendance processing
 */
const buildStudentResponse = async (student, subjectFilter) => {
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

  return {
    username: student.name,
    birthDate: student.birthDate,
    gender: student.gender,
    subjects: student.subject,
    bio: student.bio,
    kakaoId: student.kakaoId || '',
    parents: Array.isArray(student.parents) ? student.parents : [],
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
};

const formatKoreanDateTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const upsertStudentBackup = async (student) => {
  if (!student || !student._id) return null;

  const backupData = {
    serviceStudentId: student._id,
    name: student.name,
    birthDate: student.birthDate,
    gender: student.gender,
    subject: Array.isArray(student.subject) ? student.subject : (student.subject ? [student.subject] : []),
    bio: student.bio,
    kakaoId: student.kakaoId || undefined,
    parents: Array.isArray(student.parents) ? student.parents : [],
    originalCreatedAt: student.createdAt || undefined,
    updatedAt: new Date()
  };

  return StudentBackup.findOneAndUpdate(
    { serviceStudentId: student._id },
    backupData,
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
};

const removeStudentBackup = async (studentId) => {
  if (!studentId) return;
  await StudentBackup.deleteOne({ serviceStudentId: studentId });
};

const upsertBackupRecord = async (BackupModel, serviceIdField, doc) => {
  if (!doc || !doc._id) return null;

  const objectData = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const backupData = {
    [serviceIdField]: doc._id,
    data: objectData,
    originalCreatedAt: objectData.createdAt || undefined,
    originalUpdatedAt: objectData.updatedAt || undefined,
    updatedAt: new Date()
  };

  return BackupModel.findOneAndUpdate(
    { [serviceIdField]: doc._id },
    backupData,
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
};

const removeBackupRecord = async (BackupModel, serviceIdField, serviceId) => {
  if (!serviceId) return;
  await BackupModel.deleteOne({ [serviceIdField]: serviceId });
};

const createNotificationWithBackup = async (notificationProps) => {
  const notification = await Notification.create(notificationProps);
  await upsertBackupRecord(NotificationBackup, 'serviceNotificationId', notification);
  return notification;
};

const backupMultipleNotifications = async (notifications) => {
  if (!Array.isArray(notifications) || notifications.length === 0) return;
  await Promise.all(
    notifications.map((notification) => upsertBackupRecord(NotificationBackup, 'serviceNotificationId', notification))
  );
};

const getGradeSummary = (grades) => {
  const summary = {
    totalScore: 0,
    subjects: {}
  };

  grades.forEach((grade) => {
    const score = Number(grade.score) || 0;
    summary.totalScore += score;
    if (!summary.subjects[grade.subject]) {
      summary.subjects[grade.subject] = { total: 0, count: 0 };
    }
    summary.subjects[grade.subject].total += score;
    summary.subjects[grade.subject].count += 1;
  });

  return {
    overallAverage: grades.length ? (summary.totalScore / grades.length).toFixed(2) : '0.00',
    subjectAverages: Object.entries(summary.subjects).map(([subject, data]) => ({
      subject,
      average: data.count ? (data.total / data.count).toFixed(2) : '0.00'
    }))
  };
};

const calculateTermAverages = (grades) => {
  const termMap = {};
  grades.forEach((grade) => {
    const key = `${grade.year}-${grade.term}`;
    if (!termMap[key]) {
      termMap[key] = { year: grade.year, term: grade.term, total: 0, count: 0 };
    }
    termMap[key].total += Number(grade.score) || 0;
    termMap[key].count += 1;
  });

  return Object.values(termMap)
    .map((item) => ({
      year: item.year,
      term: item.term,
      average: item.count ? (item.total / item.count).toFixed(2) : '0.00'
    }))
    .sort((a, b) => (a.year * 10 + a.term) - (b.year * 10 + b.term));
};

const calculateSubjectRanks = async (grades) => {
  const rankMap = {};
  await Promise.all(grades.map(async (grade) => {
    const subject = grade.subject;
    const year = Number(grade.year);
    const term = Number(grade.term);
    const score = Number(grade.score) || 0;

    const totalCount = await Grade.countDocuments({ subject, year, term });
    const higherCount = await Grade.countDocuments({ subject, year, term, score: { $gt: score } });
    rankMap[grade._id.toString()] = `${higherCount + 1}/${totalCount}`;
  }));
  return rankMap;
};

const buildStudentReportData = async (studentId) => {
  const student = await Student.findById(studentId);
  if (!student) return null;

  const grades = await Grade.find({ student: student._id }).sort({ year: -1, term: 1, subject: 1 });
  const counselings = await Counseling.find({ studentId: student._id }).sort({ dateTime: 1 });
  const feedbacks = await Feedback.find({ studentId: student._id }).sort({ createdAt: -1 });
  const termAverages = calculateTermAverages(grades);

  return { student, grades, counselings, feedbacks, termAverages };
};

const generateExcelStudentReport = async (res, reportData, reportLabel, filename) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.addRow([`${reportData.student.name} 학생 ${reportLabel} 보고서`]);
  sheet.addRow([`생년월일: ${new Date(reportData.student.birthDate).toLocaleDateString('ko-KR')}`]);
  sheet.addRow([`성별: ${reportData.student.gender === 'male' ? '남성' : '여성'}`]);
  sheet.addRow([`작성일: ${new Date().toLocaleString('ko-KR')}`]);
  sheet.addRow([]);

  if (reportLabel === '성적 분석') {
    const summary = getGradeSummary(reportData.grades);
    const termAverages = reportData.termAverages || calculateTermAverages(reportData.grades);
    const subjectRanks = await calculateSubjectRanks(reportData.grades);

    sheet.addRow([`전체 평균: ${summary.overallAverage}`]);
    sheet.addRow([]);
    sheet.addRow(['학기별 전과목 평균']);
    sheet.addRow(['학기', '평균']);
    termAverages.forEach((item) => {
      sheet.addRow([`${item.year} Term ${item.term}`, item.average]);
    });
    sheet.addRow([]);
    sheet.addRow(['과목별 평균']);
    sheet.addRow(['과목', '평균']);
    summary.subjectAverages.forEach((item) => {
      sheet.addRow([item.subject, item.average]);
    });
    sheet.addRow([]);
    sheet.addRow(['상세 성적 목록']);
    sheet.addRow(['과목', '학기', '점수', '과목별 등수']);
    reportData.grades.forEach((grade) => {
      sheet.addRow([
        grade.subject,
        `${grade.year} Term ${grade.term}`,
        grade.score,
        subjectRanks[grade._id.toString()] || '-'
      ]);
    });
  } else if (reportLabel === '상담 내역') {
    sheet.addRow(['상담 내역']);
    sheet.addRow(['상담 일시', '상태', '교사', '학생 메모', '교사 메모', '거절 사유']);
    reportData.counselings.forEach((counseling) => {
      sheet.addRow([
        formatKoreanDateTime(counseling.dateTime),
        counseling.status,
        counseling.teacherName,
        counseling.studentNote || '',
        counseling.teacherNotes || '',
        counseling.rejectionReason || ''
      ]);
    });
  } else if (reportLabel === '피드백 요약') {
    sheet.addRow(['피드백 요약']);
    sheet.addRow(['작성일', '교사', '학업 성과', '출결', '행동', '태도', '추가 의견', '공유 여부']);
    reportData.feedbacks.forEach((feedback) => {
      sheet.addRow([
        formatKoreanDateTime(feedback.createdAt),
        feedback.teacherName,
        feedback.academicPerformance || '',
        feedback.attendance || '',
        feedback.behavior || '',
        feedback.attitude || '',
        feedback.additionalComments || '',
        feedback.shareWithTeachers ? '공유' : '비공유'
      ]);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const safeFilename = String(filename).replace(/["]+/g, '_').replace(/[\r\n]+/g, '_');
  const asciiFilename = safeFilename.replace(/[^\x20-\x7E]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
  res.send(Buffer.from(buffer));
};

/**
 * Build notification filter based on viewer type
 */
const buildNotificationFilter = (viewerType, viewerName, studentId) => {
  if (viewerType === 'student') {
    return {
      studentId: convertToObjectId(studentId),
      recipientType: 'student',
      recipientName: viewerName
    };
  } else {
    return {
      studentId: convertToObjectId(studentId),
      recipientType: 'parent'
    };
  }
};

/**
 * Validate notification parameters and build filter
 */
const validateAndBuildNotificationFilter = (viewerType, viewerName, studentId) => {
  // Validate required parameters
  if (!viewerType || !studentId) {
    return { valid: false, error: 'viewerType and studentId are required' };
  }

  // Validate studentId
  if (!isValidObjectId(studentId)) {
    return { valid: false, error: 'Invalid student ID' };
  }

  // Validate viewerType
  const validViewerTypes = ['student', 'parent'];
  const viewerTypeValidation = validateEnum(viewerType, validViewerTypes);
  if (!viewerTypeValidation.valid) {
    return { valid: false, error: viewerTypeValidation.error };
  }

  let filter;
  if (viewerTypeValidation.value === 'student') {
    if (!viewerName) {
      return { valid: false, error: 'viewerName is required for student notifications' };
    }
    // Validate viewerName
    const viewerNameValidation = validateString(viewerName, 1, 100);
    if (!viewerNameValidation.valid) {
      return { valid: false, error: `Viewer name: ${viewerNameValidation.error}` };
    }
    filter = buildNotificationFilter(viewerTypeValidation.value, viewerNameValidation.value, studentId);
  } else {
    filter = buildNotificationFilter(viewerTypeValidation.value, null, studentId);
  }

  return { valid: true, filter };
};

stdRouter.get("/", async (req, res) => {
  try {
    const studentName = req.query.name;
    if (!studentName?.trim()) {
      return res.status(400).json({ message: 'Student name is required' });
    }

    const student = await Student.findOne({ name: studentName.trim() });
    if (!student) {
      return res.status(404).json({ message: `Student "${studentName.trim()}" not found` });
    }

    const subjectFilter = req.query.subject;
    const data = await buildStudentResponse(student, subjectFilter);
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
    const data = await buildStudentResponse(student, subjectFilter);
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching student by ID:', err);
    res.status(500).json({ 
      message: err.message || 'Failed to fetch student data' 
    });
  }
});

stdRouter.get("/users/all", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected - returning empty user list');
      return res.status(200).json([]);
    }

    const users = await User.find({}, 'username userType isAdmin studentId email profileImage').lean();
    const usersForClient = users.map(user => ({
      _id: user._id,
      username: user.username,
      userType: user.userType,
      isAdmin: user.isAdmin || false,
      studentId: user.studentId,
      email: user.email,
      profileImage: user.profileImage
    }));

    res.status(200).json(usersForClient);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

stdRouter.get("/all", async (req, res) => {
  try {
    // This endpoint expects subject field - if not present, it's not for this route
    if (!req.body.subject) {
      return res.status(400).json({ 
        message: 'Subject field is required for student creation' 
      });
    }

    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected - cannot create student');
      return res.status(503).json({ message: 'Database not connected' });
    }
    const { name, birthDate, gender, subject, bio, kakaoId, parents } = req.body;
    
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
    
    const studentData = {
      name: name.toString().trim(),
      birthDate: new Date(birthDate),
      gender: gender,
      subject: Array.isArray(subject) ? subject : [subject],
      bio: bio.toString().trim(),
    };

    // optional kakaoId for student
    if (kakaoId && typeof kakaoId === 'string' && kakaoId.trim()) {
      studentData.kakaoId = kakaoId.trim();
    }

    // optional parents array
    if (Array.isArray(parents) && parents.length > 0) {
      studentData.parents = parents.map(p => ({
        name: p.name || '',
        kakaoId: p.kakaoId || '',
        email: p.email || ''
      }));
    }

    const student = new Student(studentData);
    
    const newStudent = await student.save();
    await upsertStudentBackup(newStudent);
    res.status(201).json(newStudent);
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to create student' 
    });
  }
});

stdRouter.post("/applications", async (req, res) => {
  try {
    console.log('=== POST /applications received ===');
    console.log('Body:', req.body);
    
    const { kakaoId, name, birthDate, gender, email, profileImage, userType } = req.body;

    const kakaoIdValidation = validateString(kakaoId || '', 1, 200);
    if (!kakaoIdValidation.valid) {
      return res.status(400).json({ message: `Kakao ID: ${kakaoIdValidation.error}` });
    }

    const nameValidation = validateString(name || '', 2, 100);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: `Name: ${nameValidation.error}` });
    }

    const userTypeValidation = validateEnum(userType || 'student', ['student', 'teacher']);
    if (!userTypeValidation.valid) {
      return res.status(400).json({ message: userTypeValidation.error });
    }

    let birthDateValidated = undefined;
    if (birthDate) {
      const birthDateValidation = validateDate(birthDate);
      if (!birthDateValidation.valid) {
        return res.status(400).json({ message: `Birth date: ${birthDateValidation.error}` });
      }
      birthDateValidated = birthDateValidation.value;
    }

    const genderValidation = gender ? validateEnum(gender, ['male', 'female']) : { valid: true, value: undefined };
    if (!genderValidation.valid) {
      return res.status(400).json({ message: `Gender: ${genderValidation.error}` });
    }

    const emailValidation = email ? validateString(email, 5, 200) : { valid: true, value: '' };
    if (!emailValidation.valid) {
      return res.status(400).json({ message: `Email: ${emailValidation.error}` });
    }

    if (userTypeValidation.value === 'student') {
      const existingStudent = await Student.findOne({ kakaoId: kakaoIdValidation.value });
      if (existingStudent) {
        return res.status(400).json({ message: 'A student account is already linked to this Kakao ID' });
      }
    } else {
      const existingUser = await User.findOne({ kakaoId: kakaoIdValidation.value });
      if (existingUser) {
        return res.status(400).json({ message: 'A teacher account is already linked to this Kakao ID' });
      }
    }

    const existingNameRecord = userTypeValidation.value === 'student'
      ? await Student.findOne({ name: nameValidation.value })
      : await User.findOne({ username: nameValidation.value });
    if (existingNameRecord) {
      return res.status(400).json({ message: `${userTypeValidation.value === 'student' ? 'A student' : 'A teacher'} with this name is already registered` });
    }

    const existingApplication = await StudentApplication.findOne({ kakaoId: kakaoIdValidation.value, status: 'pending' });
    if (existingApplication) {
      return res.status(400).json({ message: 'A registration application is already pending for this Kakao account' });
    }

    const application = await StudentApplication.create({
      kakaoId: kakaoIdValidation.value,
      name: nameValidation.value,
      birthDate: birthDateValidated,
      gender: genderValidation.value,
      email: emailValidation.value || undefined,
      profileImage: profileImage ? profileImage.toString().trim() : undefined,
      userType: userTypeValidation.value,
    });

    await upsertBackupRecord(StudentApplicationBackup, 'serviceApplicationId', application);

    res.status(201).json({ message: `${userTypeValidation.value === 'student' ? 'Student' : 'Teacher'} registration application created`, application });
  } catch (err) {
    console.error('Error creating registration application:', err);
    console.error('Error stack:', err.stack);
    res.status(400).json({ message: err.message || 'Failed to create registration application' });
  }
});

stdRouter.get("/applications", async (req, res) => {
  try {
    // Return only pending applications so approved/rejected ones disappear from the teacher list
    const applications = await StudentApplication.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.status(200).json(applications);
  } catch (err) {
    console.error('Error fetching student applications:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch student applications' });
  }
});

stdRouter.put("/applications/:id/approve", async (req, res) => {
  try {
    const appId = req.params.id;
    if (!appId || !isValidObjectId(appId)) {
      return res.status(400).json({ message: 'Valid application ID is required' });
    }

    const application = await StudentApplication.findById(appId);
    if (!application) {
      return res.status(404).json({ message: 'Student application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending applications can be approved' });
    }

    const { birthDate, gender } = req.body || {}
    let resolvedBirthDate = application.birthDate
    let resolvedGender = application.gender

    if (!resolvedBirthDate && birthDate) {
      const birthDateValidation = validateDate(birthDate)
      if (!birthDateValidation.valid) {
        return res.status(400).json({ message: `Birth date: ${birthDateValidation.error}` })
      }
      resolvedBirthDate = birthDateValidation.value
    }

    if (!resolvedGender && gender) {
      const genderValidation = validateEnum(gender, ['male', 'female'])
      if (!genderValidation.valid) {
        return res.status(400).json({ message: `Gender: ${genderValidation.error}` })
      }
      resolvedGender = genderValidation.value
    }

    if (!resolvedBirthDate) {
      return res.status(400).json({ message: 'Birth date is required to approve this application' })
    }

    if (!resolvedGender) {
      return res.status(400).json({ message: 'Gender is required to approve this application' })
    }

    const existingStudent = await Student.findOne({ kakaoId: application.kakaoId });
    if (existingStudent) {
      return res.status(400).json({ message: 'A student account is already linked to this Kakao ID' });
    }

    const existingNameStudent = await Student.findOne({ name: application.name });
    if (existingNameStudent) {
      return res.status(400).json({ message: 'A student with this name already exists. Please update the existing student record or use a different name.' });
    }

    if (application.userType === 'teacher') {
      const existingUser = await User.findOne({ kakaoId: application.kakaoId });
      if (existingUser) {
        return res.status(400).json({ message: 'A teacher account is already linked to this Kakao ID' });
      }

      const user = await User.create({
        kakaoId: application.kakaoId,
        username: application.name,
        email: application.email || undefined,
        profileImage: application.profileImage || undefined,
        userType: 'teacher',
        isAdmin: false,
        lastLoginAt: new Date(),
      });
      await upsertBackupRecord(UserBackup, 'serviceUserId', user);

      application.status = 'accepted';
      application.reviewedAt = new Date();
      await application.save();
      await upsertBackupRecord(StudentApplicationBackup, 'serviceApplicationId', application);

      return res.status(200).json({ message: 'Teacher application approved', user, application });
    }

    const studentData = {
      name: application.name,
      birthDate: resolvedBirthDate,
      gender: resolvedGender,
      subject: ['미정'],
      bio: '학생 등록 신청을 통해 생성된 기본 정보입니다.',
      kakaoId: application.kakaoId,
      parents: []
    };

    const student = new Student(studentData);
    await student.save();
    await upsertStudentBackup(student);

    application.status = 'accepted';
    application.reviewedAt = new Date();
    application.birthDate = resolvedBirthDate;
    application.gender = resolvedGender;
    await application.save();
    await upsertBackupRecord(StudentApplicationBackup, 'serviceApplicationId', application);

    res.status(200).json({ message: 'Student application approved', student, application });
  } catch (err) {
    console.error('Error approving student application:', err);
    res.status(400).json({ message: err.message || 'Failed to approve student application' });
  }
});

stdRouter.put("/applications/:id/reject", async (req, res) => {
  try {
    const appId = req.params.id;
    if (!appId || !isValidObjectId(appId)) {
      return res.status(400).json({ message: 'Valid application ID is required' });
    }

    const { rejectionReason } = req.body;
    const application = await StudentApplication.findById(appId);
    if (!application) {
      return res.status(404).json({ message: 'Student application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending applications can be rejected' });
    }

    application.status = 'rejected';
    application.rejectionReason = rejectionReason ? rejectionReason.toString().trim() : '';
    application.reviewedAt = new Date();
    await application.save();
    await upsertBackupRecord(StudentApplicationBackup, 'serviceApplicationId', application);

    res.status(200).json({ message: 'Student application rejected', application });
  } catch (err) {
    console.error('Error rejecting student application:', err);
    res.status(400).json({ message: err.message || 'Failed to reject student application' });
  }
});

stdRouter.post("/:studentId/add-parent", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { kakaoId, name } = req.body;

    // Validate studentId
    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }

    // Validate kakaoId
    const kakaoIdValidation = validateString(kakaoId || '', 1, 200);
    if (!kakaoIdValidation.valid) {
      return res.status(400).json({ message: `Kakao ID: ${kakaoIdValidation.error}` });
    }

    // Validate parent name
    const nameValidation = validateString(name || '', 1, 100);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: `Parent name: ${nameValidation.error}` });
    }

    // Find student
    const student = await Student.findById(convertToObjectId(studentId));
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if parent already exists
    const existingParent = Array.isArray(student.parents) && student.parents.find(p => 
      String(p.kakaoId) === String(kakaoIdValidation.value)
    );

    if (existingParent) {
      return res.status(400).json({ message: 'This parent is already registered for this student' });
    }

    // Add parent
    if (!Array.isArray(student.parents)) {
      student.parents = [];
    }

    student.parents.push({
      name: nameValidation.value,
      kakaoId: kakaoIdValidation.value,
      email: ''
    });

    await student.save();
    await upsertStudentBackup(student);

    res.status(200).json({ 
      message: 'Parent added successfully', 
      student 
    });
  } catch (err) {
    console.error('Error adding parent:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to add parent' 
    });
  }
});

stdRouter.put("/:name", async (req, res) => {
  try {
    const originalNameValidation = validateString(req.params.name, 2, 100);
    if (!originalNameValidation.valid) {
      return res.status(400).json({ message: `Original student name: ${originalNameValidation.error}` });
    }

    const { name, birthDate, gender, subject, bio, kakaoId, parents } = req.body;

    // Validate requested update fields
    const nameValidation = validateString(name, 2, 100);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: `Name: ${nameValidation.error}` });
    }

    const validation = validateStudentData({ name, birthDate, gender, subject, bio });
    if (!validation.valid) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validation.errors 
      });
    }

    let updateData = {
      name: nameValidation.value,
      birthDate: new Date(birthDate),
      gender,
      subject: Array.isArray(subject) ? subject : [subject],
      bio: bio.toString().trim(),
    };

    if (kakaoId && typeof kakaoId === 'string' && kakaoId.trim()) {
      updateData.kakaoId = kakaoId.trim();
    } else if (kakaoId === '') {
      updateData.kakaoId = undefined;
    }

    if (Array.isArray(parents)) {
      updateData.parents = parents
        .map(p => ({
          name: (p.name || '').toString().trim(),
          kakaoId: (p.kakaoId || '').toString().trim(),
          email: (p.email || '').toString().trim()
        }))
        .filter(p => p.name || p.kakaoId || p.email);
    }

    const student = await Student.findOneAndUpdate(
      { name: originalNameValidation.value },
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ 
        message: `Student "${originalNameValidation.value}" not found` 
      });
    }

    await upsertStudentBackup(student);
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
    const { name, studentId } = req.body;
    let deletedStudent = null;

    if (studentId) {
      if (!isValidObjectId(studentId)) {
        return res.status(400).json({ message: 'Valid studentId is required' });
      }
      deletedStudent = await Student.findByIdAndDelete(studentId);
    } else {
      const nameValidation = validateString(name, 2, 100);
      if (!nameValidation.valid) {
        return res.status(400).json({ message: `Name: ${nameValidation.error}` });
      }
      deletedStudent = await Student.findOneAndDelete({ name: nameValidation.value });
    }

    if (!deletedStudent) {
      return res.status(404).json({ 
        message: studentId ? 'Student not found' : `Student "${name}" not found`
      });
    }

    const studentObjectId = deletedStudent._id;
    await Promise.all([
      Grade.deleteMany({ student: studentObjectId }),
      Attendance.deleteMany({ student: studentObjectId }),
      Feedback.deleteMany({ studentId: studentObjectId }),
      Counseling.deleteMany({ studentId: studentObjectId }),
      Notification.deleteMany({ studentId: studentObjectId }),
      User.deleteMany({ studentId: studentObjectId }),
      removeStudentBackup(studentObjectId),
      // remove associated backup records for related documents
      removeBackupRecord(GradeBackup, 'serviceGradeId', studentObjectId),
      removeBackupRecord(AttendanceBackup, 'serviceAttendanceId', studentObjectId),
      removeBackupRecord(FeedbackBackup, 'serviceFeedbackId', studentObjectId),
      removeBackupRecord(CounselingBackup, 'serviceCounselingId', studentObjectId),
      removeBackupRecord(NotificationBackup, 'serviceNotificationId', studentObjectId),
      removeBackupRecord(UserBackup, 'serviceUserId', studentObjectId)
    ]);

    res.status(200).json({ 
      message: `Student "${deletedStudent.name}" deleted successfully`,
      student: deletedStudent 
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
        student: convertToObjectId(studentId), 
        subject: subjectValidation.value, 
        year: yearValidation.value, 
        term: termValidation.value 
      },
      { 
        student: convertToObjectId(studentId), 
        subject: subjectValidation.value, 
        year: yearValidation.value, 
        term: termValidation.value, 
        score: scoreValidation.value 
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    const notificationMessage = `${student.name} 학생의 ${subjectValidation.value} ${yearValidation.value}학기 ${termValidation.value}차 성적이 ${scoreValidation.value}점으로 등록되었습니다.`;
    await createNotificationWithBackup({
      studentId: new mongoose.Types.ObjectId(studentId),
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
    await createNotificationWithBackup({
      studentId: new mongoose.Types.ObjectId(studentId),
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
    await upsertBackupRecord(GradeBackup, 'serviceGradeId', grade);

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
      { student: convertToObjectId(studentId), date: normalizedDate },
      { status: statusValidation.value, date: normalizedDate },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    await upsertBackupRecord(AttendanceBackup, 'serviceAttendanceId', attendance);

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

// Counseling / 상담 관리
stdRouter.post("/:studentId/counselings", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { teacherName, date, time } = req.body;

    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }

    const teacherNameValidation = validateString(teacherName || '', 2, 100);
    if (!teacherNameValidation.valid) {
      return res.status(400).json({ message: `Teacher name: ${teacherNameValidation.error}` });
    }

    const dateValidation = validateDate(date);
    if (!dateValidation.valid) {
      return res.status(400).json({ message: dateValidation.error });
    }

    const timeValidation = validateString(time || '', 1, 10);
    if (!timeValidation.valid) {
      return res.status(400).json({ message: `Time: ${timeValidation.error}` });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const year = dateValidation.value.getFullYear();
    const month = String(dateValidation.value.getMonth() + 1).padStart(2, '0');
    const day = String(dateValidation.value.getDate()).padStart(2, '0');
    const dateTime = new Date(`${year}-${month}-${day}T${timeValidation.value}:00`);
    if (Number.isNaN(dateTime.getTime())) {
      return res.status(400).json({ message: 'Invalid date/time combination' });
    }

    const counseling = await Counseling.create({
      studentId: convertToObjectId(studentId),
      studentName: student.name,
      teacherName: teacherNameValidation.value,
      dateTime,
      status: 'pending'
    });
    await upsertBackupRecord(CounselingBackup, 'serviceCounselingId', counseling);

    const notificationMessage = `${student.name} 학생이 ${dateValidation.value.toLocaleDateString('ko-KR')} ${timeValidation.value} 상담을 신청했습니다.`;
    await createNotificationWithBackup({
      studentId: convertToObjectId(studentId),
      recipientType: 'student',
      recipientName: student.name,
      message: notificationMessage,
      type: 'counseling',
      relatedData: { counselingId: counseling._id }
    });
    await createNotificationWithBackup({
      studentId: convertToObjectId(studentId),
      recipientType: 'parent',
      message: notificationMessage,
      type: 'counseling',
      relatedData: { counselingId: counseling._id }
    });

    res.status(201).json({ message: 'Counseling request created', counseling });
  } catch (err) {
    console.error('Error creating counseling request:', err);
    res.status(400).json({ message: err.message || 'Failed to create counseling request' });
  }
});

stdRouter.get("/teacher/counselings", async (req, res) => {
  try {
    const counselings = await Counseling.find({}).sort({ dateTime: 1 });
    res.status(200).json(counselings);
  } catch (err) {
    console.error('Error fetching teacher counselings:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch counseling requests' });
  }
});

stdRouter.get("/:studentId/counselings", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Valid Student ID is required' });
    }

    const counselings = await Counseling.find({ studentId: convertToObjectId(studentId) }).sort({ dateTime: 1 });
    res.status(200).json(counselings);
  } catch (err) {
    console.error('Error fetching counselings:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch counseling requests' });
  }
});

stdRouter.put("/counselings/:counselingId/status", async (req, res) => {
  try {
    const { counselingId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!counselingId || !isValidObjectId(counselingId)) {
      return res.status(400).json({ message: 'Valid counseling ID is required' });
    }

    const statusValidation = validateEnum(status, ['accepted', 'rejected']);
    if (!statusValidation.valid) {
      return res.status(400).json({ message: statusValidation.error });
    }

    const counseling = await Counseling.findById(counselingId);
    if (!counseling) {
      return res.status(404).json({ message: 'Counseling request not found' });
    }

    counseling.status = statusValidation.value;
    counseling.rejectionReason = statusValidation.value === 'rejected' ? (rejectionReason ? rejectionReason.toString().trim() : '') : '';
    await counseling.save();
    await upsertBackupRecord(CounselingBackup, 'serviceCounselingId', counseling);

    const notificationMessage = statusValidation.value === 'accepted'
      ? `${counseling.studentName} 학생의 상담이 ${new Date(counseling.dateTime).toLocaleDateString('ko-KR')} ${new Date(counseling.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 확정되었습니다.`
      : `${counseling.studentName} 학생의 상담 신청이 반려되었습니다. 사유: ${counseling.rejectionReason}`;

    await createNotificationWithBackup({
      studentId: counseling.studentId,
      recipientType: 'student',
      recipientName: counseling.studentName,
      message: notificationMessage,
      type: 'counseling',
      relatedData: { counselingId: counseling._id }
    });
    await createNotificationWithBackup({
      studentId: counseling.studentId,
      recipientType: 'parent',
      message: notificationMessage,
      type: 'counseling',
      relatedData: { counselingId: counseling._id }
    });

    res.status(200).json({ message: 'Counseling status updated', counseling });
  } catch (err) {
    console.error('Error updating counseling status:', err);
    res.status(400).json({ message: err.message || 'Failed to update counseling status' });
  }
});

stdRouter.put("/counselings/:counselingId/notes", async (req, res) => {
  try {
    const { counselingId } = req.params;
    const { teacherNotes } = req.body;

    if (!counselingId || !isValidObjectId(counselingId)) {
      return res.status(400).json({ message: 'Valid counseling ID is required' });
    }

    const notesValidation = validateString(teacherNotes || '', 0, 2000);
    if (!notesValidation.valid) {
      return res.status(400).json({ message: `Teacher notes: ${notesValidation.error}` });
    }

    const counseling = await Counseling.findById(counselingId);
    if (!counseling) {
      return res.status(404).json({ message: 'Counseling request not found' });
    }

    // Only allow updating notes if counseling is accepted
    if (counseling.status !== 'accepted') {
      return res.status(400).json({ message: 'Counseling notes can only be updated for accepted counseling requests' });
    }

    counseling.teacherNotes = notesValidation.value;
    await counseling.save();
    await upsertBackupRecord(CounselingBackup, 'serviceCounselingId', counseling);

    const notificationMessage = `${counseling.studentName} 학생의 상담 내용이 교사에 의해 업데이트되었습니다.`;
    await createNotificationWithBackup({
      studentId: counseling.studentId,
      recipientType: 'student',
      recipientName: counseling.studentName,
      message: notificationMessage,
      type: 'counseling',
      relatedData: { counselingId: counseling._id }
    });
    await createNotificationWithBackup({
      studentId: counseling.studentId,
      recipientType: 'parent',
      message: notificationMessage,
      type: 'counseling',
      relatedData: { counselingId: counseling._id }
    });

    res.status(200).json({ message: 'Counseling notes updated', counseling });
  } catch (err) {
    console.error('Error updating counseling notes:', err);
    res.status(400).json({ message: err.message || 'Failed to update counseling notes' });
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
    await upsertBackupRecord(SubjectBackup, 'serviceSubjectId', subject);
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
    await removeBackupRecord(SubjectBackup, 'serviceSubjectId', subject._id);
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

stdRouter.post("/auth/kakao", async (req, res) => {
  try {
    const { kakaoId, username, email, profileImage, userType, studentId } = req.body;

    const kakaoIdValidation = validateString(kakaoId || '', 1, 200);
    if (!kakaoIdValidation.valid) {
      return res.status(400).json({ message: `Kakao ID: ${kakaoIdValidation.error}` });
    }

    const usernameValidation = validateString(username || '', 1, 100);
    if (!usernameValidation.valid) {
      return res.status(400).json({ message: `Username: ${usernameValidation.error}` });
    }

    const userTypeValidation = validateEnum(userType, ['student', 'teacher', 'parent', 'admin']);
    if (!userTypeValidation.valid) {
      return res.status(400).json({ message: userTypeValidation.error });
    }

    const existingAdmin = await User.findOne({ $or: [{ isAdmin: true }, { userType: 'admin' }] });
    const isAdminRequest = userTypeValidation.value === 'admin';
    if (isAdminRequest && existingAdmin && String(existingAdmin.kakaoId) !== String(kakaoIdValidation.value)) {
      return res.status(403).json({ message: '관리자 계정은 이미 등록되어 있습니다.' });
    }

    let validatedStudentId = null;
    let linkedStudent = null;
    if (userTypeValidation.value === 'parent') {
      if (!studentId || !isValidObjectId(studentId)) {
        return res.status(400).json({ message: 'Student ID is required for parent users' });
      }
      validatedStudentId = convertToObjectId(studentId);
      linkedStudent = await Student.findById(validatedStudentId);
      if (!linkedStudent) {
        return res.status(404).json({ message: 'Student not found' });
      }
    }

    const emailValidation = email ? validateString(email, 5, 200) : { valid: true, value: '' };
    if (!emailValidation.valid) {
      return res.status(400).json({ message: `Email: ${emailValidation.error}` });
    }

    const profileImageValidation = profileImage ? validateString(profileImage, 1, 1000) : { valid: true, value: '' };
    if (!profileImageValidation.valid) {
      return res.status(400).json({ message: `Profile image: ${profileImageValidation.error}` });
    }

    if (userTypeValidation.value === 'student') {
      if (studentId && isValidObjectId(studentId)) {
        validatedStudentId = convertToObjectId(studentId);
        linkedStudent = await Student.findById(validatedStudentId);
        if (!linkedStudent) {
          return res.status(404).json({ message: 'Student not found' });
        }
        if (!linkedStudent.kakaoId) {
          linkedStudent.kakaoId = kakaoIdValidation.value;
          await linkedStudent.save();
        } else if (String(linkedStudent.kakaoId) !== String(kakaoIdValidation.value)) {
          return res.status(403).json({ message: 'Student Kakao account not linked or does not match the provided Kakao ID' });
        }
      } else {
        linkedStudent = await Student.findOne({ kakaoId: kakaoIdValidation.value });
        if (!linkedStudent) {
          const pendingApplication = await StudentApplication.findOne({ kakaoId: kakaoIdValidation.value, status: 'pending' });
          if (pendingApplication) {
            return res.status(403).json({ message: 'Student registration application is still pending approval' });
          }
          return res.status(403).json({ message: 'Student Kakao account is not linked to an approved student record' });
        }
        validatedStudentId = linkedStudent._id;
      }
    }

    if (userTypeValidation.value === 'parent') {
      const parentEmail = emailValidation.value;
      const parentMatch = Array.isArray(linkedStudent.parents) && linkedStudent.parents.find(p => {
        if (p.kakaoId && String(p.kakaoId) === String(kakaoIdValidation.value)) {
          return true;
        }
        if (parentEmail && p.email && String(p.email).toLowerCase() === String(parentEmail).toLowerCase()) {
          return true;
        }
        return false;
      });

      if (!parentMatch) {
        return res.status(403).json({ message: 'Provided Kakao account is not registered as a parent for this student' });
      }

      if (!parentMatch.kakaoId && parentEmail && parentMatch.email && String(parentMatch.email).toLowerCase() === String(parentEmail).toLowerCase()) {
        parentMatch.kakaoId = kakaoIdValidation.value;
        await linkedStudent.save();
      } else if (parentMatch.kakaoId && String(parentMatch.kakaoId) !== String(kakaoIdValidation.value)) {
        return res.status(403).json({ message: 'Provided Kakao ID does not match the registered parent account' });
      }
    }

    const shouldAssignAdmin = !existingAdmin;
    let user = await User.findOne({ kakaoId: kakaoIdValidation.value });
    if (!user) {
      user = await User.create({
        kakaoId: kakaoIdValidation.value,
        username: usernameValidation.value,
        email: emailValidation.value || undefined,
        profileImage: profileImageValidation.value || undefined,
        userType: userTypeValidation.value,
        isAdmin: shouldAssignAdmin || isAdminRequest,
        studentId: validatedStudentId,
        lastLoginAt: new Date(),
      });
      await upsertBackupRecord(UserBackup, 'serviceUserId', user);
    } else {
      if (user.userType !== userTypeValidation.value && !user.isAdmin) {
        if (!(userTypeValidation.value === 'admin' && !existingAdmin)) {
          return res.status(403).json({ message: '이미 다른 유형으로 등록된 카카오 계정입니다.' });
        }
      }
      user.username = usernameValidation.value;
      user.email = emailValidation.value || user.email;
      user.profileImage = profileImageValidation.value || user.profileImage;
      user.userType = userTypeValidation.value;
      if (!user.isAdmin && shouldAssignAdmin) {
        user.isAdmin = true;
      }
      user.studentId = validatedStudentId || user.studentId;
      user.lastLoginAt = new Date();
      await user.save();
      await upsertBackupRecord(UserBackup, 'serviceUserId', user);
    }

    const userData = {
      username: user.username,
      userType: user.userType,
      studentId: user.studentId,
      email: user.email,
      profileImage: user.profileImage,
      isAdmin: user.isAdmin || false,
    };

    // If user is student or parent and has linked studentId, return studentName as username for compatibility
    if ((user.userType === 'student' || user.userType === 'parent') && user.studentId) {
      try {
        const linkedStudent = await Student.findById(user.studentId);
        if (linkedStudent) {
          userData.username = linkedStudent.name;
          userData.studentName = linkedStudent.name;
        }
      } catch (e) {
        console.error('Error fetching linked student for kakao auth response:', e);
      }
    }

    res.status(200).json({ message: 'Kakao login successful', user: userData });
  } catch (err) {
    console.error('Kakao login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

stdRouter.get('/admin/exists', async (req, res) => {
  try {
    const adminExists = await User.exists({ $or: [{ isAdmin: true }, { userType: 'admin' }] });
    res.status(200).json({ exists: !!adminExists });
  } catch (err) {
    console.error('Admin exists check failed:', err);
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
      validatedStudentId = studentId ? convertToObjectId(studentId) : null;
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
    await upsertBackupRecord(UserBackup, 'serviceUserId', newUser);
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

    let filter = { studentId: convertToObjectId(studentId) };
    
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
          studentId: convertToObjectId(studentId),
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
      studentId: convertToObjectId(studentId),
      teacherName: teacherNameValidation.value,
      academicPerformance: academicPerformance ? String(academicPerformance).trim() : '',
      attendance: attendance ? String(attendance).trim() : '',
      behavior: behavior ? String(behavior).trim() : '',
      attitude: attitude ? String(attitude).trim() : '',
      additionalComments: additionalComments ? String(additionalComments).trim() : '',
      shareWithTeachers: !!shareWithTeachers
    });

    const newFeedback = await feedback.save();
    await upsertBackupRecord(FeedbackBackup, 'serviceFeedbackId', newFeedback);

    const notificationMessage = `${student.name} 학생에 대한 새로운 피드백이 등록되었습니다.`;
    await createNotificationWithBackup({
      studentId: convertToObjectId(studentId),
      recipientType: 'student',
      recipientName: student.name,
      message: notificationMessage,
      type: 'feedback',
      relatedData: { teacherName: teacherNameValidation.value, feedbackId: newFeedback._id }
    });
    await createNotificationWithBackup({
      studentId: convertToObjectId(studentId),
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

    const validation = validateAndBuildNotificationFilter(viewerType, viewerName, studentId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const notifications = await Notification.find(validation.filter).sort({ createdAt: -1 });
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

    const validation = validateAndBuildNotificationFilter(viewerType, viewerName, studentId);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    await Notification.updateMany(validation.filter, { read: true });
    const updatedNotifications = await Notification.find(validation.filter);
    await backupMultipleNotifications(updatedNotifications);
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

stdRouter.get("/:studentId/reports/:reportType", async (req, res) => {
  try {
    const { studentId, reportType } = req.params;
    const format = String(req.query.format || 'xlsx').toLowerCase();

    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Valid student ID is required' });
    }

    const allowedReports = {
      'grade-analysis': '성적 분석',
      'counseling-history': '상담 내역',
      'feedback-summary': '피드백 요약'
    };

    const reportLabel = allowedReports[reportType];
    if (!reportLabel) {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    if (format !== 'xlsx') {
      return res.status(400).json({ message: 'Invalid format; must be xlsx' });
    }

    const reportData = await buildStudentReportData(convertToObjectId(studentId));
    if (!reportData) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const filename = `${reportData.student.name}-${reportLabel}.${format}`.replace(/\s+/g, '_');

    return await generateExcelStudentReport(res, reportData, reportLabel, filename);
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ message: err.message || 'Failed to generate report' });
  }
});

// Delete user by ID
stdRouter.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const validatedUserId = convertToObjectId(userId);
    const user = await User.findById(validatedUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(validatedUserId);
    await removeBackupRecord(UserBackup, 'serviceUserId', validatedUserId);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: err.message || 'Failed to delete user' });
  }
});

module.exports = stdRouter;