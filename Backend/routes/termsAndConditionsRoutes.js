const express = require('express');
const {
    addTermsController,
    getAllTermsController,
    getTermsByIdController,
    updateTermsController,
    deleteTermsController
} = require('../controllers/termsAndConditionsController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('terms_and_conditions', 'write'), addTermsController);
router.get('/all', verifyToken, verifyPermission('terms_and_conditions', 'read'), getAllTermsController);
router.get('/:id', verifyToken, verifyPermission('terms_and_conditions', 'read'), getTermsByIdController);
router.put('/update/:id', verifyToken, verifyPermission('terms_and_conditions', 'update'), updateTermsController);
router.delete('/delete/:id', verifyToken, verifyPermission('terms_and_conditions', 'delete'), deleteTermsController);

module.exports = router;
