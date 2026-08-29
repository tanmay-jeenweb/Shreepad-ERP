const express = require('express');
const router = express.Router();
const qcController = require('../controllers/qcController.js');
const { verifyToken } = require('../middleware/authMiddleware.js');

router.use(verifyToken);

router.get('/pending', qcController.getPendingQcGrns);
router.get('/pending-items/:id', qcController.getPendingQcItemsByGrnId);
router.get('/pending-mas', qcController.getPendingQcMas);
router.get('/pending-items/ma/:id', qcController.getPendingQcItemsByMaId);
router.get('/history', qcController.getAllQcHistoryLogs);
router.get('/', qcController.getAllQcDocuments);
router.get('/:id', qcController.getQcById);
router.post('/create', qcController.createQcDocument);

module.exports = router;
