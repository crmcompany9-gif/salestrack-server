const express = require('express');
const CallLog = require('../models/CallLog');
const Client  = require('../models/Client');
const { protect, managerOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/calls — log a new call
// Also auto-creates or updates the Client record
router.post('/', protect, async (req, res) => {
  const { clientName, clientPhone, clientCity, callType, outcome, duration, notes, recordingLink, nextFollowUp, amountQuoted, amountCollected } = req.body;

  try {
    // Find or create client by phone number
    let client = await Client.findOne({ phone: clientPhone });
    if (!client) {
      client = await Client.create({
        name:       clientName,
        phone:      clientPhone,
        city:       clientCity,
        assignedTo: req.user._id,
        status:     outcome,
        lastContact: new Date(),
        nextFollowUp: nextFollowUp || null,
      });
    } else {
      // Update client status and follow-up date from latest call
      client.status      = outcome;
      client.lastContact = new Date();
      client.nextFollowUp = nextFollowUp || client.nextFollowUp;
      client.totalCalls  += 1;
      await client.save();
    }

   const call = await CallLog.create({
  employee:        req.user._id,
  client:          client._id,
  callType,
  outcome,
  duration:        duration || 0,
  notes,
  recordingLink,
  nextFollowUp:    nextFollowUp || null,
  amountQuoted:    amountQuoted    || 0,
  amountCollected: amountCollected || 0,
});

    const populated = await call.populate([
      { path: 'employee', select: 'name email' },
      { path: 'client',   select: 'name phone city' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/calls — manager: all calls | employee: own calls only
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'manager' ? {} : { employee: req.user._id };

    // Optional query filters
    if (req.query.outcome)   filter.outcome  = req.query.outcome;
    if (req.query.callType)  filter.callType = req.query.callType;
    if (req.query.employee && req.user.role === 'manager') {
      filter.employee = req.query.employee;
    }

    const calls = await CallLog.find(filter)
      .populate('employee', 'name')
      .populate('client',   'name phone city')
      .sort({ callDate: -1 })
      .limit(200);

    res.json(calls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/calls/:id — single call detail
router.get('/:id', protect, async (req, res) => {
  try {
    const call = await CallLog.findById(req.params.id)
      .populate('employee', 'name email')
      .populate('client',   'name phone city');
    if (!call) return res.status(404).json({ message: 'Call not found' });

    // Employee can only see their own calls
    if (req.user.role === 'employee' && call.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }
    res.json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/calls/:id — update a call log
router.put('/:id', protect, async (req, res) => {
  try {
    const call = await CallLog.findById(req.params.id);
    if (!call) return res.status(404).json({ message: 'Call not found' });

    if (req.user.role === 'employee' && call.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    const updated = await CallLog.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('employee', 'name')
      .populate('client',   'name phone city');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
