const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // 카카오 사용자 ID (고유값)
  kakaoId: {
    type: String,
    required: true,
    unique: true,
  },
  // 사용자명 (카카오에서 제공하는 닉네임)
  username: {
    type: String,
    required: true,
  },
  // 사용자 이메일 (카카오에서 제공하는 이메일, 동의 시)
  email: {
    type: String,
  },
  // 프로필 이미지 URL (카카오에서 제공)
  profileImage: {
    type: String,
  },
  // 사용자 유형
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
  // 마지막 로그인 시간
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("User", userSchema);