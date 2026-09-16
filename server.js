const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: [
    'https://salestrack-client-oonl.onrender.com',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/users',     require('./routes/userRoutes'));
app.use('/api/calls',     require('./routes/callRoutes'));
app.use('/api/clients',   require('./routes/clientRoutes'));
app.use('/api/targets',   require('./routes/targetRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notices',   require('./routes/noticeRoutes'));
app.use('/api/incentives', require('./routes/incentiveRoutes'));
app.use('/api/exotel',    require('./routes/exotelRoutes'));

// Health check
app.get('/', (req, res) => res.send('SalesTrack API running'));

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login attempts per 15 minutes
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
});

app.use('/api/auth/login', loginLimiter);

// Keep-alive ping — prevents Render free tier from sleeping
const https = require('https');
setInterval(() => {
  https.get(process.env.BACKEND_URL || 'https://your-backend.onrender.com', (res) => {
    console.log(`Keep-alive ping: ${res.statusCode}`);
  }).on('error', () => {});
}, 840000); // every 14 minutes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
