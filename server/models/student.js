const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  birthDate: {
    type: Date,
    required: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true,
  },
  subject: {
    type: [String],
    required: true,
  },
  bio: String,
  // Optional Kakao ID for the student (to link Kakao account to student)
  kakaoId: {
    type: String,
    unique: true,
    sparse: true,
  },
  // Parents info: used to verify parent logins
  parents: [
    {
      name: String,
      kakaoId: { type: String },
      email: { type: String }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

module.exports = mongoose.model("Student", studentSchema);