const User = require('../models/User');
const { getRequestUser } = require('../utils/userHelper');

exports.getProfile = async (req, res) => {
  try {
    const user = await getRequestUser(req);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
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
