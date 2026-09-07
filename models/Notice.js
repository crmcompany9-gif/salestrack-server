const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  message:  { type: String, required: true, trim: true },
  type:     {
    type: String,
    enum: ['general', 'holiday', 'target', 'urgent'],
    default: 'general'
  },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  postedByName: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
