const express = require("express");
const {
    getAllSOsForApproval,
    getPendingSOsController,
    approveSOController,
    rejectSOController,
    getApprovalLogsController
} = require("../controllers/soApprovalController.js");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/all", verifyToken, verifyPermission("so_approval", "read"), getAllSOsForApproval);
router.get("/pending", verifyToken, verifyPermission("so_approval", "read"), getPendingSOsController);
router.post("/:id/approve", verifyToken, verifyPermission("so_approval", "update"), approveSOController);
router.post("/:id/reject", verifyToken, verifyPermission("so_approval", "update"), rejectSOController);
router.get("/:id/logs", verifyToken, verifyPermission("so_approval", "read"), getApprovalLogsController);

module.exports = router;
