const {
    createReason,
    getAllReasons,
    getReasonById,
    updateReason,
    toggleReasonActive,
    deleteReason
} = require('../models/reasonModel');
const { createAuditLog } = require('../models/auditLogModel');

const MASTER_NAME = 'Reason Master';

const addReasonController = async (req, res) => {
    try {
        const { reason_type, count_in_product_eff } = req.body;

        if (!reason_type) {
            return res.status(400).json({ success: false, message: 'Type is required' });
        }

        const added_by = req.user?.id || null;
        const device_id = req.user?.deviceId || null;

        const result = await createReason(reason_type, count_in_product_eff, added_by, device_id);
        const reasonId = result.insertId;

        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'created', null,
                { id: reasonId, reason_type, count_in_product_eff }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(201).json({ success: true, message: 'Reason created successfully', data: { id: reasonId } });
    } catch (error) {
        console.error('Error adding reason:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllReasonsController = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const reasons = await getAllReasons(includeInactive);
        res.status(200).json({ success: true, message: 'Reasons retrieved successfully', data: reasons });
    } catch (error) {
        console.error('Error retrieving reasons:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getReasonByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = await getReasonById(id);
        if (!reason) {
            return res.status(404).json({ success: false, message: 'Reason not found' });
        }
        res.status(200).json({ success: true, message: 'Reason retrieved successfully', data: reason });
    } catch (error) {
        console.error('Error retrieving reason:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateReasonController = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason_type, count_in_product_eff } = req.body;

        if (!reason_type) {
            return res.status(400).json({ success: false, message: 'Type is required' });
        }

        const existingReason = await getReasonById(id);
        if (!existingReason) {
            return res.status(404).json({ success: false, message: 'Reason not found' });
        }

        await updateReason(id, reason_type, count_in_product_eff);

        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'updated',
                { reason_type: existingReason.reason_type, count_in_product_eff: existingReason.count_in_product_eff },
                { reason_type, count_in_product_eff }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: 'Reason updated successfully' });
    } catch (error) {
        console.error('Error updating reason:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const toggleReasonActiveController = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        const existingReason = await getReasonById(id);
        if (!existingReason) {
            return res.status(404).json({ success: false, message: 'Reason not found' });
        }

        await toggleReasonActive(id, active);

        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'updated',
                { reason_type: existingReason.reason_type, active: existingReason.active },
                { reason_type: existingReason.reason_type, active }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: `Reason ${active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error('Error toggling reason status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteReasonController = async (req, res) => {
    try {
        const { id } = req.params;
        const existingReason = await getReasonById(id);
        if (!existingReason) {
            return res.status(404).json({ success: false, message: 'Reason not found' });
        }

        await deleteReason(id);

        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'deleted',
                { reason_type: existingReason.reason_type },
                null
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: 'Reason deleted successfully' });
    } catch (error) {
        console.error('Error deleting reason:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addReasonController,
    getAllReasonsController,
    getReasonByIdController,
    updateReasonController,
    toggleReasonActiveController,
    deleteReasonController
};
