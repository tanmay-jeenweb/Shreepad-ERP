const express = require('express');
const {
    addMaterial,
    getAllMaterialsController,
    getMaterialByIdController,
    updateMaterialController,
    toggleMaterialActiveController,
    deleteMaterialController
} = require('../controllers/materialController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('material', 'write'), addMaterial);
router.get('/all', verifyToken, verifyPermission('material', 'read'), getAllMaterialsController);
router.get('/:id', verifyToken, verifyPermission('material', 'read'), getMaterialByIdController);
router.put('/update/:id', verifyToken, verifyPermission('material', 'update'), updateMaterialController);
router.patch('/toggle/:id', verifyToken, verifyPermission('material', 'update'), toggleMaterialActiveController);
router.delete('/delete/:id', verifyToken, verifyPermission('material', 'delete'), deleteMaterialController);

module.exports = router;
