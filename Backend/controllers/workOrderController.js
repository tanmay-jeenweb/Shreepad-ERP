const workOrderModel = require('../models/workOrderModel.js');

const addWorkOrder = async (req, res) => {
    try {
        const {
            customer_id,
            work_order_date,
            item,
            items,
            purchase_order_number,
            purchase_order_date,
            project_name,
            inspection_id,
            remark,
            batches
        } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['device-id'] || null;

        const workOrderItems = items || (item ? [item] : []);

        if (!customer_id || !work_order_date || workOrderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: customer_id, work_order_date, and item details are required."
            });
        }

        const result = await workOrderModel.createWorkOrder(
            customer_id,
            work_order_date,
            addedBy,
            deviceId,
            workOrderItems,
            {
                purchase_order_number,
                purchase_order_date,
                project_name,
                inspection_id,
                remark,
                batches
            }
        );

        return res.status(201).json({
            success: true,
            message: "Work Order created successfully.",
            data: result
        });
    } catch (error) {
        console.error("Error in addWorkOrder controller:", error);
        const statusCode = (error.message && error.message.includes("No working hours")) ? 400 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

const getAllWorkOrdersController = async (req, res) => {
    try {
        const includeHeld = req.query.includeHeld === 'true';
        const data = await workOrderModel.getAllWorkOrders(includeHeld);
        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error in getAllWorkOrdersController:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const getWorkOrderByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await workOrderModel.getWorkOrderById(id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Work Order not found."
            });
        }

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error in getWorkOrderByIdController:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const getNextWorkOrderNoController = async (req, res) => {
    try {
        const nextNo = await workOrderModel.getNextWorkOrderNo();
        return res.status(200).json({
            success: true,
            nextNo
        });
    } catch (error) {
        console.error("Error in getNextWorkOrderNoController:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const deleteWorkOrderController = async (req, res) => {
    try {
        const { id } = req.params;
        await workOrderModel.deleteWorkOrder(id);
        return res.status(200).json({
            success: true,
            message: "Work Order deleted successfully."
        });
    } catch (error) {
        console.error("Error in deleteWorkOrderController:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const getMaterialStockController = async (req, res) => {
    try {
        const { materialId } = req.params;
        const result = await workOrderModel.getMaterialStock(materialId);
        return res.status(200).json({
            success: true,
            stock: typeof result === 'object' ? result.stock : result,
            unit_name: typeof result === 'object' ? result.unit_name : "Nos",
            batches: typeof result === 'object' ? result.batches : []
        });
    } catch (error) {
        console.error("Error in getMaterialStockController:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const updateWorkOrderItemDelayController = async (req, res) => {
    try {
        const { id } = req.params;
        const { delay_hours, delay_reason } = req.body;

        const delayHoursVal = (delay_hours === '' || delay_hours === null || delay_hours === undefined) ? 0.00 : parseFloat(delay_hours);
        const delayReasonVal = delay_reason || null;

        await workOrderModel.updateWorkOrderItemDelay(id, delayHoursVal, delayReasonVal);

        return res.status(200).json({
            success: true,
            message: "Delay updated successfully."
        });
    } catch (error) {
        console.error("Error in updateWorkOrderItemDelayController:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const updateWorkOrderItemPriorityController = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority_no } = req.body;

        const priorityVal = (priority_no === '' || priority_no === null || priority_no === undefined) ? null : parseInt(priority_no, 10);

        await workOrderModel.updateWorkOrderItemPriority(id, priorityVal);

        return res.status(200).json({
            success: true,
            message: "Priority updated successfully."
        });
    } catch (error) {
        console.error("Error in updateWorkOrderItemPriorityController:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const updateWorkOrderItemRemarksController = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        const remarksVal = remarks || null;

        await workOrderModel.updateWorkOrderItemRemarks(id, remarksVal);

        return res.status(200).json({
            success: true,
            message: "Remarks updated successfully."
        });
    } catch (error) {
        console.error("Error in updateWorkOrderItemRemarksController:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const updateWorkOrderController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            work_order_date,
            items,
            purchase_order_number,
            purchase_order_date,
            project_name,
            inspection_id,
            remark,
            batches
        } = req.body;

        if (!work_order_date || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: work_order_date and items array are required."
            });
        }

        await workOrderModel.updateWorkOrder(id, work_order_date, items, {
            purchase_order_number,
            purchase_order_date,
            project_name,
            inspection_id,
            remark,
            batches
        });

        return res.status(200).json({
            success: true,
            message: "Work Order updated successfully."
        });
    } catch (error) {
        console.error("Error in updateWorkOrderController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

const startWorkOrderController = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Work Order ID is required."
            });
        }

        const workOrder = await workOrderModel.getWorkOrderById(id);
        if (!workOrder) {
            return res.status(404).json({
                success: false,
                message: "Work Order not found."
            });
        }

        if (workOrder.status === 'Started') {
            return res.status(400).json({
                success: false,
                message: "Work Order is already started."
            });
        }

        await workOrderModel.startWorkOrder(id, userId);

        return res.status(200).json({
            success: true,
            message: `Work Order WO-${String(workOrder.work_order_no).padStart(4, '0')} has been started successfully.`
        });
    } catch (error) {
        console.error("Error in startWorkOrderController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

const completeWorkOrderController = async (req, res) => {
    try {
        const { id } = req.params;
        const completionReason = req.body.completion_reason || req.body.stop_reason || req.body.remark || req.body.remarks || "Completed";
        const userId = req.user.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Work Order ID is required."
            });
        }

        const workOrder = await workOrderModel.getWorkOrderById(id);
        if (!workOrder) {
            return res.status(404).json({
                success: false,
                message: "Work Order not found."
            });
        }

        if (workOrder.status !== 'Started') {
            return res.status(400).json({
                success: false,
                message: `Only Started work orders can be completed. Current status: ${workOrder.status || 'Draft'}.`
            });
        }

        await workOrderModel.completeWorkOrder(id, userId, String(completionReason).trim());

        return res.status(200).json({
            success: true,
            message: `Work Order WO-${String(workOrder.work_order_no).padStart(4, '0')} has been marked as Completed.`
        });
    } catch (error) {
        console.error("Error in completeWorkOrderController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

const stopWorkOrderController = completeWorkOrderController;

const reopenWorkOrderController = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Work Order ID is required."
            });
        }

        const workOrder = await workOrderModel.getWorkOrderById(id);
        if (!workOrder) {
            return res.status(404).json({
                success: false,
                message: "Work Order not found."
            });
        }

        if (workOrder.status !== 'Completed' && workOrder.status !== 'Stopped') {
            return res.status(400).json({
                success: false,
                message: `Only Completed work orders can be reopened. Current status: ${workOrder.status || 'Draft'}.`
            });
        }

        await workOrderModel.reopenWorkOrder(id, userId);

        return res.status(200).json({
            success: true,
            message: `Work Order WO-${String(workOrder.work_order_no).padStart(4, '0')} has been reopened and is active again.`
        });
    } catch (error) {
        console.error("Error in reopenWorkOrderController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

const restartWorkOrderController = reopenWorkOrderController;

module.exports = {
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
    reopenWorkOrderController
};
