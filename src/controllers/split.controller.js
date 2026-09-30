const SplitBill = require('../models/SplitBill');
const { getRequestUser } = require('../utils/userHelper');

exports.getSplitBills = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const bills = await SplitBill.find({ userId: user._id }).sort({ createdAt: -1 });

    const formatted = bills.map((b) => ({
      id: b._id.toString(),
      title: b.title,
      totalAmount: b.totalAmount,
      category: b.category,
      date: b.date,
      paidBy: b.paidBy,
      splitType: b.splitType,
      participants: b.participants,
      groupName: b.groupName,
      notes: b.notes,
      status: b.status,
      createdAt: b.createdAt,
    }));

    res.json({
      success: true,
      splitBills: formatted,
    });
  } catch (error) {
    console.error('Error fetching split bills:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSplitBill = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const {
      title,
      totalAmount,
      category,
      date,
      paidBy,
      splitType,
      participants,
      groupName,
      notes,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Bill title is required' });
    }

    const bill = await SplitBill.create({
      userId: user._id,
      title: title.trim(),
      totalAmount: Number(totalAmount) || 0,
      category: category || 'Food',
      date: date || 'Today',
      paidBy: paidBy || { name: 'You', isCurrentUser: true },
      splitType: splitType || 'EQUAL',
      participants: participants || [],
      groupName: (groupName && groupName.trim()) || '',
      notes: (notes && notes.trim()) || '',
      status: (participants || []).every((p) => p.isPaid) ? 'SETTLED' : 'PENDING',
    });

    res.status(201).json({
      success: true,
      splitBill: {
        id: bill._id.toString(),
        title: bill.title,
        totalAmount: bill.totalAmount,
        category: bill.category,
        date: bill.date,
        paidBy: bill.paidBy,
        splitType: bill.splitType,
        participants: bill.participants,
        status: bill.status,
        createdAt: bill.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating split bill:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.settleParticipant = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const { id, participantId } = req.params;

    const bill = await SplitBill.findOne({ _id: id, userId: user._id });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Split bill not found' });
    }

    const part = bill.participants.find(
      (p) => p.id === participantId || (p._id && p._id.toString() === participantId)
    );
    if (!part) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    part.isPaid = true;
    part.paidAt = new Date().toISOString();

    bill.status = bill.participants.every((p) => p.isPaid) ? 'SETTLED' : 'PENDING';
    await bill.save();

    res.json({
      success: true,
      splitBill: {
        id: bill._id.toString(),
        participants: bill.participants,
        status: bill.status,
      },
    });
  } catch (error) {
    console.error('Error settling participant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSplitBill = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const { id } = req.params;

    await SplitBill.findOneAndDelete({ _id: id, userId: user._id });
    res.json({ success: true, message: 'Split bill deleted' });
  } catch (error) {
    console.error('Error deleting split bill:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
