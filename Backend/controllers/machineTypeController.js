const {
    createMachineType,
    getAllMachineTypes,
    updateMachineType,
    deleteMachineType,
    getMachineTypeById
} = require("../models/machineTypeModel.js");
const { createAuditLog } = require("../models/auditLogModel.js");

const addMachineType = async (req, res) => {
    try {
        const { machineTypeName } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!machineTypeName) {
            return res.status(400).json({ success: false, message: 'Machine type name is required' });
        }

        const machineType = await createMachineType(machineTypeName, addedBy, deviceId);
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Machine Type Master',
            'created',
            null,
            {
                id: machineType.insertId,
                machine_type_name: machineTypeName,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({ success: true, message: 'Machine type added successfully', data: machineType });
    } catch (error) {
        console.error('Error adding machine type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Machine type already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllMachineTypesController = async (req, res) => {
    try {
        const machineTypes = await getAllMachineTypes();
        res.status(200).json({ success: true, message: 'Machine types retrieved successfully', data: machineTypes });
    } catch (error) {
        console.error('Error retrieving machine types:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateMachineTypeController = async (req, res) => {
    try {
        const { id } = req.params;
        const { machineTypeName } = req.body;

        if (!machineTypeName) {
            return res.status(400).json({ success: false, message: 'Machine type name is required' });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getMachineTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Machine type not found' });
        }

        await updateMachineType(id, machineTypeName);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Machine Type Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                machine_type_name: machineTypeName
            }
        );

        res.status(200).json({ success: true, message: 'Machine type updated successfully' });
    } catch (error) {
        console.error('Error updating machine type:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteMachineTypeController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getMachineTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Machine type not found' });
        }

        await deleteMachineType(id);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Machine Type Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'Machine type deleted successfully' });
    } catch (error) {
        console.error('Error deleting machine type:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addMachineType,
    getAllMachineTypesController,
    updateMachineTypeController,
    deleteMachineTypeController
};
