const express = require('express');
const {
    getOrganizationController,
    upsertOrganizationController
} = require('../controllers/organizationController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/', getOrganizationController);
router.post('/', verifyToken, verifyPermission('organization', 'write'), upsertOrganizationController);

module.exports = router;
