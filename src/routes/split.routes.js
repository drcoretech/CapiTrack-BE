const express = require('express');
const router = express.Router();
const splitController = require('../controllers/split.controller');

router.get('/', splitController.getSplitBills);
router.post('/', splitController.createSplitBill);
router.post('/:id/settle/:participantId', splitController.settleParticipant);
router.delete('/:id', splitController.deleteSplitBill);

module.exports = router;
