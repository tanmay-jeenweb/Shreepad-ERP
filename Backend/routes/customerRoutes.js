const express = require('express');
const {
    addCustomerController,
    getAllCustomersController,
    getCustomerByIdController,
    updateCustomerController,
    toggleCustomerActiveController,
    deleteCustomerController
} = require('../controllers/customerController');
const { verifyToken, verifyPermission } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/add',              verifyToken, verifyPermission('customer', 'write'),  addCustomerController);
router.get('/all',               verifyToken, verifyPermission('customer', 'read'),   getAllCustomersController);
router.get('/:id',               verifyToken, verifyPermission('customer', 'read'),   getCustomerByIdController);
router.put('/update/:id',        verifyToken, verifyPermission('customer', 'update'), updateCustomerController);
router.patch('/toggle/:id',      verifyToken, verifyPermission('customer', 'update'), toggleCustomerActiveController);
router.delete('/delete/:id',     verifyToken, verifyPermission('customer', 'delete'), deleteCustomerController);

module.exports = router;
