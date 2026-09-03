const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect any route — must be logged in
const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorised, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid' });
  }
};

// Manager-only routes
const managerOnly = (req, res, next) => {
  if (req.user?.role !== 'manager') {
    return res.status(403).json({ message: 'Manager access only' });
  }
  next();
};

module.exports = { protect, managerOnly };
