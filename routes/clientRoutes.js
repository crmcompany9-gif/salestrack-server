const express = require('express');
const Client  = require('../models/Client');
const CallLog = require('../models/CallLog');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/clients — manager: all | employee: assigned to them
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'manager' ? {} : { assignedTo: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const clients = await Client.find(filter)
      .populate('assignedTo', 'name')
      .sort({ lastContact: -1 });

    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/clients/:id — single client with full call history
router.get('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('assignedTo', 'name email');
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const callHistory = await CallLog.find({ client: req.params.id })
      .populate('employee', 'name')
      .sort({ callDate: -1 });

    res.json({ ...client.toObject(), callHistory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/clients/:id — update client details
router.put('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assignedTo', 'name');
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
