const Group = require('../models/Group');
const SplitBill = require('../models/SplitBill');
const User = require('../models/User');
const { getRequestUser } = require('../utils/userHelper');

/**
 * Generate a unique 6-character Group Code
 */
const generateGroupCode = async () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < 10; i++) {
    const prefix = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const code = `${prefix}-${num}`;
    const exists = await Group.findOne({ groupCode: code });
    if (!exists) return code;
  }
  return `GRP-${Date.now().toString().slice(-4)}`;
};

/**
 * Create a new Split Group
 * POST /api/groups
 */
exports.createGroup = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const { name, category, initialMembers } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const groupCode = await generateGroupCode();

    // The creator is automatically added as admin
    const membersList = [
      {
        userId: user._id,
        name: user.name,
        phone: user.phone || '',
        capitrackId: user.capitrackId || '',
        role: 'admin',
      },
    ];

    // If initial members were provided (e.g. from Khata contacts or phone)
    if (Array.isArray(initialMembers)) {
      for (const m of initialMembers) {
        if (!m.name) continue;
        // Avoid duplicate creator
        if (m.userId && m.userId.toString() === user._id.toString()) continue;

        membersList.push({
          userId: m.userId || null,
          name: m.name.trim(),
          phone: m.phone || '',
          capitrackId: m.capitrackId || '',
          role: 'member',
        });
      }
    }

    const group = await Group.create({
      name: name.trim(),
      groupCode,
      category: category || 'trip',
      createdBy: user._id,
      members: membersList,
      totalExpense: 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group,
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all groups for current user
 * GET /api/groups
 */
exports.getMyGroups = async (req, res) => {
  try {
    const user = await getRequestUser(req);

    const groups = await Group.find({
      $or: [
        { createdBy: user._id },
        { 'members.userId': user._id },
      ],
      active: true,
    }).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Join group using a 6-digit Group Code
 * POST /api/groups/join
 */
exports.joinGroupByCode = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const code = (req.body.code || '').trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide a valid Group Code' });
    }

    const group = await Group.findOne({ groupCode: code, active: true });
    if (!group) {
      return res.status(404).json({ success: false, message: `No active group found with code "${code}".` });
    }

    // Check if already in group
    const alreadyMember = group.members.some(
      (m) => (m.userId && m.userId.toString() === user._id.toString()) || (user.phone && m.phone === user.phone)
    );

    if (alreadyMember) {
      return res.json({
        success: true,
        message: 'You are already a member of this group',
        group,
      });
    }

    group.members.push({
      userId: user._id,
      name: user.name,
      phone: user.phone || '',
      capitrackId: user.capitrackId || '',
      role: 'member',
    });

    await group.save();

    return res.json({
      success: true,
      message: `Successfully joined "${group.name}"!`,
      group,
    });
  } catch (error) {
    console.error('Error joining group:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Group Details and its bills
 * GET /api/groups/:id
 */
exports.getGroupDetails = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const bills = await SplitBill.find({ groupId: group._id }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      group,
      bills,
    });
  } catch (error) {
    console.error('Error fetching group details:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
