const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    initial: {
      type: String,
      default: function () {
        return this.name ? this.name[0].toUpperCase() : '?';
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    netBalance: {
      type: Number,
      default: 0, // positive = they owe user, negative = user owes them
    },
    status: {
      type: String,
      enum: ['pending', 'settled'],
      default: 'pending',
    },
    lastTransactionAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Person', personSchema);
