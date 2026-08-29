const express = require("express");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");
const {
    addWorkOrder,
    getAllWorkOrdersController,
    getWorkOrderByIdController,
    getNextWorkOrderNoController,
    deleteWorkOrderController,
    getMaterialStockController,
    updateWorkOrderItemDelayController,
    updateWorkOrderItemPriorityController,
    updateWorkOrderItemRemarksController,
    updateWorkOrderController
} = require("../controllers/workOrderController.js");

const router = express.Router();

router.post("/add", verifyToken, verifyPermission("work_order", "write"), addWorkOrder);
router.get("/all", verifyToken, verifyPermission("work_order", "read"), getAllWorkOrdersController);
router.get("/next-number", verifyToken, verifyPermission("work_order", "read"), getNextWorkOrderNoController);
router.get("/material-stock/:materialId", verifyToken, verifyPermission("work_order", "read"), getMaterialStockController);
router.get("/:id", verifyToken, verifyPermission("work_order", "read"), getWorkOrderByIdController);
router.put("/item/:id/delay", verifyToken, verifyPermission("work_order", "update"), updateWorkOrderItemDelayController);
router.put("/item/:id/priority", verifyToken, verifyPermission("work_order", "update"), updateWorkOrderItemPriorityController);
router.put("/item/:id/remarks", verifyToken, verifyPermission("work_order", "update"), updateWorkOrderItemRemarksController);
router.put("/update/:id", verifyToken, verifyPermission("work_order", "update"), updateWorkOrderController);
router.delete("/delete/:id", verifyToken, verifyPermission("work_order", "delete"), deleteWorkOrderController);

module.exports = router;
