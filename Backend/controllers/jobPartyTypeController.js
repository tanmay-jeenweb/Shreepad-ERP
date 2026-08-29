const {
    createJobPartyType,
    getAllJobPartyTypes,
    updateJobPartyType,
    deleteJobPartyType,
    getJobPartyTypeById
} = require('../models/jobPartyTypeModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addJobPartyType = async (req, res) => {
    try {
        const { jobPartyTypeName } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        if (!jobPartyTypeName || !jobPartyTypeName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Job party type name is required'
            });
        }

        const jobPartyType = await createJobPartyType(jobPartyTypeName.trim(), addedBy, deviceId);
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Job Party Type Master',
            'created',
            null,
            {
                id: jobPartyType.insertId,
                job_party_type_name: jobPartyTypeName.trim(),
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Job party type added successfully',
            data: jobPartyType
        });
    } catch (error) {
        console.error('Error adding job party type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Job party type name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllJobPartyTypesController = async (req, res) => {
    try {
        const jobPartyTypes = await getAllJobPartyTypes();

        res.status(200).json({
            success: true,
            message: 'Job party types retrieved successfully',
            data: jobPartyTypes
        });
    } catch (error) {
        console.error('Error retrieving job party types:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getJobPartyTypeByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const jobPartyType = await getJobPartyTypeById(id);
        if (!jobPartyType) {
            return res.status(404).json({
                success: false,
                message: 'Job party type not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Job party type retrieved successfully',
            data: jobPartyType
        });
    } catch (error) {
        console.error('Error retrieving job party type:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateJobPartyTypeController = async (req, res) => {
    try {
        const { id } = req.params;
        const { jobPartyTypeName } = req.body;

        if (!jobPartyTypeName || !jobPartyTypeName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Job party type name is required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getJobPartyTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Job party type not found' });
        }

        await updateJobPartyType(id, jobPartyTypeName.trim());
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Job Party Type Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                job_party_type_name: jobPartyTypeName.trim()
            }
        );

        res.status(200).json({
            success: true,
            message: 'Job party type updated successfully'
        });
    } catch (error) {
        console.error('Error updating job party type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Job party type name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteJobPartyTypeController = async (req, res) => {
    try {
        const { id } = req.params;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getJobPartyTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Job party type not found' });
        }

        await deleteJobPartyType(id);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Job Party Type Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Job party type deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting job party type:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    addJobPartyType,
    getAllJobPartyTypesController,
    getJobPartyTypeByIdController,
    updateJobPartyTypeController,
    deleteJobPartyTypeController
};
