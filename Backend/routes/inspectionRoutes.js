const express = require('express');
const {
    addInspection,
    getAllInspectionsController,
    updateInspectionController,
    deleteInspectionController
} = require('../controllers/inspectionController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('inspection', 'write'), addInspection);
router.get('/all', verifyToken, verifyPermission('inspection', 'read'), getAllInspectionsController);
router.put('/update/:id', verifyToken, verifyPermission('inspection', 'update'), updateInspectionController);
router.delete('/delete/:id', verifyToken, verifyPermission('inspection', 'delete'), deleteInspectionController);

module.exports = router;
