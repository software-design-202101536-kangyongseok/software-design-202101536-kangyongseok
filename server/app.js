require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoURI = process.env.MONGODB_URL;
const stdRouter = require("./routes/stdRoute");
const path = require("path");

// 미들웨어 설정 (순서 중요!)
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB 연결
mongoose
  .connect(mongoURI)
  .then(async () => {
    console.log("MongoDB connected");
    // Initialize default subjects
    const Subject = require("./models/subject");
    const defaultSubjects = ['국어', '영어', '수학', '사회', '과학'];
    for (const subj of defaultSubjects) {
      const exists = await Subject.findOne({ name: subj });
      if (!exists) {
        await Subject.create({ name: subj });
        console.log(`Added default subject: ${subj}`);
      }
    }
  })
  .catch((err) => console.log("MongoDB connection error:", err));

// 라우트 설정 (정적 파일보다 먼저!)
app.use("/students", stdRouter);

// 정적 파일 설정 (마지막에 - catch-all)
const publicPath = path.resolve(__dirname, "public");
app.use("/", express.static(publicPath));

// 서버 시작
if (process.env.NODE_ENV !== 'test') {
  app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });
}

module.exports = app;