const express = require('express');
const {
    addUnit,
    getAllUnitsController,
    updateUnitController,
    deleteUnitController
} = require('../controllers/unitController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('unit', 'write'), addUnit);
router.get('/all', verifyToken, verifyPermission('unit', 'read'), getAllUnitsController);
router.put('/update/:id', verifyToken, verifyPermission('unit', 'update'), updateUnitController);
router.delete('/delete/:id', verifyToken, verifyPermission('unit', 'delete'), deleteUnitController);

module.exports = router;
