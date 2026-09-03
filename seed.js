const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const User     = require('./models/User');
const Target   = require('./models/Target');

dotenv.config();

const users = [
  { name: 'Manager',      email: 'manager@elbowgrease.in', phone: '8306533349', role: 'manager',   password: 'elbow123' },
  { name: 'Riya Sharma',  email: 'riya@elbowgrease.in',    phone: '7742929581', role: 'employee',  password: 'elbow123' },
  { name: 'Vinit Kumar',  email: 'vinit@elbowgrease.in',   phone: '9001928431', role: 'employee',  password: 'elbow123' },
  { name: 'Yash Saxena',  email: 'yash@elbowgrease.in',    phone: '9001983480', role: 'employee',  password: 'elbow123' },
  { name: 'Ankit Kumar',  email: 'ankit@elbowgrease.in',   phone: '9216086715', role: 'employee',  password: 'elbow123' },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB...');

  // Clear existing
  await User.deleteMany({});
  await Target.deleteMany({});
  console.log('Cleared old users and targets.');

  // Create users with save() so pre-save password hashing runs
  const savedUsers = [];
  for (const u of users) {
    const user = new User(u);
    await user.save();
    savedUsers.push(user);
    console.log(`Created: ${u.name} (${u.email})`);
  }

  // Set September 2026 targets for each employee
  const employees = savedUsers.filter(u => u.role === 'employee');
  for (const emp of employees) {
    await Target.create({
      employee: emp._id,
      month: 9,
      year:  2026,
      callTarget:       200,
      conversionTarget:  60,
    });
  }
  console.log('Targets created for September 2026.');
  console.log('\nSeed complete! All users: password = elbow123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });