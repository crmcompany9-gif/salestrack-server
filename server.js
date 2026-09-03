const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/users',     require('./routes/userRoutes'));
app.use('/api/calls',     require('./routes/callRoutes'));
app.use('/api/clients',   require('./routes/clientRoutes'));
app.use('/api/targets',   require('./routes/targetRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Health check
app.get('/', (req, res) => res.send('SalesTrack API running'));

// Keep-alive ping — prevents Render free tier from sleeping
const https = require('https');
setInterval(() => {
  https.get(process.env.BACKEND_URL || 'https://your-backend.onrender.com', (res) => {
    console.log(`Keep-alive ping: ${res.statusCode}`);
  }).on('error', () => {});
}, 840000); // every 14 minutes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
