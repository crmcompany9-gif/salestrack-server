const express  = require('express');
const CallLog  = require('../models/CallLog');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const MONTHLY_TARGET = 130000;
const INCENTIVE_RATE = 0.10;

// GET /api/incentives?month=9&year=2026
router.get('/', protect, async (req, res) => {
  try {
    const now   = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year  = parseInt(req.query.year)  || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);

    const isManager = req.user.role === 'manager';

    // Get employees to calculate for
    let employees = [];
    if (isManager) {
      employees = await User.find({ role: 'employee', isActive: true }).select('name email');
    } else {
      employees = [req.user];
    }

    const results = await Promise.all(employees.map(async (emp) => {
      // Sum all amountCollected for this employee this month
      const calls = await CallLog.find({
        employee: emp._id,
        callDate: { $gte: start, $lt: end },
        amountCollected: { $gt: 0 },
      });

      const totalCollected = calls.reduce((sum, c) => sum + (c.amountCollected || 0), 0);
      const aboveTarget    = Math.max(0, totalCollected - MONTHLY_TARGET);
      const incentive      = Math.round(aboveTarget * INCENTIVE_RATE);
      const targetPct      = Math.min(Math.round((totalCollected / MONTHLY_TARGET) * 100), 200);
      const crossed        = totalCollected >= MONTHLY_TARGET;

      return {
        employee:       { _id: emp._id, name: emp.name, email: emp.email },
        totalCollected,
        target:         MONTHLY_TARGET,
        aboveTarget,
        incentive,
        targetPct,
        crossed,
        callCount:      calls.length,
      };
    }));

    res.json({ month, year, results, target: MONTHLY_TARGET, rate: INCENTIVE_RATE });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;