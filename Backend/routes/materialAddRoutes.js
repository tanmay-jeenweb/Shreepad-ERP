const express = require('express');
const router = express.Router();
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');
const {
    createMaterialAddHandler,
    getAllMaterialAddsHandler,
    getMaterialAddByIdHandler,
    updateMaterialAddHandler,
    deleteMaterialAddHandler
} = require('../controllers/materialAddController.js');

router.use(verifyToken);

router.post('/add', verifyPermission('material_add', 'write'), createMaterialAddHandler);
router.get('/all', verifyPermission('material_add', 'read'), getAllMaterialAddsHandler);
router.get('/:id', verifyPermission('material_add', 'read'), getMaterialAddByIdHandler);
router.put('/update/:id', verifyPermission('material_add', 'update'), updateMaterialAddHandler);
router.delete('/delete/:id', verifyPermission('material_add', 'delete'), deleteMaterialAddHandler);

module.exports = router;
