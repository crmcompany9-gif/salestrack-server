const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  phone:        { type: String, required: true, unique: true, trim: true },
  city:         { type: String, trim: true },
  assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:       {
    type: String,
    enum: ['interested', 'not-interested', 'callback', 'no-answer'],
    default: 'no-answer'
  },
  lastContact:  { type: Date },
  nextFollowUp: { type: Date },
  totalCalls:   { type: Number, default: 0 },
  sentToERP:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
