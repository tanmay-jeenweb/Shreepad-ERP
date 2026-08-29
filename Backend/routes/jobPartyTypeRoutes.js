const express = require('express');
const {
    addJobPartyType,
    getAllJobPartyTypesController,
    getJobPartyTypeByIdController,
    updateJobPartyTypeController,
    deleteJobPartyTypeController
} = require('../controllers/jobPartyTypeController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('job_party_type', 'write'), addJobPartyType);
router.get('/all', verifyToken, verifyPermission('job_party_type', 'read'), getAllJobPartyTypesController);
router.get('/:id', verifyToken, verifyPermission('job_party_type', 'read'), getJobPartyTypeByIdController);
router.put('/update/:id', verifyToken, verifyPermission('job_party_type', 'update'), updateJobPartyTypeController);
router.delete('/delete/:id', verifyToken, verifyPermission('job_party_type', 'delete'), deleteJobPartyTypeController);

module.exports = router;
