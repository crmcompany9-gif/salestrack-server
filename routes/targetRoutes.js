const express = require('express');
const Target  = require('../models/Target');
const CallLog = require('../models/CallLog');
const { protect, managerOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/targets — all targets with live call progress
router.get('/', protect, async (req, res) => {
  try {
    const now   = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year  = parseInt(req.query.year)  || now.getFullYear();

    const filter = req.user.role === 'manager' ? {} : { employee: req.user._id };
    const targets = await Target.find({ ...filter, month, year })
      .populate('employee', 'name email phone');

    // For each target, count actual calls and conversions this month
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);

    const enriched = await Promise.all(targets.map(async (t) => {
      const callsMade = await CallLog.countDocuments({
        employee: t.employee._id,
        callDate: { $gte: start, $lt: end },
      });
      const conversions = await CallLog.countDocuments({
        employee: t.employee._id,
        outcome:  'interested',
        callDate: { $gte: start, $lt: end },
      });
      return {
        ...t.toObject(),
        callsMade,
        conversions,
        callPct:       Math.round((callsMade / t.callTarget) * 100),
        conversionPct: Math.round((conversions / t.conversionTarget) * 100),
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/targets — set or update a target (manager only)
router.post('/', protect, managerOnly, async (req, res) => {
  const { employee, month, year, callTarget, conversionTarget } = req.body;
  try {
    const target = await Target.findOneAndUpdate(
      { employee, month, year },
      { callTarget, conversionTarget },
      { upsert: true, new: true }
    ).populate('employee', 'name');
    res.status(201).json(target);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
