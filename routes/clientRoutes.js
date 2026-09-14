const express = require('express');
const Client  = require('../models/Client');
const CallLog = require('../models/CallLog');
const axios   = require('axios');
const { protect, managerOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/clients
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

// GET /api/clients/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('assignedTo', 'name email');
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const callHistory = await CallLog.find({ client: req.params.id })
      .populate('employee', 'name').sort({ callDate: -1 });
    res.json({ ...client.toObject(), callHistory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/clients/:id
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

// DELETE /api/clients/:id — manager only
router.delete('/:id', protect, managerOnly, async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    await CallLog.deleteMany({ client: req.params.id });
    res.json({ message: 'Client and call logs deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/clients/:id/send-to-erp — manager only
router.post('/:id/send-to-erp', protect, managerOnly, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('assignedTo', 'name');
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (client.sentToERP) return res.status(400).json({ message: 'Client already sent to ERP' });
    if (client.status !== 'interested') return res.status(400).json({ message: 'Only interested clients can be sent to ERP' });

    const erpResponse = await axios.post(
      `${process.env.ERP_BACKEND_URL}/api/clients/from-salestrack`,
      {
        companyName:   client.name,
        contactPerson: client.name,
        phone:         client.phone,
        city:          client.city,
        scheme:        'DPIIT Recognition',
      },
      {
        headers: {
          'x-salestrack-secret': process.env.SALESTRACK_SECRET,
          'Content-Type': 'application/json',
        },
      }
    );

    client.sentToERP = true;
    await client.save();
    res.json({ message: '✅ Client sent to GrowTrack ERP successfully', erpClient: erpResponse.data.client });
  } catch (err) {
    if (err.response?.status === 409) {
      await Client.findByIdAndUpdate(req.params.id, { sentToERP: true });
      return res.json({ message: '⚠️ Client already exists in ERP — marked as sent', alreadyExisted: true });
    }
    res.status(500).json({ message: 'Failed to send to ERP', error: err.response?.data?.message || err.message });
  }
});

module.exports = router;