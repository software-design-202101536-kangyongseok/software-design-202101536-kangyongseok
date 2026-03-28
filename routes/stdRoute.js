const express = require("express");
const stdRouter = express.Router();
const Student = require("../models/student");
const Grade = require("../models/grade");
const Attendance = require("../models/attendance");

stdRouter.get("/", async (req, res) => {
  console.log(req.query.name);
  const student = await Student.findOne({ name: req.query.name });
  if (!student) {
    return res.status(404).render("index", { error: "Student not found" });
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
    age: student.age,
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
  res.status(200).render("index", data);
});

stdRouter.post("/", async (req, res) => {
  console.log(req.body);
  const { name, age, subject, bio } = req.body;
  const existingStudent = await Student.exists({ name });
  if (existingStudent) {
    return res.status(400).json({ message: "Student already exists" });
  } else {
    const student = new Student({
      name,
      age,
      subject,
      bio,
    });
    try {
      const newStudent = await student.save();
      // res.status(201).json(newStudent);
      res.setHeader("Content-Type", "text/html");
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>New Student Created</title>
        </head>
        <body>
          <h1>New Student Created</h1>
          <p>Name: ${newStudent.name}</p>
          <p>Age: ${newStudent.age}</p>
          <p>Subject: ${newStudent.subject}</p>
          <p>Bio: ${newStudent.bio}</p>
        </body>
        </html>
      `);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
});

stdRouter.put("/", async (req, res) => {
  const { name, age, subject, bio } = req.body;
  console.log(subject);
  try {
    const student = await Student.findOneAndUpdate(
      { name: name },
      { age: age, subject: subject, bio: bio },
      { new: true }
    );
    if (student) {
      res.status(200).json(student);
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

stdRouter.delete("/", async (req, res) => {
  const { name } = req.body;
  try {
    const result = await Student.findOneAndDelete({ name: name });
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

stdRouter.post("/grades", async (req, res) => {
  const { studentId, subject, score, year, term, studentName } = req.body;

  try {
    await Grade.findOneAndUpdate(
      { student: studentId, subject, year: Number(year), term },
      { student: studentId, subject, year: Number(year), term, score: Number(score) },
      { new: true, upsert: true }
    );

    res.redirect(`/students?name=${studentName}`);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

stdRouter.post("/attendances", async (req, res) => {
  const { studentId, date, status, studentName } = req.body;
  try {
    // 날짜 중복을 확인하고, 이미 존재하면 상태만 업데이트
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    await Attendance.findOneAndUpdate(
      { student: studentId, date: normalizedDate },
      { status: status, date: normalizedDate },
      { new: true, upsert: true }
    );

    res.redirect(`/students?name=${studentName}`);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

module.exports = stdRouter;