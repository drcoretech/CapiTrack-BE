const Person = require('../models/Person');
const LedgerTransaction = require('../models/LedgerTransaction');
const User = require('../models/User');
const { getRequestUser } = require('../utils/userHelper');

exports.getContacts = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const contacts = await Person.find({ userId: user._id }).sort({ lastTransactionAt: -1 });

    const formatted = contacts.map((c) => ({
      id: c._id,
      name: c.name,
      initial: c.initial,
      netBalance: c.netBalance,
      status: c.status,
      lastDate: c.lastTransactionAt
        ? new Date(c.lastTransactionAt).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
          })
        : 'Recently',
    }));

    res.json({
      success: true,
      contacts: formatted,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getContactDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getRequestUser(req);
    const person = await Person.findOne({ _id: id, userId: user._id });

    if (!person) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    const transactions = await LedgerTransaction.find({ personId: id, userId: user._id }).sort({
      date: -1,
      createdAt: -1,
    });

    res.json({
      success: true,
      person: {
        id: person._id,
        name: person.name,
        initial: person.initial,
        netBalance: person.netBalance,
        status: person.status,
        lastDate: person.lastTransactionAt
          ? new Date(person.lastTransactionAt).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
            })
          : 'Recently',
      },
      transactions: transactions.map((t) => ({
        id: t._id,
        note: t.note,
        date: new Date(t.date).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        amount: t.amount,
        direction: t.type,
      })),
    });
  } catch (error) {
    console.error('Error fetching contact detail:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addTransaction = async (req, res) => {
  try {
    const { personName, personId, amount, type, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    if (!['LENT', 'BORROWED'].includes(type)) {
      return res.status(400).json({ success: false, message: "Type must be 'LENT' or 'BORROWED'" });
    }

    const user = await getRequestUser(req);

    let person = null;
    if (personId) {
      person = await Person.findOne({ _id: personId, userId: user._id });
    } else if (personName) {
      const trimmed = personName.trim();
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      person = await Person.findOne({ userId: user._id, name: new RegExp(`^${escaped}$`, 'i') });
      if (!person) {
        person = await Person.create({
          userId: user._id,
          name: trimmed,
          initial: trimmed[0].toUpperCase(),
          netBalance: 0,
        });
      }
    }

    if (!person) {
      return res.status(400).json({ success: false, message: 'Person name or ID is required' });
    }

    const numAmount = Number(amount);
    const balanceDelta = type === 'LENT' ? numAmount : -numAmount;
    const newNetBalance = person.netBalance + balanceDelta;

    // Update person
    person.netBalance = newNetBalance;
    person.status = newNetBalance === 0 ? 'settled' : 'pending';
    person.lastTransactionAt = new Date();
    await person.save();

    // Create ledger transaction
    const newTxn = await LedgerTransaction.create({
      userId: user._id,
      personId: person._id,
      type,
      amount: numAmount,
      note: note || (type === 'LENT' ? 'Lent' : 'Borrowed'),
      date: new Date(),
    });

    res.status(201).json({
      success: true,
      person: {
        id: person._id,
        name: person.name,
        initial: person.initial,
        netBalance: person.netBalance,
        status: person.status,
      },
      transaction: {
        id: newTxn._id,
        note: newTxn.note,
        amount: newTxn.amount,
        direction: newTxn.type,
        date: 'Today',
      },
    });
  } catch (error) {
    console.error('Error adding ledger transaction:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.settleContact = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getRequestUser(req);
    const person = await Person.findOne({ _id: id, userId: user._id });

    if (!person) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    if (person.netBalance === 0) {
      return res.json({ success: true, message: 'Already settled', person });
    }

    const settledAmount = Math.abs(person.netBalance);

    // Record settlement transaction
    await LedgerTransaction.create({
      userId: user._id,
      personId: person._id,
      type: 'SETTLEMENT',
      amount: settledAmount,
      note: 'Settled full balance',
      date: new Date(),
    });

    person.netBalance = 0;
    person.status = 'settled';
    person.lastTransactionAt = new Date();
    await person.save();

    res.json({
      success: true,
      message: 'Contact balance settled to zero',
      person: {
        id: person._id,
        name: person.name,
        netBalance: 0,
        status: 'settled',
      },
    });
  } catch (error) {
    console.error('Error settling contact:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
