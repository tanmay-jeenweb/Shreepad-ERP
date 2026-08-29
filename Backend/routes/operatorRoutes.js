const express = require('express');
const {
    addOperator,
    getAllOperatorsController,
    getOperatorByIdController,
    updateOperatorController,
    toggleOperatorActiveController,
    deleteOperatorController
} = require('../controllers/operatorController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('operator', 'write'), addOperator);
router.get('/all', verifyToken, verifyPermission('operator', 'read'), getAllOperatorsController);
router.get('/:id', verifyToken, verifyPermission('operator', 'read'), getOperatorByIdController);
router.put('/update/:id', verifyToken, verifyPermission('operator', 'update'), updateOperatorController);
router.patch('/toggle/:id', verifyToken, verifyPermission('operator', 'update'), toggleOperatorActiveController);
router.delete('/delete/:id', verifyToken, verifyPermission('operator', 'delete'), deleteOperatorController);

module.exports = router;
