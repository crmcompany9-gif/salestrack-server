const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  employee:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client:        { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  callType:      { type: String, enum: ['cold', 'followup'], required: true },
  outcome:       {
    type: String,
    enum: ['interested', 'not-interested', 'callback', 'no-answer'],
    required: true
  },
  duration:      { type: Number, default: 0 }, // minutes
  notes:         { type: String, trim: true },
  recordingLink: { type: String, trim: true },
  callDate:      { type: Date, default: Date.now },
    nextFollowUp:   { type: Date },
  amountQuoted:   { type: Number, default: 0 }, // amount discussed with client
  amountCollected:{ type: Number, default: 0 }, // amount received from client
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
