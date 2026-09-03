const express = require('express');
const CallLog = require('../models/CallLog');
const Client  = require('../models/Client');
const Target  = require('../models/Target');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', protect, async (req, res) => {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Scope: manager sees all, employee sees own
    const empFilter = req.user.role === 'manager' ? {} : { employee: req.user._id };
    const assignFilter = req.user.role === 'manager' ? {} : { assignedTo: req.user._id };

    // Core stats
    const [callsToday, interestedToday, followUpsDue, overdue, callsThisMonth, interestedThisMonth] = await Promise.all([
      CallLog.countDocuments({ ...empFilter, callDate: { $gte: today, $lt: tomorrow } }),
      CallLog.countDocuments({ ...empFilter, callDate: { $gte: today, $lt: tomorrow }, outcome: 'interested' }),
      Client.countDocuments({ ...assignFilter, nextFollowUp: { $gte: today, $lt: tomorrow } }),
      Client.countDocuments({ ...assignFilter, nextFollowUp: { $lt: today }, status: { $ne: 'not-interested' } }),
      CallLog.countDocuments({ ...empFilter, callDate: { $gte: monthStart } }),
      CallLog.countDocuments({ ...empFilter, callDate: { $gte: monthStart }, outcome: 'interested' }),
    ]);

    // Monthly target (employee's own, or team average for manager)
    let targetPct = 0;
    if (req.user.role === 'employee') {
      const target = await Target.findOne({
        employee: req.user._id,
        month: now.getMonth() + 1,
        year:  now.getFullYear(),
      });
      if (target) targetPct = Math.round((callsThisMonth / target.callTarget) * 100);
    } else {
      // Manager: total calls vs sum of all targets
      const targets = await Target.find({ month: now.getMonth() + 1, year: now.getFullYear() });
      const totalTarget = targets.reduce((s, t) => s + t.callTarget, 0);
      if (totalTarget > 0) targetPct = Math.round((callsThisMonth / totalTarget) * 100);
    }

    // Recent 5 calls
    const recentCalls = await CallLog.find(empFilter)
      .populate('employee', 'name')
      .populate('client',   'name phone')
      .sort({ callDate: -1 })
      .limit(5);

    // Team performance (manager only)
    let teamStats = [];
    if (req.user.role === 'manager') {
      const employees = await User.find({ role: 'employee', isActive: true });
      teamStats = await Promise.all(employees.map(async (emp) => {
        const [calls, interested] = await Promise.all([
          CallLog.countDocuments({ employee: emp._id, callDate: { $gte: monthStart } }),
          CallLog.countDocuments({ employee: emp._id, callDate: { $gte: monthStart }, outcome: 'interested' }),
        ]);
        const target = await Target.findOne({ employee: emp._id, month: now.getMonth() + 1, year: now.getFullYear() });
        const callTarget = target?.callTarget || 200;
        return {
          _id:       emp._id,
          name:      emp.name,
          calls,
          interested,
          callTarget,
          pct: Math.round((calls / callTarget) * 100),
        };
      }));
    }

    res.json({
      callsToday,
      interestedToday,
      followUpsDue,
      overdue,
      callsThisMonth,
      interestedThisMonth,
      targetPct,
      recentCalls,
      teamStats,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
