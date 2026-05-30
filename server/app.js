require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const os = require('os');
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoURI = process.env.MONGODB_URL;
if (!mongoURI) {
  console.error("MONGODB_URL 환경변수가 설정되어 있지 않습니다. MongoDB Atlas 연결 문자열을 설정하세요.");
}
const stdRouter = require("./routes/stdRoute");
const path = require("path");

// 미들웨어 설정 (순서 중요!)
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB 연결: 즉시 실패하도록 버퍼링 비활성화 및 재시도 로직 추가
mongoose.set('bufferCommands', false);

const connectWithRetry = async (attempts = 5, delay = 2000) => {
  try {
    await mongoose.connect(mongoURI);
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
  } catch (err) {
    console.log("MongoDB connection error:", err);
    if (attempts > 0) {
      console.log(`Retrying MongoDB connection in ${delay}ms... (${attempts - 1} attempts left)`);
      setTimeout(() => connectWithRetry(attempts - 1, Math.min(delay * 2, 60000)), delay);
    } else {
      console.error('MongoDB connection failed after multiple attempts.');
    }
  }
};

if (mongoURI) connectWithRetry();

// Mask sensitive parts of Mongo URI for logging
const maskMongoUri = (uri) => {
  try {
    if (!uri) return null;
    // If contains credentials like user:pass@host
    const atIndex = uri.indexOf('@');
    if (atIndex === -1) return uri.replace(/(mongodb\+srv:\/\/)/i, '$1****@');
    const left = uri.substring(0, atIndex);
    const right = uri.substring(atIndex + 1);
    const protocolSplit = left.split('//');
    if (protocolSplit.length === 2) {
      const creds = protocolSplit[1].split(':');
      const user = creds[0] || 'user';
      return `${protocolSplit[0]}//${user}:****@${right}`;
    }
    return `****@${right}`;
  } catch (e) {
    return 'masked';
  }
};

console.log('MONGODB_URL set in env?:', !!mongoURI);
console.log('Using MONGODB_URL:', maskMongoUri(mongoURI));

// health endpoint for quick checks
app.get('/health', (req, res) => {
  res.json({
    hostname: os.hostname(),
    envMongoDefined: !!process.env.MONGODB_URL,
    mongoReadyState: mongoose.connection.readyState
  });
});

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