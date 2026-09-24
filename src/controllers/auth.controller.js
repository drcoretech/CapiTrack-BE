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

    const user = await User.create({
      name: trimmedName,
      password: hashedPassword,
      deviceId: deviceId ? deviceId.trim() : undefined,
      preferredLanguage: preferredLanguage || 'en',
      currency: 'INR',
      currencySymbol: '₹',
      preferences: {
        autoCaptureEnabled: false,
        darkMode: false,
        businessTrackingEnabled: !!businessTrackingEnabled,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: user._id.toString(),
      user: {
        id: user._id,
        name: user.name,
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
    await user.save();

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token: user._id.toString(),
      user: {
        id: user._id,
        name: user.name,
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
    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
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
