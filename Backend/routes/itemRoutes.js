const express = require('express');
const {
    addItem,
    getAllItemsController,
    updateItemController,
    deleteItemController,
} = require('../controllers/itemController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('item', 'write'), addItem);
router.get('/all', verifyToken, verifyPermission('item', 'read'), getAllItemsController);
router.put('/update/:id', verifyToken, verifyPermission('item', 'update'), updateItemController);
router.delete('/delete/:id', verifyToken, verifyPermission('item', 'delete'), deleteItemController);

module.exports = router;
