const Expense = require('../models/Expense');
const { getRequestUser } = require('../utils/userHelper');

// Helper to label day groups
const getDayGroupLabel = (date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(date);
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  if (targetDay.getTime() === today.getTime()) {
    return 'Today';
  } else if (targetDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return target.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const expenses = await Expense.find({ userId: user._id }).sort({ date: -1, createdAt: -1 });

    const formatted = expenses.map((exp) => ({
      id: exp._id,
      amount: exp.amount,
      category: exp.category,
      icon: exp.icon,
      note: exp.note,
      time: exp.time,
      date: exp.date,
      dayGroup: getDayGroupLabel(exp.date),
      source: exp.source,
      createdAt: exp.createdAt,
    }));

    res.json({
      success: true,
      count: formatted.length,
      expenses: formatted,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { amount, category, note, icon, source } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const user = await getRequestUser(req);

    const expenseDate = req.body.date ? new Date(req.body.date) : new Date();
    const expenseTime = req.body.time || expenseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newExpense = await Expense.create({
      userId: user._id,
      amount: Number(amount),
      category: category || 'Other',
      icon,
      note: note || '',
      source: source || 'manual',
      date: expenseDate,
      time: expenseTime,
    });

    res.status(201).json({
      success: true,
      expense: {
        id: newExpense._id,
        amount: newExpense.amount,
        category: newExpense.category,
        icon: newExpense.icon,
        note: newExpense.note,
        time: newExpense.time,
        date: newExpense.date,
        dayGroup: getDayGroupLabel(newExpense.date),
        source: newExpense.source,
      },
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, category, note, date, time, icon } = req.body;
    const user = await getRequestUser(req);

    const expense = await Expense.findOne({ _id: id, userId: user._id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (amount !== undefined) expense.amount = Number(amount);
    if (category !== undefined) expense.category = category;
    if (note !== undefined) expense.note = note;
    if (icon !== undefined) expense.icon = icon;
    if (date !== undefined) expense.date = new Date(date);
    if (time !== undefined) expense.time = time;

    await expense.save();

    res.json({
      success: true,
      expense: {
        id: expense._id,
        amount: expense.amount,
        category: expense.category,
        icon: expense.icon,
        note: expense.note,
        time: expense.time,
        date: expense.date,
        dayGroup: getDayGroupLabel(expense.date),
        source: expense.source,
      },
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getRequestUser(req);
    const deleted = await Expense.findOneAndDelete({ _id: id, userId: user._id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
