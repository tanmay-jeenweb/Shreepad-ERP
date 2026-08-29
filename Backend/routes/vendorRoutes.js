const express = require('express');
const {
    addVendorController,
    getAllVendorsController,
    getVendorByIdController,
    updateVendorController,
    toggleVendorActiveController,
    deleteVendorController
} = require('../controllers/vendorController');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/add',              verifyToken, verifyPermission('vendor', 'write'),  addVendorController);
router.get('/all',               verifyToken, verifyPermission('vendor', 'read'),   getAllVendorsController);
router.get('/:id',               verifyToken, verifyPermission('vendor', 'read'),   getVendorByIdController);
router.put('/update/:id',        verifyToken, verifyPermission('vendor', 'update'), updateVendorController);
router.patch('/toggle/:id',      verifyToken, verifyPermission('vendor', 'update'), toggleVendorActiveController);
router.delete('/delete/:id',     verifyToken, verifyPermission('vendor', 'delete'), deleteVendorController);

module.exports = router;
