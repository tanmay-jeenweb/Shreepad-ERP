const express = require("express");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");
const { addMachine, getAllMachinesController, getMachineByIdController, updateMachineController, toggleMachineActiveController, deleteMachineController } = require("../controllers/machineController.js");

const router = express.Router();

router.post('/add', verifyToken, verifyPermission('machine', 'write'), addMachine);
router.get('/all', verifyToken, verifyPermission('machine', 'read'), getAllMachinesController);
router.get('/:id', verifyToken, verifyPermission('machine', 'read'), getMachineByIdController);
router.put('/update/:id', verifyToken, verifyPermission('machine', 'update'), updateMachineController);
router.patch('/:id/toggle-active', verifyToken, verifyPermission('machine', 'update'), toggleMachineActiveController);
router.delete('/delete/:id', verifyToken, verifyPermission('machine', 'delete'), deleteMachineController);

module.exports = router;
