const express = require('express');
const {
    addReasonForDelayType,
    getAllReasonForDelayTypesController,
    updateReasonForDelayTypeController,
    deleteReasonForDelayTypeController
} = require('../controllers/reasonForDelayTypeController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('reason_for_delay_type', 'write'), addReasonForDelayType);
router.get('/all', verifyToken, verifyPermission('reason_for_delay_type', 'read'), getAllReasonForDelayTypesController);
router.put('/update/:id', verifyToken, verifyPermission('reason_for_delay_type', 'update'), updateReasonForDelayTypeController);
router.delete('/delete/:id', verifyToken, verifyPermission('reason_for_delay_type', 'delete'), deleteReasonForDelayTypeController);

module.exports = router;
