const {
    createSubSdReason,
    getAllSubSdReasons,
    getSubSdReasonById,
    updateSubSdReason,
    toggleSubSdReasonActive,
    deleteSubSdReason
} = require('../models/subSdReasonModel');
const { createAuditLog } = require('../models/auditLogModel');

const MASTER_NAME = 'Sub SD Reason Master';

const addSubSdReasonController = async (req, res) => {
    try {
        const { sub_sd_name, reason_id, code, mould_id } = req.body;

        if (!sub_sd_name || !reason_id || !code || !mould_id) {
            return res.status(400).json({ success: false, message: 'All fields (Name, Reason Type, Code, Mould Type) are required' });
        }

        const added_by = req.user?.id || null;
        const device_id = req.user?.deviceId || null;

        const result = await createSubSdReason(sub_sd_name, reason_id, code, mould_id, added_by, device_id);
        const subSdId = result.insertId;

        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'created', null,
                { id: subSdId, sub_sd_name, reason_id, code, mould_id }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(201).json({ success: true, message: 'Sub SD Reason created successfully', data: { id: subSdId } });
    } catch (error) {
        console.error('Error adding Sub SD Reason:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllSubSdReasonsController = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const reasons = await getAllSubSdReasons(includeInactive);
        res.status(200).json({ success: true, message: 'Sub SD Reasons retrieved successfully', data: reasons });
    } catch (error) {
        console.error('Error retrieving Sub SD Reasons:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getSubSdReasonByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = await getSubSdReasonById(id);
        if (!reason) {
            return res.status(404).json({ success: false, message: 'Sub SD Reason not found' });
        }
        res.status(200).json({ success: true, message: 'Sub SD Reason retrieved successfully', data: reason });
    } catch (error) {
        console.error('Error retrieving Sub SD Reason:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateSubSdReasonController = async (req, res) => {
    try {
        const { id } = req.params;
        const { sub_sd_name, reason_id, code, mould_id } = req.body;

        if (!sub_sd_name || !reason_id || !code || !mould_id) {
            return res.status(400).json({ success: false, message: 'All fields (Name, Reason Type, Code, Mould Type) are required' });
        }

        const existingReason = await getSubSdReasonById(id);
        if (!existingReason) {
            return res.status(404).json({ success: false, message: 'Sub SD Reason not found' });
        }

        await updateSubSdReason(id, sub_sd_name, reason_id, code, mould_id);

        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'updated',
                { sub_sd_name: existingReason.sub_sd_name, reason_id: existingReason.reason_id, code: existingReason.code, mould_id: existingReason.mould_id },
                { sub_sd_name, reason_id, code, mould_id }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: 'Sub SD Reason updated successfully' });
    } catch (error) {
        console.error('Error updating Sub SD Reason:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const toggleSubSdReasonActiveController = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        const existingReason = await getSubSdReasonById(id);
        if (!existingReason) {
            return res.status(404).json({ success: false, message: 'Sub SD Reason not found' });
        }

        await toggleSubSdReasonActive(id, active);

        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'updated',
                { sub_sd_name: existingReason.sub_sd_name, active: existingReason.active },
                { sub_sd_name: existingReason.sub_sd_name, active }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: `Sub SD Reason ${active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error('Error toggling Sub SD Reason status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteSubSdReasonController = async (req, res) => {
    try {
        const { id } = req.params;
        const existingReason = await getSubSdReasonById(id);
        if (!existingReason) {
            return res.status(404).json({ success: false, message: 'Sub SD Reason not found' });
        }

        await deleteSubSdReason(id);

        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'deleted',
                { sub_sd_name: existingReason.sub_sd_name },
                null
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: 'Sub SD Reason deleted successfully' });
    } catch (error) {
        console.error('Error deleting Sub SD Reason:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(400).json({ success: false, message: 'Cannot delete because it is in use.' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addSubSdReasonController,
    getAllSubSdReasonsController,
    getSubSdReasonByIdController,
    updateSubSdReasonController,
    toggleSubSdReasonActiveController,
    deleteSubSdReasonController
};
