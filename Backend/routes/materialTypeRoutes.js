const express = require('express');
const {
    addMaterialType,
    getAllMaterialTypesController,
    updateMaterialTypeController,
    deleteMaterialTypeController,
} = require('../controllers/materialTypeController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('material_type', 'write'), addMaterialType);
router.get('/all', verifyToken, verifyPermission('material_type', 'read'), getAllMaterialTypesController);
router.put('/update/:id', verifyToken, verifyPermission('material_type', 'update'), updateMaterialTypeController);
router.delete('/delete/:id', verifyToken, verifyPermission('material_type', 'delete'), deleteMaterialTypeController);

module.exports = router;
