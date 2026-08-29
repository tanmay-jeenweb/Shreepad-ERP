const express = require("express");
const router = express.Router();
const workingHourController = require("../controllers/workingHourController.js");
const { verifyToken } = require("../middleware/authMiddleware.js");

// Enforce authentication on all working hours endpoints
router.use(verifyToken);

router.get("/", workingHourController.getWorkingHours);
router.post("/create", workingHourController.createWorkingHours);
router.get("/:id", workingHourController.getWorkingHourById);
router.put("/:id", workingHourController.updateWorkingHours);

module.exports = router;
