const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  term: {
    type: Number,
    enum: [1, 2],
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
}, {
  timestamps: true,
});

gradeSchema.index({ student: 1, subject: 1, year: 1, term: 1 }, { unique: true });

module.exports = mongoose.model("Grade", gradeSchema);
