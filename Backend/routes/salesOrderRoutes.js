const express = require("express");
const {
    addSalesOrder,
    getSalesOrdersController,
    getSalesOrderByIdController,
    updateSalesOrderController,
    deleteSalesOrderController,
    reviseSalesOrderController
} = require("../controllers/salesOrderController.js");
const { verifyToken, verifyPermission } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", verifyToken, verifyPermission("sales_order", "write"), addSalesOrder);
router.get("/", verifyToken, verifyPermission("sales_order", "read"), getSalesOrdersController);
router.get("/:id", verifyToken, verifyPermission("sales_order", "read"), getSalesOrderByIdController);
router.put("/:id", verifyToken, verifyPermission("sales_order", "update"), updateSalesOrderController);
router.delete("/:id", verifyToken, verifyPermission("sales_order", "delete"), deleteSalesOrderController);
router.post("/revise/:id", verifyToken, verifyPermission("sales_order", "update"), reviseSalesOrderController);

module.exports = router;
