const mongoose = require('mongoose');

const studentApplicationSchema = new mongoose.Schema({
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
  kakaoId: {
    type: String,
    required: true,
  },
  email: String,
  profileImage: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  rejectionReason: String,
  reviewedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

studentApplicationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('StudentApplication', studentApplicationSchema);
