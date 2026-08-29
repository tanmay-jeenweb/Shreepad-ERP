const express = require('express');
const {
    addJobParty,
    getAllJobPartiesController,
    getJobPartyByIdController,
    updateJobPartyController,
    deleteJobPartyController
} = require('../controllers/jobPartyController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('job_party', 'write'), addJobParty);
router.get('/all', verifyToken, verifyPermission('job_party', 'read'), getAllJobPartiesController);
router.get('/:id', verifyToken, verifyPermission('job_party', 'read'), getJobPartyByIdController);
router.put('/update/:id', verifyToken, verifyPermission('job_party', 'update'), updateJobPartyController);
router.delete('/delete/:id', verifyToken, verifyPermission('job_party', 'delete'), deleteJobPartyController);

module.exports = router;
