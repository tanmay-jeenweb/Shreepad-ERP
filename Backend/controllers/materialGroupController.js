const {
    createMaterialGroup,
    getAllMaterialGroups,
    updateMaterialGroup,
    deleteMaterialGroup,
    getMaterialGroupById
} = require('../models/materialGroupModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addMaterialGroup = async (req, res) => {
    try {
        const { materialGroupName } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        if (!materialGroupName || !materialGroupName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Material group name is required'
            });
        }

        const materialGroup = await createMaterialGroup(materialGroupName.trim(), addedBy, deviceId);
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Material Group Master',
            'created',
            null,
            {
                id: materialGroup.insertId,
                material_group_name: materialGroupName.trim(),
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Material group added successfully',
            data: materialGroup
        });
    } catch (error) {
        console.error('Error adding material group:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Material group name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllMaterialGroupsController = async (req, res) => {
    try {
        const materialGroups = await getAllMaterialGroups();

        res.status(200).json({
            success: true,
            message: 'Material groups retrieved successfully',
            data: materialGroups
        });
    } catch (error) {
        console.error('Error retrieving material groups:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateMaterialGroupController = async (req, res) => {
    try {
        const { id } = req.params;
        const { materialGroupName } = req.body;

        if (!materialGroupName || !materialGroupName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Material group name is required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getMaterialGroupById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Material group not found' });
        }

        await updateMaterialGroup(id, materialGroupName.trim());
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Material Group Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                material_group_name: materialGroupName.trim()
            }
        );

        res.status(200).json({
            success: true,
            message: 'Material group updated successfully'
        });
    } catch (error) {
        console.error('Error updating material group:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Material group name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteMaterialGroupController = async (req, res) => {
    try {
        const { id } = req.params;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getMaterialGroupById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Material group not found' });
        }

        await deleteMaterialGroup(id);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Material Group Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Material group deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting material group:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    addMaterialGroup,
    getAllMaterialGroupsController,
    updateMaterialGroupController,
    deleteMaterialGroupController
};
