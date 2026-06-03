const mongoose = require('mongoose');

const notificationBackupSchema = new mongoose.Schema({
  serviceNotificationId: {
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

notificationBackupSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('NotificationBackup', notificationBackupSchema);
