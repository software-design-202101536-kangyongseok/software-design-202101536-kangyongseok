const mongoose = require('mongoose');

const gradeBackupSchema = new mongoose.Schema({
  serviceGradeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
  originalCreatedAt: {
    type: Date,
  },
  originalUpdatedAt: {
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
  },
});

gradeBackupSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('GradeBackup', gradeBackupSchema);
