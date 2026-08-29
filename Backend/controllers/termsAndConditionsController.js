const {
    createTermsAndConditions,
    getAllTermsAndConditions,
    getTermsAndConditionsById,
    updateTermsAndConditions,
    deleteTermsAndConditions
} = require('../models/termsAndConditionsModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addTermsController = async (req, res) => {
    try {
        const { name, description, logs } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        const termsRecord = await createTermsAndConditions(name.trim(), description || null, logs || null, addedBy, deviceId);
        
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Terms and Conditions Master',
            'created',
            null,
            {
                id: termsRecord.insertId,
                name: name.trim(),
                description: description || null,
                logs: logs || null,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Terms & conditions added successfully',
            data: termsRecord
        });
    } catch (error) {
        console.error('Error adding terms & conditions:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Terms & conditions name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllTermsController = async (req, res) => {
    try {
        const list = await getAllTermsAndConditions();

        res.status(200).json({
            success: true,
            message: 'Terms & conditions retrieved successfully',
            data: list
        });
    } catch (error) {
        console.error('Error retrieving terms & conditions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getTermsByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const terms = await getTermsAndConditionsById(id);
        if (!terms) {
            return res.status(404).json({ success: false, message: 'Terms & conditions not found' });
        }
        res.status(200).json({ success: true, message: 'Terms & conditions retrieved successfully', data: terms });
    } catch (error) {
        console.error('Error retrieving terms & conditions:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateTermsController = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, logs } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getTermsAndConditionsById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Terms & conditions not found' });
        }

        const updatedLogs = logs !== undefined ? logs : beforeData.logs;

        await updateTermsAndConditions(id, name.trim(), description || null, updatedLogs);
        
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Terms and Conditions Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                name: name.trim(),
                description: description || null,
                logs: updatedLogs
            }
        );

        res.status(200).json({
            success: true,
            message: 'Terms & conditions updated successfully'
        });
    } catch (error) {
        console.error('Error updating terms & conditions:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Terms & conditions name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteTermsController = async (req, res) => {
    try {
        const { id } = req.params;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getTermsAndConditionsById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Terms & conditions not found' });
        }

        await deleteTermsAndConditions(id);
        
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Terms and Conditions Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Terms & conditions deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting terms & conditions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    addTermsController,
    getAllTermsController,
    getTermsByIdController,
    updateTermsController,
    deleteTermsController
};
