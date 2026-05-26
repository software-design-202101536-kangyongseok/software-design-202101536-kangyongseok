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
const Counseling = require("../models/counseling");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

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

const buildStudentReportData = async (studentId) => {
  const student = await Student.findById(studentId);
  if (!student) return null;

  const grades = await Grade.find({ student: student._id }).sort({ year: -1, term: 1, subject: 1 });
  const counselings = await Counseling.find({ studentId: student._id }).sort({ dateTime: 1 });
  const feedbacks = await Feedback.find({ studentId: student._id }).sort({ createdAt: -1 });

  return { student, grades, counselings, feedbacks };
};

const generatePdfStudentReport = (res, reportData, reportLabel, filename) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  const safeFilename = String(filename).replace(/["]+/g, '_').replace(/[\r\n]+/g, '_');
  const asciiFilename = safeFilename.replace(/[^\x20-\x7E]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
  // Try to load a Korean-capable TTF font from common system locations so PDF text isn't garbled
  const tryFonts = () => {
    const candidates = [];
    const localFontPath = path.join(__dirname, 'fonts', 'NotoSansKR-Regular.otf');
    if (fs.existsSync(localFontPath)) {
      return localFontPath;
    }
    if (process.env.PDF_FONT_PATH) candidates.push(process.env.PDF_FONT_PATH);
    if (process.platform === 'win32') {
      candidates.push('C:\\Windows\\Fonts\\malgun.ttf');
      candidates.push('C:\\Windows\\Fonts\\malgunbd.ttf');
      candidates.push('C:\\Windows\\Fonts\\Batang.ttf');
      candidates.push('C:\\Windows\\Fonts\\UnBatang.ttf');
    } else if (process.platform === 'darwin') {
      candidates.push('/System/Library/Fonts/AppleGothic.ttf');
      candidates.push('/Library/Fonts/AppleGothic.ttf');
      candidates.push('/Library/Fonts/NotoSansKR-Regular.otf');
    } else {
      candidates.push('/usr/share/fonts');
      candidates.push('/usr/local/share/fonts');
    }

    const fontFiles = [];
    const addFontFile = (p) => {
      try {
        const stat = fs.statSync(p);
        if (stat.isFile() && /\.(ttf|otf)$/i.test(p)) {
          fontFiles.push(p);
        } else if (stat.isDirectory()) {
          for (const entry of fs.readdirSync(p)) {
            addFontFile(path.join(p, entry));
          }
        }
      } catch (e) {
        // ignore missing paths or permission issues
      }
    };

    const preferredPatterns = [
      /nanum/i,
      /notosanskr/i,
      /notosanscjk/i,
      /malgun/i,
      /batang/i,
      /unbatang/i,
    ];

    for (const candidate of candidates) {
      addFontFile(candidate);
    }

    for (const pattern of preferredPatterns) {
      const match = fontFiles.find((file) => pattern.test(path.basename(file)));
      if (match) return match;
    }

    return fontFiles.length ? fontFiles[0] : null;
  };

  const fontPath = tryFonts();
  if (fontPath) {
    try {
      // register font under a stable name and use it
      try {
        doc.registerFont('BaseCJK', fontPath);
        doc.font('BaseCJK');
      } catch (regErr) {
        // fallback to direct path if registerFont fails
        doc.font(fontPath);
      }
      console.log('Using PDF font:', fontPath);
    } catch (e) {
      console.warn('Failed to load font for PDF:', e.message || e);
    }
  } else {
    console.warn('No CJK font found for PDF generation; Korean text may be garbled. Set PDF_FONT_PATH to a TTF/OTF file to fix.');
  }

  doc.pipe(res);

  doc.fontSize(18).text(`${reportData.student.name} 학생 ${reportLabel} 보고서`, { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`생년월일: ${new Date(reportData.student.birthDate).toLocaleDateString('ko-KR')}`);
  doc.text(`성별: ${reportData.student.gender === 'male' ? '남성' : '여성'}`);
  doc.text(`작성일: ${new Date().toLocaleString('ko-KR')}`);
  doc.moveDown();

  if (reportLabel === '성적 분석') {
    const summary = getGradeSummary(reportData.grades);
    doc.fontSize(14).text('성적 요약');
    doc.moveDown(0.5);
    doc.fontSize(12).text(`전체 과목 수: ${reportData.grades.length}`);
    doc.text(`평균 점수: ${summary.overallAverage}`);
    doc.moveDown(0.5);
    if (summary.subjectAverages.length) {
      summary.subjectAverages.forEach((item) => {
        doc.text(`- ${item.subject}: ${item.average}`);
      });
    } else {
      doc.text('등록된 성적이 없습니다.');
    }
    doc.moveDown();
    doc.fontSize(14).text('상세 성적 목록');
    doc.moveDown(0.5);
    reportData.grades.forEach((grade) => {
      doc.text(`${grade.year} Term ${grade.term} | ${grade.subject} | 점수: ${grade.score}`);
    });
  } else if (reportLabel === '상담 내역') {
    doc.fontSize(14).text('상담 내역');
    doc.moveDown(0.5);
    if (!reportData.counselings.length) {
      doc.text('등록된 상담 내역이 없습니다.');
    }
    reportData.counselings.forEach((counseling) => {
      doc.text(`- ${formatKoreanDateTime(counseling.dateTime)} | 상태: ${counseling.status} | 교사: ${counseling.teacherName}`);
      if (counseling.studentNote) doc.text(`  학생 메모: ${counseling.studentNote}`);
      if (counseling.teacherNotes) doc.text(`  교사 메모: ${counseling.teacherNotes}`);
      if (counseling.rejectionReason) doc.text(`  거절 사유: ${counseling.rejectionReason}`);
      doc.moveDown(0.5);
    });
  } else if (reportLabel === '피드백 요약') {
    doc.fontSize(14).text('피드백 요약');
    doc.moveDown(0.5);
    if (!reportData.feedbacks.length) {
      doc.text('등록된 피드백이 없습니다.');
    }
    reportData.feedbacks.forEach((feedback, index) => {
      doc.text(`${index + 1}. 작성일: ${formatKoreanDateTime(feedback.createdAt)} | 교사: ${feedback.teacherName}`);
      if (feedback.academicPerformance) doc.text(`  학업 성과: ${feedback.academicPerformance}`);
      if (feedback.attendance) doc.text(`  출결: ${feedback.attendance}`);
      if (feedback.behavior) doc.text(`  행동: ${feedback.behavior}`);
      if (feedback.attitude) doc.text(`  태도: ${feedback.attitude}`);
      if (feedback.additionalComments) doc.text(`  추가 의견: ${feedback.additionalComments}`);
      doc.text(`  공유 여부: ${feedback.shareWithTeachers ? '공유' : '비공유'}`);
      doc.moveDown(0.5);
    });
  }

  doc.end();
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
    sheet.columns = [
      { header: '과목', key: 'subject', width: 18 },
      { header: '학기', key: 'term', width: 14 },
      { header: '점수', key: 'score', width: 10 }
    ];
    reportData.grades.forEach((grade) => {
      sheet.addRow({ subject: grade.subject, term: `${grade.year} Term ${grade.term}`, score: grade.score });
    });
  } else if (reportLabel === '상담 내역') {
    sheet.columns = [
      { header: '상담 일시', key: 'dateTime', width: 24 },
      { header: '상태', key: 'status', width: 12 },
      { header: '교사', key: 'teacher', width: 16 },
      { header: '학생 메모', key: 'studentNote', width: 30 },
      { header: '교사 메모', key: 'teacherNotes', width: 30 },
      { header: '거절 사유', key: 'rejectionReason', width: 30 }
    ];
    reportData.counselings.forEach((counseling) => {
      sheet.addRow({
        dateTime: formatKoreanDateTime(counseling.dateTime),
        status: counseling.status,
        teacher: counseling.teacherName,
        studentNote: counseling.studentNote || '',
        teacherNotes: counseling.teacherNotes || '',
        rejectionReason: counseling.rejectionReason || ''
      });
    });
  } else if (reportLabel === '피드백 요약') {
    sheet.columns = [
      { header: '작성일', key: 'createdAt', width: 24 },
      { header: '교사', key: 'teacherName', width: 16 },
      { header: '학업 성과', key: 'academicPerformance', width: 24 },
      { header: '출결', key: 'attendance', width: 20 },
      { header: '행동', key: 'behavior', width: 20 },
      { header: '태도', key: 'attitude', width: 20 },
      { header: '추가 의견', key: 'additionalComments', width: 30 },
      { header: '공유 여부', key: 'shareWithTeachers', width: 14 }
    ];
    reportData.feedbacks.forEach((feedback) => {
      sheet.addRow({
        createdAt: formatKoreanDateTime(feedback.createdAt),
        teacherName: feedback.teacherName,
        academicPerformance: feedback.academicPerformance || '',
        attendance: feedback.attendance || '',
        behavior: feedback.behavior || '',
        attitude: feedback.attitude || '',
        additionalComments: feedback.additionalComments || '',
        shareWithTeachers: feedback.shareWithTeachers ? '공유' : '비공유'
      });
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
    await Notification.create({
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
    await Notification.create({
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
    const { teacherName, date, time, studentNote } = req.body;

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
      studentNote: studentNote ? String(studentNote).trim() : '',
      status: 'pending'
    });

    const notificationMessage = `${student.name} 학생이 ${dateValidation.value.toLocaleDateString('ko-KR')} ${timeValidation.value} 상담을 신청했습니다.`;
    await Notification.create({
      studentId: convertToObjectId(studentId),
      recipientType: 'student',
      recipientName: student.name,
      message: notificationMessage,
      type: 'counseling',
      relatedData: { counselingId: counseling._id }
    });
    await Notification.create({
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

    const notificationMessage = statusValidation.value === 'accepted'
      ? `${counseling.studentName} 학생의 상담이 ${new Date(counseling.dateTime).toLocaleDateString('ko-KR')} ${new Date(counseling.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 확정되었습니다.`
      : `${counseling.studentName} 학생의 상담 신청이 반려되었습니다. 사유: ${counseling.rejectionReason}`;

    await Notification.create({
      studentId: counseling.studentId,
      recipientType: 'student',
      recipientName: counseling.studentName,
      message: notificationMessage,
      type: 'counseling',
      relatedData: { counselingId: counseling._id }
    });
    await Notification.create({
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

    counseling.teacherNotes = notesValidation.value;
    await counseling.save();

    const notificationMessage = `${counseling.studentName} 학생의 상담 내용이 교사에 의해 업데이트되었습니다.`;
    await Notification.create({
      studentId: counseling.studentId,
      recipientType: 'student',
      recipientName: counseling.studentName,
      message: notificationMessage,
      type: 'counseling',
      relatedData: { counselingId: counseling._id }
    });
    await Notification.create({
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

    const notificationMessage = `${student.name} 학생에 대한 새로운 피드백이 등록되었습니다.`;
    await Notification.create({
      studentId: convertToObjectId(studentId),
      recipientType: 'student',
      recipientName: student.name,
      message: notificationMessage,
      type: 'feedback',
      relatedData: { teacherName: teacherNameValidation.value, feedbackId: newFeedback._id }
    });
    await Notification.create({
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
    const format = String(req.query.format || 'pdf').toLowerCase();

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

    if (!['pdf', 'xlsx'].includes(format)) {
      return res.status(400).json({ message: 'Invalid format; must be pdf or xlsx' });
    }

    const reportData = await buildStudentReportData(convertToObjectId(studentId));
    if (!reportData) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const filename = `${reportData.student.name}-${reportLabel}.${format}`.replace(/\s+/g, '_');

    if (format === 'pdf') {
      return generatePdfStudentReport(res, reportData, reportLabel, filename);
    }

    return await generateExcelStudentReport(res, reportData, reportLabel, filename);
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ message: err.message || 'Failed to generate report' });
  }
});

module.exports = stdRouter;