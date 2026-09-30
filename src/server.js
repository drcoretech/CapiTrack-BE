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
const splitRoutes = require('./routes/split.routes');
const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/auth.routes');
const groupRoutes = require('./routes/group.routes');
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

// Privacy Policy Endpoint (Google Play Console requirement)
const privacyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - CapiTrack</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a2e22; max-width: 800px; margin: 0 auto; padding: 24px 20px; background-color: #f7faf8; }
    h1 { color: #1b4332; border-bottom: 2px solid #2d6a4f; padding-bottom: 8px; }
    h2 { color: #2d6a4f; margin-top: 24px; }
    p, li { color: #2d3748; }
    .card { background: white; padding: 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .footer { margin-top: 32px; font-size: 0.9em; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Privacy Policy for CapiTrack</h1>
    <p><strong>Effective Date:</strong> September 30, 2026</p>
    <p><strong>Developer:</strong> Digvijay Rajebhosale (DR CoreTech)</p>

    <h2>1. Introduction</h2>
    <p>CapiTrack ("we", "our", or "us") provides a personal finance tracking, expense categorization, and digital Udhaar Khata ledger application. We are committed to safeguarding your privacy and ensuring your financial records remain confidential and secure.</p>

    <h2>2. Information We Collect</h2>
    <ul>
      <li><strong>User-Provided Financial Data:</strong> Expense amounts, category labels, notes, dates, and optional transaction contact names entered into your personal ledger.</li>
      <li><strong>Authentication Information:</strong> Name, phone number or email address (when using cloud synchronization or authentication).</li>
      <li><strong>Device Identifiers:</strong> Non-sensitive randomly generated device identifiers used solely to associate and synchronize your offline data with cloud backup.</li>
      <li><strong>Biometric Data:</strong> If enabled, Biometric Authentication (Fingerprint / Face ID) is processed entirely locally by your device operating system via secure hardware keystore. We never collect, transmit, or store biometric templates.</li>
    </ul>

    <h2>3. How We Use Information</h2>
    <p>We use the collected information exclusively to:</p>
    <ul>
      <li>Provide local-first expense tracking and Khata ledger balances.</li>
      <li>Enable seamless background cloud synchronization across your authorized devices.</li>
      <li>Display category insights and spending trends.</li>
    </ul>
    <p><strong>We do NOT sell, rent, or monetize your personal or financial data with any third-party advertisers.</strong></p>

    <h2>4. Data Storage & Security</h2>
    <p>All data transmitted between the CapiTrack mobile application and our backend servers is encrypted in transit using industry-standard Transport Layer Security (TLS/HTTPS). Offline data on your device is stored within sandboxed secure local storage.</p>

    <h2>5. Data Retention & Deletion</h2>
    <p>Users maintain full control over their records. You can delete individual expenses, ledger entries, or contacts directly in the app at any time. To request complete permanent deletion of your account and all associated cloud data, contact us at <strong>digvijayraje.rajebhosale@gmail.com</strong>.</p>

    <h2>6. Contact Us</h2>
    <p>If you have any questions or feedback regarding this Privacy Policy, please contact us at:</p>
    <p><strong>Email:</strong> digvijayraje.rajebhosale@gmail.com<br><strong>Website:</strong> <a href="https://drcoretech.in">https://drcoretech.in</a></p>

    <div class="footer">
      <p>&copy; 2026 CapiTrack / DR CoreTech. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

app.get('/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(privacyHtml);
});
app.get('/api/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(privacyHtml);
});

// Mount Resource Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/splits', splitRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Start Server (only when running directly, not in Vercel serverless)
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`CapiTrack API Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

if (!process.env.VERCEL) {
  startServer();
}

module.exports = app;
