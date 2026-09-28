const {
    createInspection,
    getAllInspections,
    updateInspection,
    deleteInspection,
    getInspectionById
} = require('../models/inspectionModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addInspection = async (req, res) => {
    try {
        const { name } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Inspection name is required'
            });
        }

        const result = await createInspection(name.trim(), addedBy, deviceId);
        
        try {
            await createAuditLog(
                addedBy,
                req.user?.name || req.user?.username || 'Unknown',
                deviceId,
                'Inspection Master',
                'created',
                null,
                {
                    id: result.insertId,
                    name: name.trim(),
                    added_by: addedBy,
                    device_id: deviceId
                }
            );
        } catch (auditErr) {
            console.warn("Audit log notice:", auditErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Inspection added successfully',
            data: { id: result.insertId, name: name.trim() }
        });
    } catch (error) {
        console.error('Error adding inspection:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Inspection name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllInspectionsController = async (req, res) => {
    try {
        const inspections = await getAllInspections();

        res.status(200).json({
            success: true,
            message: 'Inspections retrieved successfully',
            data: inspections
        });
    } catch (error) {
        console.error('Error retrieving inspections:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateInspectionController = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Inspection name is required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getInspectionById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Inspection not found' });
        }

        await updateInspection(id, name.trim());

        try {
            await createAuditLog(
                req.user?.id,
                req.user?.name || req.user?.username || 'Unknown',
                deviceId,
                'Inspection Master',
                'updated',
                beforeData,
                { id: Number(id), name: name.trim() }
            );
        } catch (auditErr) {
            console.warn("Audit log notice:", auditErr.message);
        }

        res.status(200).json({
            success: true,
            message: 'Inspection updated successfully'
        });
    } catch (error) {
        console.error('Error updating inspection:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Inspection name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteInspectionController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getInspectionById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Inspection not found' });
        }

        await deleteInspection(id);

        try {
            await createAuditLog(
                req.user?.id,
                req.user?.name || req.user?.username || 'Unknown',
                deviceId,
                'Inspection Master',
                'deleted',
                beforeData,
                null
            );
        } catch (auditErr) {
            console.warn("Audit log notice:", auditErr.message);
        }

        res.status(200).json({
            success: true,
            message: 'Inspection deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting inspection:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    addInspection,
    getAllInspectionsController,
    updateInspectionController,
    deleteInspectionController
};
