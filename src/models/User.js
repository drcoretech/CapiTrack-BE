const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false, // Optional for legacy or third-party auth, but populated on signup
    },
    deviceId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi', 'hinglish', 'mr', 'gu', 'ta', 'kn', 'bn'],
      default: 'en',
    },
    preferences: {
      autoCaptureEnabled: {
        type: Boolean,
        default: false,
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
      businessTrackingEnabled: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Helper methods for password hashing and verification
userSchema.statics.hashPassword = function (password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

userSchema.methods.verifyPassword = function (candidatePassword) {
  if (!this.password || !this.password.includes(':')) return false;
  try {
    const [salt, key] = this.password.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(candidatePassword, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);
