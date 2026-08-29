const express = require("express");
const {
    getAllPOsForApproval,
    getPendingPOsController,
    approvePOController,
    rejectPOController,
    getApprovalLogsController
} = require("../controllers/poApprovalController.js");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/all", verifyToken, verifyPermission("po_approval", "read"), getAllPOsForApproval);
router.get("/pending", verifyToken, verifyPermission("po_approval", "read"), getPendingPOsController);
router.post("/:id/approve", verifyToken, verifyPermission("po_approval", "update"), approvePOController);
router.post("/:id/reject", verifyToken, verifyPermission("po_approval", "update"), rejectPOController);
router.get("/:id/logs", verifyToken, verifyPermission("po_approval", "read"), getApprovalLogsController);

module.exports = router;
