const express = require('express');
const {
    getSettingsController,
    getBatchSettingsController,
    upsertSettingsController
} = require('../controllers/settingMasterController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/get', verifyToken, verifyPermission('setting_master', 'read'), getSettingsController);
router.get('/batch-config', verifyToken, getBatchSettingsController);
router.post('/save', verifyToken, verifyPermission('setting_master', 'write'), upsertSettingsController);

module.exports = router;
