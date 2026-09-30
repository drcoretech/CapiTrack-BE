const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');

router.post('/', groupController.createGroup);
router.get('/', groupController.getMyGroups);
router.post('/join', groupController.joinGroupByCode);
router.get('/:id', groupController.getGroupDetails);

module.exports = router;
