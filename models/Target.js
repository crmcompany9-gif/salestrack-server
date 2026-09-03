const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema({
  employee:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month:            { type: Number, required: true }, // 1-12
  year:             { type: Number, required: true },
  callTarget:       { type: Number, default: 200 },
  conversionTarget: { type: Number, default: 60 },
}, { timestamps: true });

// One target per employee per month
targetSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Target', targetSchema);
