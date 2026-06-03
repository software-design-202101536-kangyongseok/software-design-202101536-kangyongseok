const mongoose = require('mongoose');

const studentBackupSchema = new mongoose.Schema({
  serviceStudentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  birthDate: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
  },
  subject: {
    type: [String],
  },
  bio: String,
  kakaoId: {
    type: String,
  },
  parents: [
    {
      name: String,
      kakaoId: String,
      email: String,
    }
  ],
  originalCreatedAt: {
    type: Date,
  },
  backupCreatedAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

studentBackupSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('StudentBackup', studentBackupSchema);
