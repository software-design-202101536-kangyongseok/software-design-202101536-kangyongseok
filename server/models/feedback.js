const mongoose = require('mongoose')

const feedbackSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  academicPerformance: String,
  attendance: String,
  behavior: String,
  attitude: String,
  additionalComments: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Feedback', feedbackSchema)
