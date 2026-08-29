const {
    createOperator,
    getAllOperators,
    getOperatorById,
    updateOperator,
    toggleOperatorActive,
    deleteOperator
} = require('../models/operatorModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addOperator = async (req, res) => {
    try {
        const {
            operatorCode,
            operatorName,
            dateOfJoining,
            information,
            operatorTypeId
        } = req.body;

        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!operatorCode || !operatorCode.trim()) {
            return res.status(400).json({ success: false, message: 'Operator code is required' });
        }
        if (!operatorName || !operatorName.trim()) {
            return res.status(400).json({ success: false, message: 'Operator name is required' });
        }

        const data = {
            operatorCode: operatorCode.trim(),
            operatorName: operatorName.trim(),
            dateOfJoining: dateOfJoining || null,
            information: information ? information.trim() : null,
            operatorTypeId: operatorTypeId || null
        };

        const operator = await createOperator(data, addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Operator Master',
            'created',
            null,
            {
                id: operator.insertId,
                ...data,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Operator added successfully',
            data: operator
        });
    } catch (error) {
        console.error('Error adding operator:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Operator code already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllOperatorsController = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const operators = await getAllOperators(includeInactive);
        res.status(200).json({
            success: true,
            message: 'Operators retrieved successfully',
            data: operators
        });
    } catch (error) {
        console.error('Error retrieving operators:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getOperatorByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const operator = await getOperatorById(id);
        if (!operator) {
            return res.status(404).json({ success: false, message: 'Operator not found' });
        }
        res.status(200).json({ success: true, message: 'Operator retrieved successfully', data: operator });
    } catch (error) {
        console.error('Error retrieving operator:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateOperatorController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            operatorCode,
            operatorName,
            dateOfJoining,
            information,
            operatorTypeId
        } = req.body;

        if (!operatorCode || !operatorCode.trim()) {
            return res.status(400).json({ success: false, message: 'Operator code is required' });
        }
        if (!operatorName || !operatorName.trim()) {
            return res.status(400).json({ success: false, message: 'Operator name is required' });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getOperatorById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Operator not found' });
        }

        const data = {
            operatorCode: operatorCode.trim(),
            operatorName: operatorName.trim(),
            dateOfJoining: dateOfJoining || null,
            information: information ? information.trim() : null,
            operatorTypeId: operatorTypeId || null
        };

        await updateOperator(id, data);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Operator Master',
            'updated',
            beforeData,
            { ...beforeData, ...data }
        );

        res.status(200).json({ success: true, message: 'Operator updated successfully' });
    } catch (error) {
        console.error('Error updating operator:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Operator code already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const toggleOperatorActiveController = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getOperatorById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Operator not found' });
        }

        await toggleOperatorActive(id, active);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Operator Master',
            active ? 'activated' : 'deactivated',
            { ...beforeData, active: beforeData.active },
            { ...beforeData, active: active ? 1 : 0 }
        );

        res.status(200).json({
            success: true,
            message: `Operator ${active ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Error toggling operator active status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteOperatorController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getOperatorById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Operator not found' });
        }

        await deleteOperator(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Operator Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'Operator deleted successfully' });
    } catch (error) {
        console.error('Error deleting operator:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addOperator,
    getAllOperatorsController,
    getOperatorByIdController,
    updateOperatorController,
    toggleOperatorActiveController,
    deleteOperatorController
};
