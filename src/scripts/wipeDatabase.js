const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function wipeDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment!');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas to clear all test collections...');
  await mongoose.connect(uri);

  const collections = ['users', 'expenses', 'people', 'ledgertransactions', 'clientprojects'];

  for (const colName of collections) {
    try {
      const col = mongoose.connection.collection(colName);
      const count = await col.countDocuments();
      await col.deleteMany({});
      console.log(`✔ Cleared collection: ${colName} (deleted ${count} documents)`);
    } catch (err) {
      console.warn(`Collection ${colName} error or already empty:`, err.message);
    }
  }

  console.log('🎉 Database successfully wiped clean! Ready for fresh testing.');
  await mongoose.disconnect();
}

wipeDatabase().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
