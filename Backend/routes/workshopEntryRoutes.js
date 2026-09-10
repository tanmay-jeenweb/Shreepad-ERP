const express = require('express');
const {
    getAllWorkshopEntriesController,
    getWorkshopEntryDetailsController,
    saveWorkshopEntryController,
    getShiftsController,
    saveShiftController,
    deleteShiftController,
    saveShiftLogController,
    deleteShiftLogController
} = require('../controllers/workshopEntryController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/', verifyToken, getAllWorkshopEntriesController);
router.get('/:id', verifyToken, getWorkshopEntryDetailsController);
router.post('/', verifyToken, saveWorkshopEntryController);

// Shift routes
router.get('/:pmemoId/shifts', verifyToken, getShiftsController);
router.post('/:pmemoId/shifts', verifyToken, saveShiftController);
router.delete('/shifts/:shiftId', verifyToken, deleteShiftController);

// Hourly Log routes
router.post('/shifts/:shiftId/logs', verifyToken, saveShiftLogController);
router.delete('/shift-logs/:logId', verifyToken, deleteShiftLogController);

module.exports = router;
