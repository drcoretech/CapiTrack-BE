const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Person = require('../models/Person');
const LedgerTransaction = require('../models/LedgerTransaction');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Seeding initial data matching paisa-mockup (1).html...');

    // 1. Clear existing collections
    await User.deleteMany({});
    await Expense.deleteMany({});
    await Person.deleteMany({});
    await LedgerTransaction.deleteMany({});

    // 2. Create User
    const user = await User.create({
      name: 'Rohit',
      currency: 'INR',
      currencySymbol: '₹',
      preferredLanguage: 'en',
      preferences: {
        autoCaptureEnabled: true,
        darkMode: false,
      },
    });
    console.log(`Created user: ${user.name}`);

    // 3. Create Expenses
    const now = new Date();
    const todayLunch = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 20);
    const todayAuto = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 5);
    const yesterdayGroceries = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 19, 40);

    const expenses = await Expense.create([
      {
        userId: user._id,
        amount: 150,
        category: 'Food',
        icon: '🍔',
        note: 'Lunch with team',
        time: '1:20pm',
        date: todayLunch,
      },
      {
        userId: user._id,
        amount: 190,
        category: 'Travel',
        icon: '🚕',
        note: 'Auto to office',
        time: '9:05am',
        date: todayAuto,
      },
      {
        userId: user._id,
        amount: 210,
        category: 'Grocery',
        icon: '🛒',
        note: 'Groceries',
        time: '7:40pm',
        date: yesterdayGroceries,
      },
    ]);
    console.log(`Created ${expenses.length} sample expenses`);

    // 4. Create Ledger Contacts & Transactions
    const akssh = await Person.create({
      userId: user._id,
      name: 'Akssh',
      initial: 'A',
      netBalance: 1400,
      status: 'pending',
      lastTransactionAt: new Date(now.getFullYear(), now.getMonth(), 3),
    });

    await LedgerTransaction.create({
      userId: user._id,
      personId: akssh._id,
      type: 'LENT',
      amount: 1400,
      note: 'Lent — cash',
      date: new Date(now.getFullYear(), now.getMonth(), 3),
    });

    const anurag = await Person.create({
      userId: user._id,
      name: 'Anurag',
      initial: 'A',
      netBalance: 850,
      status: 'pending',
      lastTransactionAt: new Date(now.getFullYear(), now.getMonth(), 10),
    });

    await LedgerTransaction.create({
      userId: user._id,
      personId: anurag._id,
      type: 'LENT',
      amount: 850,
      note: 'Weekend lunch split',
      date: new Date(now.getFullYear(), now.getMonth(), 10),
    });

    const sahil = await Person.create({
      userId: user._id,
      name: 'Sahil',
      initial: 'S',
      netBalance: -900,
      status: 'pending',
      lastTransactionAt: new Date(now.getFullYear(), now.getMonth(), 1),
    });

    await LedgerTransaction.create({
      userId: user._id,
      personId: sahil._id,
      type: 'BORROWED',
      amount: 900,
      note: 'Borrowed for cab',
      date: new Date(now.getFullYear(), now.getMonth(), 1),
    });

    console.log('Created 3 khata contacts and their initial transactions (Akssh, Anurag, Sahil).');
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seed:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

seedData();
