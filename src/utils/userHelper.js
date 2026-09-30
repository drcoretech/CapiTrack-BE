const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Resolves the active user based on the request.
 * Prioritizes:
 * 1. 'x-user-id' header or Bearer token (Direct, precise account mapping)
 * 2. 'x-user-name' header or query/body name (Case-insensitive name matching)
 * 3. 'x-device-id' header
 */
const getRequestUser = async (req) => {
  // 1. Direct User ID lookup
  const authHeader = req.headers['authorization'];
  let tokenUserId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    tokenUserId = authHeader.substring(7).trim();
  }
  const explicitUserId = (req.headers['x-user-id'] || tokenUserId || '').trim();

  if (explicitUserId && mongoose.Types.ObjectId.isValid(explicitUserId)) {
    const userById = await User.findById(explicitUserId);
    if (userById) {
      return userById;
    }
  }

  // 2. Case-insensitive user name lookup
  const headerName = req.headers['x-user-name'];
  const queryName = req.query ? req.query.userName : null;
  const bodyName = req.body ? (req.body.userName || req.body.name) : null;
  const rawName = (headerName || queryName || bodyName || '').trim();

  if (rawName) {
    const escaped = rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const userByName = await User.findOne({
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });
    if (userByName) {
      return userByName;
    }
  }

  // 3. Device ID lookup
  const deviceId = (req.headers['x-device-id'] || '').trim();
  if (deviceId) {
    const userByDevice = await User.findOne({ deviceId });
    if (userByDevice) {
      return userByDevice;
    }
  }

  // 4. Fallback: if name provided, create user
  if (rawName) {
    const newUser = await User.create({
      name: rawName,
      preferredLanguage: 'en',
      currency: 'INR',
      currencySymbol: '₹',
      preferences: {
        autoCaptureEnabled: false,
        darkMode: false,
        businessTrackingEnabled: false,
      },
    });
    return newUser;
  }

  // 5. Final fallback to existing user or create initial user
  let fallbackUser = await User.findOne();
  if (!fallbackUser) {
    fallbackUser = await User.create({
      name: 'User',
      preferredLanguage: 'en',
      currency: 'INR',
      currencySymbol: '₹',
      preferences: {
        autoCaptureEnabled: false,
        darkMode: false,
        businessTrackingEnabled: false,
      },
    });
  }

  return fallbackUser;
};

module.exports = {
  getRequestUser,
};
