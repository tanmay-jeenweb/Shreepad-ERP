const express = require('express');
const {
    getPMemoDetails,
    addPMemo,
    getAvailableBatchesController
} = require('../controllers/pmemoController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/work-order-item/:workOrderItemId', verifyToken, verifyPermission('bom', 'read'), getPMemoDetails);
router.post('/add', verifyToken, verifyPermission('bom', 'write'), addPMemo);
router.get('/stock-batches', verifyToken, verifyPermission('bom', 'read'), getAvailableBatchesController);

module.exports = router;
