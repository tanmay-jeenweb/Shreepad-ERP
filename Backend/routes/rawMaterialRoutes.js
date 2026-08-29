const express = require('express');
const {
    addRawMaterial,
    getAllRawMaterialsController,
    getRawMaterialByIdController,
    updateRawMaterialController,
    deleteRawMaterialController
} = require('../controllers/rawMaterialController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('raw_material', 'write'), addRawMaterial);
router.get('/all', verifyToken, verifyPermission('raw_material', 'read'), getAllRawMaterialsController);
router.get('/:id', verifyToken, verifyPermission('raw_material', 'read'), getRawMaterialByIdController);
router.put('/update/:id', verifyToken, verifyPermission('raw_material', 'update'), updateRawMaterialController);
router.delete('/delete/:id', verifyToken, verifyPermission('raw_material', 'delete'), deleteRawMaterialController);

module.exports = router;
