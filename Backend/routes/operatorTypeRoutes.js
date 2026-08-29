const express = require('express');
const {
    addOperatorType,
    getAllOperatorTypesController,
    updateOperatorTypeController,
    deleteOperatorTypeController
} = require('../controllers/operatorTypeController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('operator_type', 'write'), addOperatorType);
router.get('/all', verifyToken, verifyPermission('operator_type', 'read'), getAllOperatorTypesController);
router.put('/update/:id', verifyToken, verifyPermission('operator_type', 'update'), updateOperatorTypeController);
router.delete('/delete/:id', verifyToken, verifyPermission('operator_type', 'delete'), deleteOperatorTypeController);

module.exports = router;
