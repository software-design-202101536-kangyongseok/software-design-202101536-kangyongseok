const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['teacher', 'student', 'parent'],
    required: true,
  },
  // 학생이나 학부모의 경우 연결된 학생 ID
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: function() {
      return this.userType === 'student' || this.userType === 'parent';
    }
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("User", userSchema);