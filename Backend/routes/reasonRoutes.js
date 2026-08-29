const express = require('express');
const {
    addReasonController,
    getAllReasonsController,
    getReasonByIdController,
    updateReasonController,
    toggleReasonActiveController,
    deleteReasonController
} = require('../controllers/reasonController');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', verifyPermission('reason', 'write'), addReasonController);
router.get('/', verifyPermission('reason', 'read'), getAllReasonsController);
router.get('/:id', verifyPermission('reason', 'read'), getReasonByIdController);
router.put('/:id', verifyPermission('reason', 'update'), updateReasonController);
router.patch('/toggle/:id', verifyPermission('reason', 'update'), toggleReasonActiveController);
router.delete('/:id', verifyPermission('reason', 'delete'), deleteReasonController);

module.exports = router;
