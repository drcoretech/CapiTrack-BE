const User = require('../models/User');
const ReferralLog = require('../models/ReferralLog');
const { getRequestUser } = require('../utils/userHelper');

exports.getProfile = async (req, res) => {
  try {
    const user = await getRequestUser(req);

    // Auto-populate missing handle/referralCode for legacy users
    if (!user.capitrackId || !user.referralCode) {
      user.capitrackId = user.capitrackId || user.name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);
      user.referralCode = user.referralCode || 'CT' + (user.name.slice(0, 3) || 'CAP').toUpperCase() + Math.floor(100 + Math.random() * 900);
      await user.save().catch(() => {});
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        capitrackId: user.capitrackId,
        referralCode: user.referralCode,
        rewardPoints: user.rewardPoints || 0,
        phone: user.phone || '',
        currency: user.currency,
        currencySymbol: user.currencySymbol,
        preferredLanguage: user.preferredLanguage,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Check if a user with phone / handle exists on CapiTrack
 * GET /api/users/check-member?query=...
 */
exports.checkMember = async (req, res) => {
  try {
    const query = (req.query.query || '').trim().replace(/^@/, '');
    if (!query || query.length < 3) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 3 characters' });
    }

    const cleanDigits = query.replace(/[^0-9]/g, '');

    // Check by capitrackId, phone, or name
    const conditions = [
      { capitrackId: { $regex: new RegExp(`^${query}$`, 'i') } },
      { name: { $regex: new RegExp(`^${query}$`, 'i') } },
    ];
    if (cleanDigits.length >= 10) {
      conditions.push({ phone: { $regex: new RegExp(`${cleanDigits}$`) } });
    }

    const matchedUser = await User.findOne({ $or: conditions }).select('_id name capitrackId phone');

    if (matchedUser) {
      return res.json({
        success: true,
        exists: true,
        user: {
          id: matchedUser._id,
          name: matchedUser.name,
          capitrackId: matchedUser.capitrackId || matchedUser.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
          phone: matchedUser.phone || '',
        },
      });
    }

    return res.json({
      success: true,
      exists: false,
    });
  } catch (error) {
    console.error('Error checking member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Rewards summary & referral list for current user
 * GET /api/users/rewards
 */
exports.getRewards = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const referrals = await ReferralLog.find({ referrerId: user._id })
      .populate('referredUserId', 'name capitrackId createdAt')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      rewards: {
        pointsBalance: user.rewardPoints || 0,
        referralCode: user.referralCode || '',
        capitrackId: user.capitrackId || '',
        totalFriendsReferred: referrals.length,
        inviteUrl: `https://capitrack.vercel.app/?ref=${user.referralCode}`,
        referrals: referrals.map((r) => ({
          id: r._id,
          name: r.referredUserId ? r.referredUserId.name : 'CapiTrack Friend',
          points: r.pointsAwarded,
          date: r.createdAt,
        })),
        redemptionStatus: 'coming_soon',
      },
    });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { preferredLanguage, autoCaptureEnabled, darkMode, name } = req.body;

    const user = await getRequestUser(req);

    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (preferredLanguage) {
      user.preferredLanguage = preferredLanguage;
    }
    if (typeof autoCaptureEnabled === 'boolean') {
      user.preferences.autoCaptureEnabled = autoCaptureEnabled;
    }
    if (typeof darkMode === 'boolean') {
      user.preferences.darkMode = darkMode;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      user: {
        id: user._id,
        name: user.name,
        preferredLanguage: user.preferredLanguage,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

