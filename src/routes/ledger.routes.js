const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledger.controller');

router.get('/contacts', ledgerController.getContacts);
router.get('/contacts/:id', ledgerController.getContactDetail);
router.post('/transactions', ledgerController.addTransaction);
router.post('/contacts/:id/settle', ledgerController.settleContact);

module.exports = router;
