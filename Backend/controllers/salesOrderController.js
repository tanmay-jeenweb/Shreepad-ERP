const {
    createSalesOrder,
    getAllSalesOrders,
    getSalesOrderById,
    updateSalesOrder,
    deleteSalesOrder,
    reviseSalesOrder
} = require("../models/salesOrderModel.js");
const { createAuditLog } = require("../models/auditLogModel.js");

const addSalesOrder = async (req, res) => {
    try {
        const { salesOrderId, customerId, customerOrderNo, items = [] } = req.body;

        if (!salesOrderId || !customerId || items.length === 0) {
            return res.status(400).json({ success: false, message: "Sales Order ID, Customer, and at least one item are required" });
        }

        const totalAmount = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);

        const addedBy = req.user?.id || null;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;

        const result = await createSalesOrder(salesOrderId, customerId, totalAmount, addedBy, deviceId, items, customerOrderNo);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Sales Order',
            'created',
            null,
            { salesOrderId, customerId, totalAmount, items, addedBy, deviceId, customerOrderNo }
        );

        return res.status(201).json({ success: true, message: "Sales Order created", data: result });
    } catch (error) {
        console.error("Add Sales Order Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Sales Order ID already exists" });
        }
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getSalesOrdersController = async (req, res) => {
    try {
        const salesOrders = await getAllSalesOrders();
        return res.status(200).json({ success: true, data: salesOrders });
    } catch (error) {
        console.error("Get Sales Orders Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getSalesOrderByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const salesOrder = await getSalesOrderById(id);
        if (!salesOrder) {
            return res.status(404).json({ success: false, message: "Sales Order not found" });
        }
        return res.status(200).json({ success: true, data: salesOrder });
    } catch (error) {
        console.error("Get Sales Order By ID Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const updateSalesOrderController = async (req, res) => {
    try {
        const { id } = req.params;
        const { salesOrderId, customerId, customerOrderNo, items = [] } = req.body;

        if (!salesOrderId || !customerId || items.length === 0) {
            return res.status(400).json({ success: false, message: "Sales Order ID, Customer, and at least one item are required" });
        }

        const totalAmount = items.reduce((sum, item) => sum + (Number(item.totalPrice || item.total_price) || 0), 0);

        const beforeData = await getSalesOrderById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: "Sales Order not found" });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;

        await updateSalesOrder(id, salesOrderId, customerId, totalAmount, items, customerOrderNo);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Sales Order',
            'updated',
            beforeData,
            { ...beforeData, sales_order_id: salesOrderId, customer_id: customerId, total_amount: totalAmount, items, customer_order_no: customerOrderNo }
        );

        return res.status(200).json({ success: true, message: "Sales Order updated" });
    } catch (error) {
        console.error("Update Sales Order Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Sales Order ID already exists" });
        }
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const deleteSalesOrderController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;

        const beforeData = await getSalesOrderById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: "Sales Order not found" });
        }

        await deleteSalesOrder(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Sales Order',
            'deleted',
            beforeData,
            null
        );

        return res.status(200).json({ success: true, message: "Sales Order deleted" });
    } catch (error) {
        console.error("Delete Sales Order Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const reviseSalesOrderController = async (req, res) => {
    try {
        const { id } = req.params;
        const { salesOrderId, customerId, customerOrderNo, items = [] } = req.body;

        if (!salesOrderId || !customerId || items.length === 0) {
            return res.status(400).json({ success: false, message: "Sales Order ID, Customer, and at least one item are required" });
        }

        const totalAmount = items.reduce((sum, item) => sum + (Number(item.totalPrice || item.total_price) || 0), 0);

        const addedBy = req.user?.id || null;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;

        const result = await reviseSalesOrder(id, salesOrderId, customerId, totalAmount, items, addedBy, deviceId, customerOrderNo);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Sales Order',
            'revised',
            { id },
            { salesOrderId: result.salesOrderId, customerId, totalAmount, items, addedBy, deviceId, customerOrderNo }
        );

        return res.json({ success: true, message: 'Sales Order revised successfully', data: { id: result.id, sales_order_id: result.salesOrderId } });
    } catch (err) {
        console.error('reviseSalesOrderController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to revise Sales Order', error: err.message });
    }
};

module.exports = {
    addSalesOrder,
    getSalesOrdersController,
    getSalesOrderByIdController,
    updateSalesOrderController,
    deleteSalesOrderController,
    reviseSalesOrderController
};
