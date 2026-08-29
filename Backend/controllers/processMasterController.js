const {
    createProcess,
    getAllProcesses,
    updateProcess,
    deleteProcess,
    getProcessById
} = require('../models/processMasterModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addProcessController = async (req, res) => {
    try {
        const { processName, logs } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        if (!processName || !processName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Process name is required'
            });
        }

        const processRecord = await createProcess(processName.trim(), logs || null, addedBy, deviceId);
        
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Process Master',
            'created',
            null,
            {
                id: processRecord.insertId,
                process_name: processName.trim(),
                logs: logs || null,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Process added successfully',
            data: processRecord
        });
    } catch (error) {
        console.error('Error adding process:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Process name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllProcessesController = async (req, res) => {
    try {
        const processes = await getAllProcesses();

        res.status(200).json({
            success: true,
            message: 'Processes retrieved successfully',
            data: processes
        });
    } catch (error) {
        console.error('Error retrieving processes:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateProcessController = async (req, res) => {
    try {
        const { id } = req.params;
        const { processName, logs } = req.body;

        if (!processName || !processName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Process name is required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getProcessById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        // Merge logs if necessary, or just overwrite. The frontend might not send logs, 
        // so we should use existing logs if they are not provided in the update request.
        const updatedLogs = logs !== undefined ? logs : beforeData.logs;

        await updateProcess(id, processName.trim(), updatedLogs);
        
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Process Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                process_name: processName.trim(),
                logs: updatedLogs
            }
        );

        res.status(200).json({
            success: true,
            message: 'Process updated successfully'
        });
    } catch (error) {
        console.error('Error updating process:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Process name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteProcessController = async (req, res) => {
    try {
        const { id } = req.params;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getProcessById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        await deleteProcess(id);
        
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Process Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Process deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting process:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    addProcessController,
    getAllProcessesController,
    updateProcessController,
    deleteProcessController
};
