const mongoose = require('mongoose');

const ledgerTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['LENT', 'BORROWED', 'SETTLEMENT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LedgerTransaction', ledgerTransactionSchema);
