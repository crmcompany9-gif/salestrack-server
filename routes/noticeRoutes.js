const express = require('express');
const Notice  = require('../models/Notice');
const { protect, managerOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/notices — all notices, newest first
router.get('/', protect, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 }).limit(20);
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/notices — manager only
router.post('/', protect, managerOnly, async (req, res) => {
  const { title, message, type } = req.body;
  try {
    const notice = await Notice.create({
      title,
      message,
      type: type || 'general',
      postedBy:     req.user._id,
      postedByName: req.user.name,
    });
    res.status(201).json(notice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/notices/:id — manager only
router.delete('/:id', protect, managerOnly, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
