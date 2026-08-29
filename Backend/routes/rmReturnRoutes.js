const express = require('express');
const router = express.Router();
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');
const {
    createRmReturnHandler,
    getAllRmReturnsHandler
} = require('../controllers/rmReturnController.js');

router.use(verifyToken);

router.post('/add', verifyPermission('bom', 'write'), createRmReturnHandler);
router.get('/all', verifyPermission('bom', 'read'), getAllRmReturnsHandler);

module.exports = router;
