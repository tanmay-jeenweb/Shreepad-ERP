const express = require('express');
const {
    addDocumentMaster,
    getAllDocumentMastersController,
    updateDocumentMasterController,
    deleteDocumentMasterController
} = require('../controllers/documentController');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, verifyPermission('document', 'read'), getAllDocumentMastersController);
router.post('/', verifyToken, verifyPermission('document', 'write'), addDocumentMaster);
router.put('/:id', verifyToken, verifyPermission('document', 'update'), updateDocumentMasterController);
router.delete('/:id', verifyToken, verifyPermission('document', 'delete'), deleteDocumentMasterController);

module.exports = router;
