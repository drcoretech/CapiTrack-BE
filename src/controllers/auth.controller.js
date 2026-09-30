const User = require('../models/User');
const { getRequestUser } = require('../utils/userHelper');

/**
 * Register a fresh CapiTrack user account.
 * POST /api/auth/signup
 */
exports.signup = async (req, res) => {
  try {
    const { name, password, preferredLanguage, businessTrackingEnabled, deviceId } = req.body;

    const trimmedName = (name || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid name (at least 2 characters).',
      });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long.',
      });
    }

    // Check case-insensitive uniqueness
    const escaped = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await User.findOne({
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An account with the name "${trimmedName}" already exists. Please log in instead.`,
      });
    }

    const hashedPassword = User.hashPassword(password);
    const ReferralLog = require('../models/ReferralLog');

    // Generate unique CapiTrack ID & Referral Code
    const cleanHandle = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);
    const refCode = 'CT' + (trimmedName.slice(0, 3) || 'CAP').toUpperCase() + Math.floor(100 + Math.random() * 900);

    const user = new User({
      name: trimmedName,
      password: hashedPassword,
      deviceId: deviceId ? deviceId.trim() : undefined,
      capitrackId: cleanHandle,
      referralCode: refCode,
      preferredLanguage: preferredLanguage || 'en',
      currency: 'INR',
      currencySymbol: '₹',
      rewardPoints: 0,
      preferences: {
        autoCaptureEnabled: false,
        darkMode: false,
        businessTrackingEnabled: !!businessTrackingEnabled,
      },
    });

    // Check optional referral invite code
    const incomingRefCode = (req.body.referralCode || '').trim().toUpperCase();
    if (incomingRefCode) {
      const referrer = await User.findOne({ referralCode: incomingRefCode });
      if (referrer && referrer._id.toString() !== user._id.toString()) {
        user.referredBy = referrer._id;
        user.isReferralClaimed = true;
        user.rewardPoints = 25; // 25 welcome bonus

        // Award 50 points to referrer
        referrer.rewardPoints = (referrer.rewardPoints || 0) + 50;
        await referrer.save();

        // Audit log
        await ReferralLog.create({
          referrerId: referrer._id,
          referredUserId: user._id,
          referralCodeUsed: incomingRefCode,
          pointsAwarded: 50,
          refereeBonusPoints: 25,
          status: 'rewarded',
        }).catch((err) => console.warn('ReferralLog duplicate ignored:', err.message));
      }
    }

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: user._id.toString(),
      user: {
        id: user._id,
        name: user.name,
        capitrackId: user.capitrackId,
        referralCode: user.referralCode,
        rewardPoints: user.rewardPoints || 0,
        preferredLanguage: user.preferredLanguage,
        currencySymbol: user.currencySymbol,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error creating account',
    });
  }
};

/**
 * Log in with Name and Password.
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { name, password, deviceId } = req.body;

    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your name.',
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your password.',
      });
    }

    const escaped = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No account found with the name "${trimmedName}". Please sign up first.`,
      });
    }

    // Verify password if set
    if (user.password) {
      const isMatch = user.verifyPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Please try again.',
        });
      }
    } else {
      // Legacy user setting password on first login
      user.password = User.hashPassword(password);
    }

    if (deviceId) {
      user.deviceId = deviceId.trim();
    }
    if (!user.capitrackId) {
      user.capitrackId = user.name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);
    }
    if (!user.referralCode) {
      user.referralCode = 'CT' + (user.name.slice(0, 3) || 'CAP').toUpperCase() + Math.floor(100 + Math.random() * 900);
    }
    await user.save();

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token: user._id.toString(),
      user: {
        id: user._id,
        name: user.name,
        capitrackId: user.capitrackId,
        referralCode: user.referralCode,
        rewardPoints: user.rewardPoints || 0,
        preferredLanguage: user.preferredLanguage,
        currencySymbol: user.currencySymbol,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error during login',
    });
  }
};

/**
 * Get current session profile.
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    if (!user.capitrackId || !user.referralCode) {
      user.capitrackId = user.capitrackId || user.name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);
      user.referralCode = user.referralCode || 'CT' + (user.name.slice(0, 3) || 'CAP').toUpperCase() + Math.floor(100 + Math.random() * 900);
      await user.save().catch(() => {});
    }
    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        capitrackId: user.capitrackId,
        referralCode: user.referralCode,
        rewardPoints: user.rewardPoints || 0,
        preferredLanguage: user.preferredLanguage,
        currencySymbol: user.currencySymbol,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Error retrieving user profile',
    });
  }
};

/**
 * Change current user password.
 * POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User session not found. Please log in again.',
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 4 characters long.',
      });
    }

    // If user already has a password, verify current password
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Please enter your current password.',
        });
      }

      const isMatch = user.verifyPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }
    }

    user.password = User.hashPassword(newPassword);
    await user.save();

    return res.json({
      success: true,
      message: 'Password updated successfully!',
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error updating password',
    });
  }
};
