const express = require('express');
const {
    addClass,
    getAllClassesController,
    updateClassController,
    deleteClassController,
} = require('../controllers/classController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('class', 'write'), addClass);
router.get('/all', verifyToken, verifyPermission('class', 'read'), getAllClassesController);
router.put('/update/:id', verifyToken, verifyPermission('class', 'update'), updateClassController);
router.delete('/delete/:id', verifyToken, verifyPermission('class', 'delete'), deleteClassController);

module.exports = router;
