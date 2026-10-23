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
    updateWorkOrderController,
    startWorkOrderController,
    stopWorkOrderController,
    completeWorkOrderController,
    restartWorkOrderController,
    reopenWorkOrderController,
    holdWorkOrderController,
    resumeWorkOrderController,
    getWorkOrderReportsController,
    downloadWorkOrderExcelController,
    downloadWorkOrderTabularExcelController
} = require("../controllers/workOrderController.js");

const router = express.Router();

router.post("/add", verifyToken, verifyPermission("work_order", "write"), addWorkOrder);
router.get("/reports", verifyToken, verifyPermission("work_order", "read"), getWorkOrderReportsController);
router.get("/all", verifyToken, verifyPermission("work_order", "read"), getAllWorkOrdersController);
router.get("/next-number", verifyToken, verifyPermission("work_order", "read"), getNextWorkOrderNoController);
router.get("/material-stock/:materialId", verifyToken, verifyPermission("work_order", "read"), getMaterialStockController);
router.get("/tabular-excel", verifyToken, verifyPermission("work_order", "read"), downloadWorkOrderTabularExcelController);
router.get("/:id/tabular-excel", verifyToken, verifyPermission("work_order", "read"), downloadWorkOrderTabularExcelController);
router.get("/:id/excel", verifyToken, verifyPermission("work_order", "read"), downloadWorkOrderExcelController);
router.get("/:id", verifyToken, verifyPermission("work_order", "read"), getWorkOrderByIdController);
router.put("/item/:id/delay", verifyToken, verifyPermission("work_order", "update"), updateWorkOrderItemDelayController);
router.put("/item/:id/priority", verifyToken, verifyPermission("work_order", "update"), updateWorkOrderItemPriorityController);
router.put("/item/:id/remarks", verifyToken, verifyPermission("work_order", "update"), updateWorkOrderItemRemarksController);
router.put("/update/:id", verifyToken, verifyPermission("work_order", "update"), updateWorkOrderController);
router.put("/start/:id", verifyToken, verifyPermission("work_order", "update"), startWorkOrderController);
router.put("/stop/:id", verifyToken, verifyPermission("work_order", "update"), stopWorkOrderController);
router.put("/hold/:id", verifyToken, verifyPermission("work_order", "update"), holdWorkOrderController);
router.put("/resume/:id", verifyToken, verifyPermission("work_order", "update"), resumeWorkOrderController);
router.put("/complete/:id", verifyToken, verifyPermission("work_order", "update"), completeWorkOrderController);
router.put("/restart/:id", verifyToken, verifyPermission("work_order", "update"), restartWorkOrderController);
router.put("/reopen/:id", verifyToken, verifyPermission("work_order", "update"), reopenWorkOrderController);
router.delete("/delete/:id", verifyToken, verifyPermission("work_order", "delete"), deleteWorkOrderController);

module.exports = router;
