const User = require('../models/User');

/**
 * Resolves the active user based on the request.
 * Checks:
 * 1. 'x-user-name' header
 * 2. 'userName' query parameter
 * 3. Body 'userName' or 'name'
 *
 * If a matching user is found by name (case-insensitive), returns it.
 * If not, creates a fresh user with that name so their expenses and contacts
 * are completely isolated and never shared with other users.
 */
const getRequestUser = async (req) => {
  const headerName = req.headers['x-user-name'];
  const queryName = req.query ? req.query.userName : null;
  const bodyName = req.body ? (req.body.userName || req.body.name) : null;

  const rawName = (headerName || queryName || bodyName || '').trim();

  if (rawName) {
    const escaped = rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let user = await User.findOne({
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });

    if (!user) {
      user = await User.create({
        name: rawName,
        preferredLanguage: 'en',
        currency: 'INR',
        currencySymbol: '₹',
        preferences: {
          autoCaptureEnabled: false,
          darkMode: false,
        },
      });
    }

    return user;
  }

  // Fallback to first user in database or create default
  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      name: 'Digvijay',
      preferredLanguage: 'en',
      currency: 'INR',
      currencySymbol: '₹',
      preferences: {
        autoCaptureEnabled: false,
        darkMode: false,
      },
    });
  }

  return user;
};

module.exports = { getRequestUser };
