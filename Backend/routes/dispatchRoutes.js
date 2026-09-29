const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController.js');
const { verifyToken } = require('../middleware/authMiddleware.js');

router.use(verifyToken);

router.get('/available-batches', dispatchController.getAvailableStockBatches);
router.get('/work-orders', dispatchController.getWorkOrdersForDispatch);
router.post('/work-order', dispatchController.createWorkOrderDispatch);
router.get('/', dispatchController.getAllDispatches);
router.post('/', dispatchController.createDispatch);
router.get('/:id', dispatchController.getDispatchById);

module.exports = router;
