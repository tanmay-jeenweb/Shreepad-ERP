const machineScheduleModel = require('../models/machineScheduleModel');

const getMachineSchedule = async (req, res) => {
    try {
        const { machineId, from, to } = req.query;
        if (!machineId || !from || !to) {
            return res.status(400).json({ success: false, message: "machineId, from, and to dates are required" });
        }
        
        const schedule = await machineScheduleModel.getMachineSchedule(machineId, from, to);
        const workingHours = await machineScheduleModel.getWorkingHoursForDateRange(machineId, from, to);
        
        return res.status(200).json({
            success: true,
            data: {
                schedule,
                workingHours
            }
        });
    } catch (error) {
        console.error("Error in getMachineSchedule:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getNextFreeSlot = async (req, res) => {
    try {
        const { machineId } = req.params;
        const slot = await machineScheduleModel.getNextFreeSlot(machineId);
        
        return res.status(200).json({
            success: true,
            data: slot
        });
    } catch (error) {
        console.error("Error in getNextFreeSlot:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const { getSettings } = require('../models/settingMasterModel.js');

const getMachineQueue = async (req, res) => {
    try {
        const { machineId } = req.query;
        if (!machineId) {
            return res.status(400).json({ success: false, message: "machineId query parameter is required" });
        }
        const queue = await machineScheduleModel.getMachineQueue(machineId);
        return res.status(200).json({
            success: true,
            data: queue
        });
    } catch (error) {
        console.error("Error in getMachineQueue:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const reorderMachineQueueItem = async (req, res) => {
    try {
        const { machineId, workOrderItemId, direction } = req.body;
        if (!machineId || !workOrderItemId || !direction) {
            return res.status(400).json({ success: false, message: "machineId, workOrderItemId, and direction are required" });
        }
        
        // Fetch wait_hour from settings
        const settings = await getSettings();
        const waitHour = settings ? parseInt(settings.wait_hour || 0, 10) : 0;
        
        await machineScheduleModel.reorderWorkOrderItem(machineId, workOrderItemId, direction, waitHour);
        
        return res.status(200).json({
            success: true,
            message: "Queue reordered successfully"
        });
    } catch (error) {
        console.error("Error in reorderMachineQueueItem:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

const moveToPosition = async (req, res) => {
    try {
        const { machineId, workOrderItemId, newPosition } = req.body;
        if (!machineId || !workOrderItemId || newPosition === undefined) {
            return res.status(400).json({ success: false, message: "machineId, workOrderItemId, and newPosition are required" });
        }

        // Fetch wait_hour from settings
        const settings = await getSettings();
        const waitHour = settings ? parseInt(settings.wait_hour || 0, 10) : 0;

        await machineScheduleModel.moveWorkOrderItemToPosition(machineId, workOrderItemId, newPosition, waitHour);

        return res.status(200).json({
            success: true,
            message: "Queue reordered successfully"
        });
    } catch (error) {
        console.error("Error in moveToPosition:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};


const toggleHold = async (req, res) => {
    try {
        const { workOrderItemId, hold } = req.body;
        if (!workOrderItemId || hold === undefined) {
            return res.status(400).json({ success: false, message: "workOrderItemId and hold are required" });
        }

        // Fetch wait_hour from settings
        const settings = await getSettings();
        const waitHour = settings ? parseInt(settings.wait_hour || 0, 10) : 0;

        await machineScheduleModel.toggleWorkOrderItemHold(workOrderItemId, hold ? 1 : 0, waitHour);

        return res.status(200).json({
            success: true,
            message: hold ? "Work Order Item placed on hold successfully" : "Work Order Item resumed successfully"
        });
    } catch (error) {
        console.error("Error in toggleHold:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

module.exports = {
    getMachineSchedule,
    getNextFreeSlot,
    getMachineQueue,
    reorderMachineQueueItem,
    moveToPosition,
    toggleHold
};
