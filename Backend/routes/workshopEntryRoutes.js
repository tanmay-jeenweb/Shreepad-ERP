const express = require('express');
const {
    getAllWorkshopEntriesController,
    getWorkshopEntryDetailsController,
    issueWorkshopRmController,
    getAvailableBatchesController,
    addWorkshopProductionLogController,
    deleteWorkshopProductionLogController
} = require('../controllers/workshopEntryController.js');
const { verifyToken } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/', verifyToken, getAllWorkshopEntriesController);
router.get('/stock-batches', verifyToken, getAvailableBatchesController);
router.post('/rm-issue', verifyToken, issueWorkshopRmController);
router.post('/production-log', verifyToken, addWorkshopProductionLogController);
router.delete('/production-log/:id', verifyToken, deleteWorkshopProductionLogController);
router.get('/:id', verifyToken, getWorkshopEntryDetailsController);

module.exports = router;
