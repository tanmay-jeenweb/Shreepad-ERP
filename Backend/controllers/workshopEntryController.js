const {
    getAllWorkshopEntries,
    getWorkshopEntryByWorkOrderItemId,
    getAvailableBatches,
    issueWorkshopRawMaterials,
    addWorkshopProductionLog,
    deleteWorkshopProductionLog
} = require('../models/workshopEntryModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const getAllWorkshopEntriesController = async (req, res) => {
    try {
        const entries = await getAllWorkshopEntries();
        res.status(200).json({
            success: true,
            data: entries
        });
    } catch (error) {
        console.error('Error fetching workshop entries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch workshop entries'
        });
    }
};

const getWorkshopEntryDetailsController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Work Order Item ID is required'
            });
        }

        const entry = await getWorkshopEntryByWorkOrderItemId(id);
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Workshop entry details not found'
            });
        }

        res.status(200).json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error fetching workshop entry details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch workshop entry details'
        });
    }
};

const issueWorkshopRmController = async (req, res) => {
    try {
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const {
            work_order_item_id,
            issues,
            date
        } = req.body;

        if (!work_order_item_id || !Array.isArray(issues) || issues.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Work Order Item ID and at least one RM issue item are required'
            });
        }

        const result = await issueWorkshopRawMaterials({
            work_order_item_id: Number(work_order_item_id),
            issues,
            date,
            added_by: addedBy
        });

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Workshop Entry',
            'rm_issued',
            null,
            {
                work_order_item_id,
                lot: result.lot,
                count: result.count,
                ref_no: result.ref_no,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: `Chit #${result.lot} issued successfully!`,
            data: result
        });
    } catch (error) {
        console.error('Error issuing workshop raw materials:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to issue raw materials'
        });
    }
};

const getAvailableBatchesController = async (req, res) => {
    try {
        const { material_id } = req.query;
        if (!material_id) {
            return res.status(400).json({
                success: false,
                message: 'Material ID is required'
            });
        }

        const batches = await getAvailableBatches(Number(material_id));
        res.status(200).json({
            success: true,
            data: batches
        });
    } catch (error) {
        console.error('Error fetching available batches for workshop:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available batches'
        });
    }
};

const addWorkshopProductionLogController = async (req, res) => {
    try {
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const {
            work_order_item_id,
            bom_process_id,
            quantity,
            log_date,
            remarks
        } = req.body;

        if (!work_order_item_id || !bom_process_id || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Work order item ID, process stage ID, and quantity are required'
            });
        }

        const result = await addWorkshopProductionLog({
            work_order_item_id: Number(work_order_item_id),
            bom_process_id: Number(bom_process_id),
            quantity: Number(quantity),
            log_date,
            remarks,
            added_by: addedBy,
            device_id: deviceId
        });

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Workshop Entry',
            'production_movement_logged',
            null,
            {
                work_order_item_id,
                bom_process_id,
                quantity,
                from_process: result.from_process_name,
                to_process: result.to_process_name,
                added_by: addedBy
            }
        );

        res.status(201).json({
            success: true,
            message: `Successfully moved ${quantity} units from ${result.from_process_name} to ${result.to_process_name}`,
            data: result
        });
    } catch (error) {
        console.error('Error adding production movement log:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to record production movement'
        });
    }
};

const deleteWorkshopProductionLogController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Log ID is required'
            });
        }

        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        await deleteWorkshopProductionLog(Number(id));

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Workshop Entry',
            'production_movement_deleted',
            null,
            {
                log_id: id,
                added_by: addedBy
            }
        );

        res.status(200).json({
            success: true,
            message: 'Production movement log deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting production movement log:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete production movement log'
        });
    }
};

module.exports = {
    getAllWorkshopEntriesController,
    getWorkshopEntryDetailsController,
    issueWorkshopRmController,
    getAvailableBatchesController,
    addWorkshopProductionLogController,
    deleteWorkshopProductionLogController
};
