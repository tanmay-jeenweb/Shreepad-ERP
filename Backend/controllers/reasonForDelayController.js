const {
    createReasonForDelay,
    getAllReasonsForDelay,
    getReasonForDelayById,
    updateReasonForDelay,
    deleteReasonForDelay
} = require('../models/reasonForDelayModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addReasonForDelay = async (req, res) => {
    try {
        const { reasonName, reasonTypeId, remark } = req.body;

        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!reasonName || !reasonName.trim()) {
            return res.status(400).json({ success: false, message: 'Reason / Name is required' });
        }

        const data = {
            reasonName: reasonName.trim(),
            reasonTypeId: reasonTypeId || null,
            remark: remark ? remark.trim() : null
        };

        const reason = await createReasonForDelay(data, addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Reason For Delay Master',
            'created',
            null,
            {
                id: reason.insertId,
                ...data,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Reason for delay added successfully',
            data: reason
        });
    } catch (error) {
        console.error('Error adding reason for delay:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllReasonsForDelayController = async (req, res) => {
    try {
        const reasons = await getAllReasonsForDelay();
        res.status(200).json({
            success: true,
            message: 'Reasons for delay retrieved successfully',
            data: reasons
        });
    } catch (error) {
        console.error('Error retrieving reasons for delay:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getReasonForDelayByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = await getReasonForDelayById(id);
        if (!reason) {
            return res.status(404).json({ success: false, message: 'Reason for delay not found' });
        }
        res.status(200).json({ success: true, message: 'Reason for delay retrieved successfully', data: reason });
    } catch (error) {
        console.error('Error retrieving reason for delay:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateReasonForDelayController = async (req, res) => {
    try {
        const { id } = req.params;
        const { reasonName, reasonTypeId, remark } = req.body;

        if (!reasonName || !reasonName.trim()) {
            return res.status(400).json({ success: false, message: 'Reason / Name is required' });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getReasonForDelayById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Reason for delay not found' });
        }

        const data = {
            reasonName: reasonName.trim(),
            reasonTypeId: reasonTypeId || null,
            remark: remark ? remark.trim() : null
        };

        await updateReasonForDelay(id, data);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Reason For Delay Master',
            'updated',
            beforeData,
            { ...beforeData, ...data }
        );

        res.status(200).json({ success: true, message: 'Reason for delay updated successfully' });
    } catch (error) {
        console.error('Error updating reason for delay:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteReasonForDelayController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getReasonForDelayById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Reason for delay not found' });
        }

        await deleteReasonForDelay(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Reason For Delay Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'Reason for delay deleted successfully' });
    } catch (error) {
        console.error('Error deleting reason for delay:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addReasonForDelay,
    getAllReasonsForDelayController,
    getReasonForDelayByIdController,
    updateReasonForDelayController,
    deleteReasonForDelayController
};
