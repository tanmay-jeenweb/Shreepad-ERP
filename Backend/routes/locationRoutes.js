const express = require("express");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");
const { addLocation, getAllLocationsController, updateLocationController, deleteLocationController, toggleLocationActiveController } = require("../controllers/locationController.js");

const router = express.Router();

router.post("/add", verifyToken, verifyPermission('location', 'write'), addLocation);
router.get("/all", verifyToken, verifyPermission('location', 'read'), getAllLocationsController);
router.put("/update/:id", verifyToken, verifyPermission('location', 'update'), updateLocationController);
router.patch("/toggle/:id", verifyToken, verifyPermission('location', 'update'), toggleLocationActiveController);
router.delete("/delete/:id", verifyToken, verifyPermission('location', 'delete'), deleteLocationController);

module.exports = router;
