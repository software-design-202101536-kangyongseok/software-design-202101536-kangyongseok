const mongoose = require('mongoose');

const subjectBackupSchema = new mongoose.Schema({
  serviceSubjectId: {
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

subjectBackupSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('SubjectBackup', subjectBackupSchema);
