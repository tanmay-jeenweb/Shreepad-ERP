const {
    createMaterialType,
    getAllMaterialTypes,
    updateMaterialType,
    deleteMaterialType,
    getMaterialTypeById,
} = require('../models/materialTypeModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addMaterialType = async (req, res) => {
    try {
        const { materialTypeName } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!materialTypeName || !materialTypeName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Material type name is required',
            });
        }

        const materialType = await createMaterialType(materialTypeName.trim(), addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Material Type Master',
            'created',
            null,
            {
                id: materialType.insertId,
                material_type_name: materialTypeName.trim(),
                added_by: addedBy,
                device_id: deviceId,
            }
        );

        res.status(201).json({
            success: true,
            message: 'Material type added successfully',
            data: materialType,
        });
    } catch (error) {
        console.error('Error adding material type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Material type name already exists',
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllMaterialTypesController = async (req, res) => {
    try {
        const materialTypes = await getAllMaterialTypes();
        res.status(200).json({
            success: true,
            message: 'Material types retrieved successfully',
            data: materialTypes,
        });
    } catch (error) {
        console.error('Error retrieving material types:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateMaterialTypeController = async (req, res) => {
    try {
        const { id } = req.params;
        const { materialTypeName } = req.body;

        if (!materialTypeName || !materialTypeName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Material type name is required',
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getMaterialTypeById(id);

        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Material type not found' });
        }

        if (beforeData.is_system) {
            return res.status(403).json({
                success: false,
                message: 'System material types cannot be edited',
            });
        }

        await updateMaterialType(id, materialTypeName.trim());

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Material Type Master',
            'updated',
            beforeData,
            { ...beforeData, material_type_name: materialTypeName.trim() }
        );

        res.status(200).json({ success: true, message: 'Material type updated successfully' });
    } catch (error) {
        console.error('Error updating material type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Material type name already exists',
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteMaterialTypeController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getMaterialTypeById(id);

        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Material type not found' });
        }

        if (beforeData.is_system) {
            return res.status(403).json({
                success: false,
                message: 'System material types cannot be deleted',
            });
        }

        await deleteMaterialType(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Material Type Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'Material type deleted successfully' });
    } catch (error) {
        console.error('Error deleting material type:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addMaterialType,
    getAllMaterialTypesController,
    updateMaterialTypeController,
    deleteMaterialTypeController,
};
