const express = require('express');
const axios   = require('axios');
const CallLog = require('../models/CallLog');
const Client  = require('../models/Client');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper — Exotel API base URL
const exotelBase = () =>
  `https://${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}@${process.env.EXOTEL_SUBDOMAIN}/v1/Accounts/${process.env.EXOTEL_SID}`;

// POST /api/exotel/call — initiate a call
// Employee clicks call button → Exotel calls employee first → then connects to client
router.post('/call', protect, async (req, res) => {
  const { clientPhone, clientName, clientId } = req.body;

  try {
    // Get employee's phone number from their profile
    const employee = await User.findById(req.user._id);
    if (!employee.phone) {
      return res.status(400).json({ message: 'Your phone number is not set. Ask manager to update it in Team page.' });
    }

    // Format numbers — Exotel needs 0 prefix for Indian numbers
    const from = employee.phone.replace(/^(\+91|91)/, '0');
    const to   = clientPhone.replace(/^(\+91|91)/, '0');

    // Make call via Exotel API
    const response = await axios.post(
      `${exotelBase()}/Calls/connect.json`,
      new URLSearchParams({
        From:           from,              // employee phone — Exotel calls this first
        To:             to,                // client phone — connected after employee picks up
        CallerId:       process.env.EXOTEL_VIRTUAL_NUMBER,  // business number client sees
        Url:            `http://my.exotel.com/exotel/exoml/start/${process.env.EXOTEL_APP_ID}`,
        StatusCallback: `${process.env.BACKEND_URL}/api/exotel/webhook`,
        CustomField:    JSON.stringify({ employeeId: req.user._id, clientId, clientName }),
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    res.json({
      message: 'Call initiated — your phone will ring first',
      callSid: response.data?.Call?.Sid,
    });

  } catch (err) {
    console.error('Exotel call error:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to initiate call', error: err.response?.data || err.message });
  }
});

// POST /api/exotel/webhook — Exotel calls this when call ends
// Auto creates a call log in SalesTrack
router.post('/webhook', async (req, res) => {
  try {
    const {
      CallSid, Status, Duration, RecordingUrl, CustomField,
      To, From
    } = req.body;

    console.log('Exotel webhook received:', { CallSid, Status, Duration });

    // Parse custom field we sent when initiating call
    let custom = {};
    try { custom = JSON.parse(CustomField || '{}'); } catch {}

    const { employeeId, clientId, clientName } = custom;

    // Only log completed calls
    if (!['completed', 'answered'].includes(Status?.toLowerCase())) {
      return res.status(200).send('OK');
    }

    // Find or create client
    let client = clientId ? await Client.findById(clientId) : null;
    if (!client && To) {
      client = await Client.findOne({ phone: To.replace(/^0/, '') });
    }
    if (!client && To) {
      client = await Client.create({
        name:        clientName || To,
        phone:       To.replace(/^0/, ''),
        assignedTo:  employeeId,
        status:      'no-answer',
        lastContact: new Date(),
      });
    }

    if (!client || !employeeId) {
      return res.status(200).send('OK');
    }

    // Create call log automatically
    await CallLog.create({
      employee:      employeeId,
      client:        client._id,
      callType:      'cold',
      outcome:       'no-answer', // employee updates this manually after the call
      duration:      Math.round(parseInt(Duration || 0) / 60), // seconds to minutes
      recordingLink: RecordingUrl || '',
      notes:         'Auto logged via Exotel. Update outcome and notes.',
      callDate:      new Date(),
    });

    // Update client last contact
    client.lastContact = new Date();
    client.totalCalls  = (client.totalCalls || 0) + 1;
    await client.save();

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(200).send('OK'); // always return 200 to Exotel
  }
});

module.exports = router;