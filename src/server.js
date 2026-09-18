const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');

// Route imports
const dashboardRoutes = require('./routes/dashboard.routes');
const expenseRoutes = require('./routes/expense.routes');
const ledgerRoutes = require('./routes/ledger.routes');
const projectRoutes = require('./routes/project.routes');
const userRoutes = require('./routes/user.routes');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5001;

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Ensure DB connection for serverless platforms (Vercel, AWS Lambda)
app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState < 1) {
      await connectDB();
    }
    next();
  } catch (err) {
    console.error('Serverless DB connection error:', err);
    next(err);
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'capitrack-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Resource Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/user', userRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Auto-seed helper for initial launch if database is empty
const autoSeedIfEmpty = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found in database. Auto-populating mockup seed data...');
      const Expense = require('./models/Expense');
      const Person = require('./models/Person');
      const LedgerTransaction = require('./models/LedgerTransaction');

      const user = await User.create({
        name: 'Rohit',
        currency: 'INR',
        currencySymbol: '₹',
        preferredLanguage: 'en',
      });

      const now = new Date();
      await Expense.create([
        {
          userId: user._id,
          amount: 150,
          category: 'Food',
          icon: '🍔',
          note: 'Lunch with team',
          time: '1:20pm',
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 20),
        },
        {
          userId: user._id,
          amount: 190,
          category: 'Travel',
          icon: '🚕',
          note: 'Auto to office',
          time: '9:05am',
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 5),
        },
        {
          userId: user._id,
          amount: 210,
          category: 'Grocery',
          icon: '🛒',
          note: 'Groceries',
          time: '7:40pm',
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 19, 40),
        },
      ]);

      const akssh = await Person.create({
        userId: user._id,
        name: 'Akssh',
        initial: 'A',
        netBalance: 1400,
        status: 'pending',
      });
      await LedgerTransaction.create({
        userId: user._id,
        personId: akssh._id,
        type: 'LENT',
        amount: 1400,
        note: 'Lent — cash',
      });

      const anurag = await Person.create({
        userId: user._id,
        name: 'Anurag',
        initial: 'A',
        netBalance: 850,
        status: 'pending',
      });
      await LedgerTransaction.create({
        userId: user._id,
        personId: anurag._id,
        type: 'LENT',
        amount: 850,
        note: 'Weekend lunch split',
      });

      const sahil = await Person.create({
        userId: user._id,
        name: 'Sahil',
        initial: 'S',
        netBalance: -900,
        status: 'pending',
      });
      await LedgerTransaction.create({
        userId: user._id,
        personId: sahil._id,
        type: 'BORROWED',
        amount: 900,
        note: 'Borrowed for cab',
      });

      console.log('Database successfully seeded with default mockup data.');
    }
  } catch (err) {
    console.warn('Auto-seed warning:', err.message);
  }
};

// Start Server (only when running directly, not in Vercel serverless)
const startServer = async () => {
  await connectDB();
  await autoSeedIfEmpty();

  app.listen(PORT, () => {
    console.log(`CapiTrack API Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

if (!process.env.VERCEL) {
  startServer();
}

module.exports = app;
