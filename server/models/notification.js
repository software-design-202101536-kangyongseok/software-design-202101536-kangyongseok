const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  recipientType: {
    type: String,
    enum: ['student', 'parent'],
    required: true,
  },
  recipientName: {
    type: String,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'info',
  },
  relatedData: {
    type: mongoose.Schema.Types.Mixed,
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
