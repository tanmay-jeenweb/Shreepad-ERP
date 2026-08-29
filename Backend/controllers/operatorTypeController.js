const {
    createOperatorType,
    getAllOperatorTypes,
    updateOperatorType,
    deleteOperatorType,
    getOperatorTypeById
} = require('../models/operatorTypeModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addOperatorType = async (req, res) => {
    try {
        const { operatorTypeName } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        if (!operatorTypeName || !operatorTypeName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Operator type name is required'
            });
        }

        const operatorType = await createOperatorType(operatorTypeName.trim(), addedBy, deviceId);
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Operator Type Master',
            'created',
            null,
            {
                id: operatorType.insertId,
                operator_type_name: operatorTypeName.trim(),
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Operator type added successfully',
            data: operatorType
        });
    } catch (error) {
        console.error('Error adding operator type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Operator type name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllOperatorTypesController = async (req, res) => {
    try {
        const operatorTypes = await getAllOperatorTypes();

        res.status(200).json({
            success: true,
            message: 'Operator types retrieved successfully',
            data: operatorTypes
        });
    } catch (error) {
        console.error('Error retrieving operator types:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateOperatorTypeController = async (req, res) => {
    try {
        const { id } = req.params;
        const { operatorTypeName } = req.body;

        if (!operatorTypeName || !operatorTypeName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Operator type name is required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getOperatorTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Operator type not found' });
        }

        await updateOperatorType(id, operatorTypeName.trim());
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Operator Type Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                operator_type_name: operatorTypeName.trim()
            }
        );

        res.status(200).json({
            success: true,
            message: 'Operator type updated successfully'
        });
    } catch (error) {
        console.error('Error updating operator type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Operator type name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteOperatorTypeController = async (req, res) => {
    try {
        const { id } = req.params;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getOperatorTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Operator type not found' });
        }

        await deleteOperatorType(id);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Operator Type Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Operator type deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting operator type:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    addOperatorType,
    getAllOperatorTypesController,
    updateOperatorTypeController,
    deleteOperatorTypeController
};
