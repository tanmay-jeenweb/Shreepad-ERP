const express = require('express');
const {
    addReasonForDelay,
    getAllReasonsForDelayController,
    getReasonForDelayByIdController,
    updateReasonForDelayController,
    deleteReasonForDelayController
} = require('../controllers/reasonForDelayController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('reason_for_delay', 'write'), addReasonForDelay);
router.get('/all', verifyToken, verifyPermission('reason_for_delay', 'read'), getAllReasonsForDelayController);
router.get('/:id', verifyToken, verifyPermission('reason_for_delay', 'read'), getReasonForDelayByIdController);
router.put('/update/:id', verifyToken, verifyPermission('reason_for_delay', 'update'), updateReasonForDelayController);
router.delete('/delete/:id', verifyToken, verifyPermission('reason_for_delay', 'delete'), deleteReasonForDelayController);

module.exports = router;
