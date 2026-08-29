const express = require('express');
const router = express.Router();
const stockStatusController = require('../controllers/stockStatusController.js');
const { verifyToken } = require('../middleware/authMiddleware.js');

router.use(verifyToken);

router.get('/', stockStatusController.getAllStockStatus);

module.exports = router;
