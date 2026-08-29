const express = require("express");

const {
    fetchUsers,
    createUserByAdmin,
    approveDeviceController,
    revokeDeviceController,
    fetchAuditLogs,
    fetchUserAuditLogs,
    fetchActivityLogs,
    fetchPendingDevices,
    toggleUserActiveController
} = require("../controllers/adminController.js");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/users", verifyToken, verifyAdmin, fetchUsers);
router.post("/create-user", verifyToken, verifyAdmin, createUserByAdmin);
router.patch("/user/:id/toggle-active", verifyToken, verifyAdmin, toggleUserActiveController);

router.get("/pending-devices", verifyToken, verifyAdmin, fetchPendingDevices);
router.put("/approve-device/:deviceRowId", verifyToken, verifyAdmin, approveDeviceController);
router.put("/revoke-device/:userId", verifyToken, verifyAdmin, revokeDeviceController);

router.get("/audit-logs", verifyToken, verifyAdmin, fetchAuditLogs);
router.get("/audit-logs/:userId", verifyToken, verifyAdmin, fetchUserAuditLogs);
router.get('/activity-logs', verifyToken, fetchActivityLogs);

module.exports = router;    