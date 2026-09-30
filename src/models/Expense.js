const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    category: {
      type: String,
      default: 'Other',
      index: true,
    },
    icon: {
      type: String,
      default: '🍔',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    time: {
      type: String,
      default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    source: {
      type: String,
      enum: ['manual', 'notification_capture'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Map categories to default icons
expenseSchema.pre('save', function (next) {
  const iconMap = {
    Food: '🍔',
    Travel: '🚕',
    Grocery: '🛒',
    Fun: '🎬',
    Health: '💊',
    Other: '➕',
  };
  if (!this.icon && iconMap[this.category]) {
    this.icon = iconMap[this.category];
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
