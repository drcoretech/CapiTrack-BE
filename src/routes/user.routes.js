const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

router.get('/profile', userController.getProfile);
router.put('/preferences', userController.updatePreferences);

module.exports = router;
