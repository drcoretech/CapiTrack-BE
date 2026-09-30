const Expense = require('../models/Expense');
const Person = require('../models/Person');
const User = require('../models/User');
const { getRequestUser } = require('../utils/userHelper');

// Helper to get start and end of a given day
const getDayBounds = (dateOffset = 0) => {
  const start = new Date();
  start.setDate(start.getDate() + dateOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(end.getDate() + dateOffset);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const user = await getRequestUser(req);

    // Today's spend
    const today = getDayBounds(0);
    const todayExpenses = await Expense.find({
      userId: user._id,
      date: { $gte: today.start, $lte: today.end },
    }).sort({ createdAt: -1 });

    const spentToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Yesterday's spend
    const yesterday = getDayBounds(-1);
    const yesterdayExpenses = await Expense.find({
      userId: user._id,
      date: { $gte: yesterday.start, $lte: yesterday.end },
    });
    const spentYesterday = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Delta calculation
    let deltaFormatted = 'No change vs yesterday';
    if (spentYesterday > 0) {
      const deltaPct = Math.round(((spentToday - spentYesterday) / spentYesterday) * 100);
      if (deltaPct > 0) {
        deltaFormatted = `↑ ${deltaPct}% vs yesterday`;
      } else if (deltaPct < 0) {
        deltaFormatted = `↓ ${Math.abs(deltaPct)}% vs yesterday`;
      } else {
        deltaFormatted = `0% vs yesterday`;
      }
    } else if (spentToday > 0) {
      deltaFormatted = `↑ 100% vs yesterday`;
    }

    // Ledger totals
    const contacts = await Person.find({ userId: user._id });
    const owedToYou = contacts.reduce(
      (sum, c) => (c.netBalance > 0 ? sum + c.netBalance : sum),
      0
    );
    const youOwe = contacts.reduce(
      (sum, c) => (c.netBalance < 0 ? sum + Math.abs(c.netBalance) : sum),
      0
    );

    // Dynamic AI Insight note
    let insightNote = 'No expenses logged yet. Tap + to record your first spend.';
    if (todayExpenses.length === 0) {
      const pastExpenses = await Expense.find({ userId: user._id }).limit(20);
      if (pastExpenses.length > 0) {
        const catMap = {};
        pastExpenses.forEach((e) => {
          catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        });
        const topCat = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a])[0];
        insightNote = `No spending recorded today yet. Your highest spend category is ${topCat}.`;
      }
    } else if (todayExpenses.length === 1) {
      const exp = todayExpenses[0];
      const itemDesc = exp.note ? ` for "${exp.note}"` : '';
      insightNote = `You spent ₹${exp.amount.toLocaleString()}${itemDesc} on ${exp.category} today.`;
    } else {
      const catMap = {};
      todayExpenses.forEach((e) => {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      });
      const topCat = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a])[0];
      const topCatTotal = catMap[topCat];
      const pct = spentToday > 0 ? Math.round((topCatTotal / spentToday) * 100) : 100;
      insightNote = `Most of your spend today is on ${topCat} (${pct}% of daily spend).`;
    }

    res.json({
      success: true,
      userName: user.name,
      currency: user.currencySymbol || '₹',
      spentToday,
      spentYesterday,
      delta: deltaFormatted,
      insight: insightNote,
      owedToYou,
      youOwe,
      recentActivity: todayExpenses.slice(0, 5),
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMonthlyInsights = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const breakdown = await Expense.aggregate([
      {
        $match: {
          userId: user._id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    if (!breakdown || breakdown.length === 0) {
      return res.json({
        success: true,
        month,
        year,
        categories: [],
        topCategory: '',
      });
    }

    const maxTotal = Math.max(...breakdown.map((b) => b.total));
    const categories = breakdown.map((item, idx) => ({
      category: item._id,
      amount: item.total,
      label: item.total >= 1000 ? `₹${(item.total / 1000).toFixed(1)}k` : `₹${item.total}`,
      percentage: Math.round((item.total / maxTotal) * 100),
      isTop: idx === 0,
    }));

    res.json({
      success: true,
      month,
      year,
      categories,
      topCategory: categories[0]?.category || 'Food',
    });
  } catch (error) {
    console.error('Error fetching monthly insights:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
