const express = require('express');
const {
    addLocationType,
    getAllLocationTypesController,
    updateLocationTypeController,
    deleteLocationTypeController
} = require('../controllers/locationTypeController.js');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('location_type', 'write'), addLocationType);
router.get('/all', verifyToken, verifyPermission('location_type', 'read'), getAllLocationTypesController);
router.put('/update/:id', verifyToken, verifyPermission('location_type', 'update'), updateLocationTypeController);
router.delete('/delete/:id', verifyToken, verifyPermission('location_type', 'delete'), deleteLocationTypeController);

module.exports = router;
