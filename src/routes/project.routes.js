const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.post('/:id/payments', projectController.addPayment);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
