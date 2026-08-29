const {
    createUnit,
    getAllUnits,
    updateUnit,
    deleteUnit,
    getUnitById
} = require('../models/unitModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addUnit = async (req, res) => {
    try {
        const { unitName } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        if (!unitName || !unitName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Unit name is required'
            });
        }

        const unit = await createUnit(unitName.trim(), addedBy, deviceId);
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Unit Master',
            'created',
            null,
            {
                id: unit.insertId,
                unit_name: unitName.trim(),
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Unit added successfully',
            data: unit
        });
    } catch (error) {
        console.error('Error adding unit:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Unit name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllUnitsController = async (req, res) => {
    try {
        const units = await getAllUnits();

        res.status(200).json({
            success: true,
            message: 'Units retrieved successfully',
            data: units
        });
    } catch (error) {
        console.error('Error retrieving units:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateUnitController = async (req, res) => {
    try {
        const { id } = req.params;
        const { unitName } = req.body;

        if (!unitName || !unitName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Unit name is required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getUnitById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Unit not found' });
        }

        await updateUnit(id, unitName.trim());
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Unit Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                unit_name: unitName.trim()
            }
        );

        res.status(200).json({
            success: true,
            message: 'Unit updated successfully'
        });
    } catch (error) {
        console.error('Error updating unit:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Unit name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteUnitController = async (req, res) => {
    try {
        const { id } = req.params;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getUnitById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Unit not found' });
        }

        await deleteUnit(id);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Unit Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Unit deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting unit:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    addUnit,
    getAllUnitsController,
    updateUnitController,
    deleteUnitController
};
