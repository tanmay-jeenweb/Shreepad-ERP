const {
    createJobParty,
    getAllJobParties,
    getJobPartyById,
    updateJobParty,
    deleteJobParty
} = require('../models/jobPartyModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addJobParty = async (req, res) => {
    try {
        const {
            partyName,
            remark,
            jobPartyTypeId
        } = req.body;

        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!partyName || !partyName.trim()) {
            return res.status(400).json({ success: false, message: 'Party name is required' });
        }

        const data = {
            partyName: partyName.trim(),
            remark: remark ? remark.trim() : null,
            jobPartyTypeId: jobPartyTypeId || null
        };

        const jobParty = await createJobParty(data, addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Job Party Master',
            'created',
            null,
            {
                id: jobParty.insertId,
                ...data,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Job party added successfully',
            data: jobParty
        });
    } catch (error) {
        console.error('Error adding job party:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Party name already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllJobPartiesController = async (req, res) => {
    try {
        const jobParties = await getAllJobParties();
        res.status(200).json({
            success: true,
            message: 'Job parties retrieved successfully',
            data: jobParties
        });
    } catch (error) {
        console.error('Error retrieving job parties:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getJobPartyByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const jobParty = await getJobPartyById(id);
        if (!jobParty) {
            return res.status(404).json({ success: false, message: 'Job party not found' });
        }
        res.status(200).json({ success: true, message: 'Job party retrieved successfully', data: jobParty });
    } catch (error) {
        console.error('Error retrieving job party:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateJobPartyController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            partyName,
            remark,
            jobPartyTypeId
        } = req.body;

        if (!partyName || !partyName.trim()) {
            return res.status(400).json({ success: false, message: 'Party name is required' });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getJobPartyById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Job party not found' });
        }

        const data = {
            partyName: partyName.trim(),
            remark: remark ? remark.trim() : null,
            jobPartyTypeId: jobPartyTypeId || null
        };

        await updateJobParty(id, data);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Job Party Master',
            'updated',
            beforeData,
            { ...beforeData, ...data }
        );

        res.status(200).json({ success: true, message: 'Job party updated successfully' });
    } catch (error) {
        console.error('Error updating job party:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Party name already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteJobPartyController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getJobPartyById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Job party not found' });
        }

        await deleteJobParty(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Job Party Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'Job party deleted successfully' });
    } catch (error) {
        console.error('Error deleting job party:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addJobParty,
    getAllJobPartiesController,
    getJobPartyByIdController,
    updateJobPartyController,
    deleteJobPartyController
};
