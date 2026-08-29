const {
    createReasonForDelayType,
    getAllReasonForDelayTypes,
    updateReasonForDelayType,
    deleteReasonForDelayType,
    getReasonForDelayTypeById
} = require('../models/reasonForDelayTypeModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addReasonForDelayType = async (req, res) => {
    try {
        const { reasonTypeName } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        if (!reasonTypeName || !reasonTypeName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Reason for delay type name is required'
            });
        }

        const reasonType = await createReasonForDelayType(reasonTypeName.trim(), addedBy, deviceId);
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Reason For Delay Type Master',
            'created',
            null,
            {
                id: reasonType.insertId,
                reason_type_name: reasonTypeName.trim(),
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Reason for delay type added successfully',
            data: reasonType
        });
    } catch (error) {
        console.error('Error adding reason for delay type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Reason for delay type name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllReasonForDelayTypesController = async (req, res) => {
    try {
        const reasonTypes = await getAllReasonForDelayTypes();

        res.status(200).json({
            success: true,
            message: 'Reason for delay types retrieved successfully',
            data: reasonTypes
        });
    } catch (error) {
        console.error('Error retrieving reason for delay types:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateReasonForDelayTypeController = async (req, res) => {
    try {
        const { id } = req.params;
        const { reasonTypeName } = req.body;

        if (!reasonTypeName || !reasonTypeName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Reason for delay type name is required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getReasonForDelayTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Reason for delay type not found' });
        }

        await updateReasonForDelayType(id, reasonTypeName.trim());
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Reason For Delay Type Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                reason_type_name: reasonTypeName.trim()
            }
        );

        res.status(200).json({
            success: true,
            message: 'Reason for delay type updated successfully'
        });
    } catch (error) {
        console.error('Error updating reason for delay type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Reason for delay type name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteReasonForDelayTypeController = async (req, res) => {
    try {
        const { id } = req.params;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getReasonForDelayTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Reason for delay type not found' });
        }

        await deleteReasonForDelayType(id);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Reason For Delay Type Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Reason for delay type deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting reason for delay type:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    addReasonForDelayType,
    getAllReasonForDelayTypesController,
    updateReasonForDelayTypeController,
    deleteReasonForDelayTypeController
};
