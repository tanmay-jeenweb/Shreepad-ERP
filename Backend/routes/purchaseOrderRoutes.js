const express = require('express');
const {
    addPOController,
    getAllPOsController,
    getPOByIdController,
    updatePOController,
    deletePOController,
    getMaterialTypesController,
    getMaterialsByTypeController,
    getVendorsForPOController,
    revisePOController,
} = require('../controllers/purchaseOrderController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.use(verifyToken);

// Helper routes (no strict permission — used for dropdowns in the PO form)
router.get('/material-types', getMaterialTypesController);
router.get('/materials-by-type', getMaterialsByTypeController);
router.get('/vendors', getVendorsForPOController);

// CRUD
router.post('/add',        verifyPermission('purchase_order', 'write'),  addPOController);
router.post('/revise/:id', verifyPermission('purchase_order', 'update'), revisePOController);
router.get('/all',         verifyPermission('purchase_order', 'read'),   getAllPOsController);
router.get('/:id',         verifyPermission('purchase_order', 'read'),   getPOByIdController);
router.put('/update/:id',  verifyPermission('purchase_order', 'update'), updatePOController);
router.delete('/delete/:id', verifyPermission('purchase_order', 'delete'), deletePOController);

module.exports = router;
