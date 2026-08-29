const express = require("express");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");
const { addMachineType, getAllMachineTypesController, updateMachineTypeController, deleteMachineTypeController } = require("../controllers/machineTypeController.js");

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('machine_type', 'write'), addMachineType);
router.get('/all', verifyToken, verifyPermission('machine_type', 'read'), getAllMachineTypesController);
router.put('/update/:id', verifyToken, verifyPermission('machine_type', 'update'), updateMachineTypeController);
router.delete('/delete/:id', verifyToken, verifyPermission('machine_type', 'delete'), deleteMachineTypeController);

module.exports = router;
