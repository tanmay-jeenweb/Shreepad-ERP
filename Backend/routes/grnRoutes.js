const express = require('express');
const {
    addGrnController,
    getAllGrnsController,
    getGrnsUnifiedController,
    getGrnByIdController,
    updateGrnController,
    deleteGrnController,
    getJobPartiesForGrnController,
    getVendorsForGrnController,
    getNextBatchNumberController,
    partiallyCloseGrnController,
} = require('../controllers/grnController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.use(verifyToken);

// Helper routes (no strict permission — used for dropdowns)
router.get('/job-parties', getJobPartiesForGrnController);
router.get('/vendors',     getVendorsForGrnController);
router.get('/next-batch-number', getNextBatchNumberController);

// CRUD
router.post('/add',           verifyPermission('grn', 'write'),  addGrnController);
router.get('/all',            verifyPermission('grn', 'read'),   getAllGrnsController);
router.get('/unified',        verifyPermission('grn', 'read'),   getGrnsUnifiedController);
router.get('/:id',            verifyPermission('grn', 'read'),   getGrnByIdController);
router.put('/update/:id',     verifyPermission('grn', 'update'), updateGrnController);
router.put('/partially-close/:id', verifyPermission('grn', 'update'), partiallyCloseGrnController);
router.delete('/delete/:id',  verifyPermission('grn', 'delete'), deleteGrnController);

module.exports = router;
