const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.post('/:id/payments', projectController.addPayment);
router.put('/:id/payments/:paymentId', projectController.updatePayment);
router.delete('/:id/payments/:paymentId', projectController.deletePayment);
router.delete('/:id', projectController.deleteProject);

module.exports = router;

