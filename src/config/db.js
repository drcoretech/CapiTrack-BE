const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/paisa';
  const isAtlas = uri.includes('mongodb+srv://') || uri.includes('mongodb.net');

  try {
    console.log(`Connecting to MongoDB at: ${uri}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isAtlas ? 8000 : 2500,
      connectTimeoutMS: isAtlas ? 8000 : 2500,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 to prevent IPv6 DNS handshake drop on Mac
    });
    console.log('✅ MongoDB Connected successfully.');
  } catch (err) {
    console.warn(`\n⚠️  MongoDB Connection Notice: ${err.message}`);
    console.warn(`👉 If using Atlas, ensure your IP is whitelisted in MongoDB Atlas > Network Access (or add 0.0.0.0/0).\n`);

    console.log('🔄 Activating Embedded In-Memory MongoDB so the server remains active on port 5001 for the mobile app...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`✅ Embedded In-Memory MongoDB Connected at: ${memUri}`);
    } catch (memErr) {
      console.error('Failed to start fallback in-memory MongoDB:', memErr.message);
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (e) {}
};

module.exports = { connectDB, disconnectDB };
