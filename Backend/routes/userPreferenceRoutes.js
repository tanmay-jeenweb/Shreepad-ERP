const express = require("express");
const { getPreferenceController, savePreferenceController } = require("../controllers/userPreferenceController.js");
const { verifyToken } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/:tableId", verifyToken, getPreferenceController);
router.post("/:tableId", verifyToken, savePreferenceController);

module.exports = router;
