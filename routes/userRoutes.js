const express = require('express');
const User = require('../models/User');
const { protect, managerOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — all employees (manager only)
router.get('/', protect, managerOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users — add new employee (manager only)
router.post('/', protect, managerOnly, async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      phone,
      role: role || 'employee',
      password: password || 'elbow123',
    });
    res.status(201).json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      phone: user.phone,
      role:  user.role,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id — update employee (manager only)
router.put('/:id', protect, managerOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.name     !== undefined) user.name     = req.body.name;
    if (req.body.phone    !== undefined) user.phone    = req.body.phone;
    if (req.body.role     !== undefined) user.role     = req.body.role;
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
    if (req.body.password)               user.password = req.body.password;

    await user.save();
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id (manager only)
router.delete('/:id', protect, managerOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
