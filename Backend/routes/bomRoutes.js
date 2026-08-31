const express = require('express');
const {
    getProductsController,
    addBOM,
    getAllBOMsController,
    updateBOMController,
    deleteBOMController,
    getBOMByMaterialIdController,
} = require('../controllers/bomController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/products',             verifyToken, verifyPermission('bom', 'read'),   getProductsController);
router.get('/all',                  verifyToken, verifyPermission('bom', 'read'),   getAllBOMsController);
router.get('/by-material/:materialId', verifyToken, verifyPermission('bom', 'read'), getBOMByMaterialIdController);
router.post('/add',                 verifyToken, verifyPermission('bom', 'write'),  addBOM);
router.put('/update/:id',           verifyToken, verifyPermission('bom', 'update'), updateBOMController);
router.delete('/delete/:id',        verifyToken, verifyPermission('bom', 'delete'), deleteBOMController);

module.exports = router;
