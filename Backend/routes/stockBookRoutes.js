const express = require('express');
const router = express.Router();
const stockBookController = require('../controllers/stockBookController.js');
const { verifyToken } = require('../middleware/authMiddleware.js');

router.use(verifyToken);

router.get('/', stockBookController.getStockBookRecords);
router.post('/issue', stockBookController.createStockIssue);
router.get('/issues/:materialId', stockBookController.getStockIssueLogs);
router.get('/active-batches', stockBookController.getActiveBatches);
router.post('/remove-material', stockBookController.removeMaterialStock);

module.exports = router;
