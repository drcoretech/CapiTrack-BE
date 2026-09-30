const mongoose = require('mongoose');

const splitParticipantSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  upiId: { type: String, trim: true },
  amount: { type: Number, required: true, default: 0 },
  isPaid: { type: Boolean, default: false },
  paidAt: { type: String },
  isCurrentUser: { type: Boolean, default: false },
});

const splitBillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    category: {
      type: String,
      default: 'Food',
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
    paidBy: {
      participantId: { type: String, default: 'user_me' },
      name: { type: String, required: true },
      isCurrentUser: { type: Boolean, default: true },
      upiId: { type: String },
    },
    splitType: {
      type: String,
      enum: ['EQUAL', 'EXACT', 'PERCENTAGE'],
      default: 'EQUAL',
    },
    participants: [splitParticipantSchema],
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
      index: true,
    },
    groupCode: { type: String, trim: true },
    groupName: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'SETTLED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SplitBill', splitBillSchema);
