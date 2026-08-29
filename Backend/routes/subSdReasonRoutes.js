const express = require('express');
const {
    addSubSdReasonController,
    getAllSubSdReasonsController,
    getSubSdReasonByIdController,
    updateSubSdReasonController,
    toggleSubSdReasonActiveController,
    deleteSubSdReasonController
} = require('../controllers/subSdReasonController');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', verifyPermission('sub_sd_reason', 'write'), addSubSdReasonController);
router.get('/', verifyPermission('sub_sd_reason', 'read'), getAllSubSdReasonsController);
router.get('/:id', verifyPermission('sub_sd_reason', 'read'), getSubSdReasonByIdController);
router.put('/:id', verifyPermission('sub_sd_reason', 'update'), updateSubSdReasonController);
router.patch('/toggle/:id', verifyPermission('sub_sd_reason', 'update'), toggleSubSdReasonActiveController);
router.delete('/:id', verifyPermission('sub_sd_reason', 'delete'), deleteSubSdReasonController);

module.exports = router;
