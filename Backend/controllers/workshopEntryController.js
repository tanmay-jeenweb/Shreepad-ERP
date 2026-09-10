const {
    getAllWorkshopEntries,
    getWorkshopEntryByPMemoId,
    saveWorkshopEntry
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
                message: 'P-Memo ID or Work Order Item ID is required'
            });
        }

        const entry = await getWorkshopEntryByPMemoId(id);
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Workshop entry not found'
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

const saveWorkshopEntryController = async (req, res) => {
    try {
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const {
            pmemo_id,
            machine_id,
            packing_method,
            status,
            remarks
        } = req.body;

        if (!pmemo_id) {
            return res.status(400).json({
                success: false,
                message: 'Production Memo ID is required'
            });
        }

        const result = await saveWorkshopEntry({
            pmemo_id,
            machine_id: machine_id ? Number(machine_id) : null,
            packing_method: packing_method !== undefined ? packing_method : null,
            status: status || 'Pending',
            remarks: remarks || null,
            added_by: addedBy,
            device_id: deviceId
        });

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Workshop Entry',
            'saved',
            null,
            {
                pmemo_id,
                machine_id,
                packing_method,
                status,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(200).json({
            success: true,
            message: 'Workshop details saved successfully',
            data: result
        });
    } catch (error) {
        console.error('Error saving workshop entry:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to save workshop entry'
        });
    }
};

module.exports = {
    getAllWorkshopEntriesController,
    getWorkshopEntryDetailsController,
    saveWorkshopEntryController
};
