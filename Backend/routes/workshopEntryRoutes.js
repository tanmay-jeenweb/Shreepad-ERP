const express = require('express');
const {
    getAllWorkshopEntriesController,
    getWorkshopEntryDetailsController,
    saveWorkshopEntryController
} = require('../controllers/workshopEntryController.js');
const { verifyToken } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/', verifyToken, getAllWorkshopEntriesController);
router.get('/:id', verifyToken, getWorkshopEntryDetailsController);
router.post('/', verifyToken, saveWorkshopEntryController);

module.exports = router;
