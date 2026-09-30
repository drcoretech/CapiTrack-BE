const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: String,
      default: () =>
        new Date().toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
    },
    note: {
      type: String,
      trim: true,
      default: 'Milestone payment',
    },
    method: {
      type: String,
      enum: ['UPI', 'Bank Transfer', 'Cash', 'Cheque'],
      default: 'UPI',
    },
    recordedAsIncome: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const clientProjectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    projectTitle: {
      type: String,
      required: true,
      trim: true,
    },
    totalValue: {
      type: Number,
      required: true,
      default: 0,
    },
    payments: [paymentSchema],
    status: {
      type: String,
      enum: ['in_progress', 'payment_pending', 'completed'],
      default: 'in_progress',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientProject', clientProjectSchema);
