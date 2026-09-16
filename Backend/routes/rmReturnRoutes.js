const express = require('express');
const router = express.Router();
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');
const {
    createRmReturnHandler,
    getAllRmReturnsHandler
} = require('../controllers/rmReturnController.js');

router.use(verifyToken);

router.post('/add', createRmReturnHandler);
router.get('/all', getAllRmReturnsHandler);

module.exports = router;
