const express = require('express');
const {
    addMaterialGroup,
    getAllMaterialGroupsController,
    updateMaterialGroupController,
    deleteMaterialGroupController
} = require('../controllers/materialGroupController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('material_group', 'write'), addMaterialGroup);
router.get('/all', verifyToken, verifyPermission('material_group', 'read'), getAllMaterialGroupsController);
router.put('/update/:id', verifyToken, verifyPermission('material_group', 'update'), updateMaterialGroupController);
router.delete('/delete/:id', verifyToken, verifyPermission('material_group', 'delete'), deleteMaterialGroupController);

module.exports = router;
