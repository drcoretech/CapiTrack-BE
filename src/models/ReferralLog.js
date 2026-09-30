const mongoose = require('mongoose');

const referralLogSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Guarantees a referee can NEVER be referred by more than 1 user
      index: true,
    },
    referralCodeUsed: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    pointsAwarded: {
      type: Number,
      default: 50,
    },
    refereeBonusPoints: {
      type: Number,
      default: 25,
    },
    status: {
      type: String,
      enum: ['pending', 'rewarded', 'rejected'],
      default: 'rewarded',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate referrer-referee pairs
referralLogSchema.index({ referrerId: 1, referredUserId: 1 }, { unique: true });

module.exports = mongoose.model('ReferralLog', referralLogSchema);
