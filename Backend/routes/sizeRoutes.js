const express = require('express');
const {
    addSize,
    getAllSizesController,
    updateSizeController,
    deleteSizeController,
} = require('../controllers/sizeController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('size', 'write'), addSize);
router.get('/all', verifyToken, verifyPermission('size', 'read'), getAllSizesController);
router.put('/update/:id', verifyToken, verifyPermission('size', 'update'), updateSizeController);
router.delete('/delete/:id', verifyToken, verifyPermission('size', 'delete'), deleteSizeController);

module.exports = router;
