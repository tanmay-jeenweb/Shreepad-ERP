const express = require('express');
const {
    addProcessController,
    getAllProcessesController,
    updateProcessController,
    deleteProcessController
} = require('../controllers/processMasterController.js');
const { verifyToken } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.use(verifyToken);

router.post('/', addProcessController);
router.get('/', getAllProcessesController);
router.put('/:id', updateProcessController);
router.delete('/:id', deleteProcessController);

module.exports = router;
