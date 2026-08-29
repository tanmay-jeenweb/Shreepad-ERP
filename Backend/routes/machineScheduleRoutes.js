const express = require('express');
const router = express.Router();
const machineScheduleController = require('../controllers/machineScheduleController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, machineScheduleController.getMachineSchedule);
router.get('/next-slot/:machineId', verifyToken, machineScheduleController.getNextFreeSlot);
router.get('/queue', verifyToken, machineScheduleController.getMachineQueue);
router.put('/reorder', verifyToken, machineScheduleController.reorderMachineQueueItem);
router.put('/reorder-to', verifyToken, machineScheduleController.moveToPosition);
router.put('/hold', verifyToken, machineScheduleController.toggleHold);

module.exports = router;
