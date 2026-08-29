const {
    createRawMaterial,
    getAllRawMaterials,
    getRawMaterialById,
    updateRawMaterial,
    deleteRawMaterial
} = require('../models/rawMaterialModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addRawMaterial = async (req, res) => {
    try {
        const {
            materialId,
            grade,
            minimumBalance,
            remark
        } = req.body;

        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!grade || !grade.trim()) {
            return res.status(400).json({ success: false, message: 'Grade is required' });
        }

        const data = {
            materialId: materialId || null,
            grade: grade.trim(),
            minimumBalance: minimumBalance !== undefined && minimumBalance !== null && minimumBalance !== '' ? Number(minimumBalance) : 0.00,
            remark: remark ? remark.trim() : null
        };

        const rawMaterial = await createRawMaterial(data, addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Raw Material Master',
            'created',
            null,
            {
                id: rawMaterial.insertId,
                ...data,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Raw material added successfully',
            data: rawMaterial
        });
    } catch (error) {
        console.error('Error adding raw material:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'This type and grade combination already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllRawMaterialsController = async (req, res) => {
    try {
        const rawMaterials = await getAllRawMaterials();
        res.status(200).json({
            success: true,
            message: 'Raw materials retrieved successfully',
            data: rawMaterials
        });
    } catch (error) {
        console.error('Error retrieving raw materials:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getRawMaterialByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const rawMaterial = await getRawMaterialById(id);
        if (!rawMaterial) {
            return res.status(404).json({ success: false, message: 'Raw material not found' });
        }
        res.status(200).json({ success: true, message: 'Raw material retrieved successfully', data: rawMaterial });
    } catch (error) {
        console.error('Error retrieving raw material:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateRawMaterialController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            materialId,
            grade,
            minimumBalance,
            remark
        } = req.body;

        if (!grade || !grade.trim()) {
            return res.status(400).json({ success: false, message: 'Grade is required' });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getRawMaterialById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Raw material not found' });
        }

        const data = {
            materialId: materialId || null,
            grade: grade.trim(),
            minimumBalance: minimumBalance !== undefined && minimumBalance !== null && minimumBalance !== '' ? Number(minimumBalance) : 0.00,
            remark: remark ? remark.trim() : null
        };

        await updateRawMaterial(id, data);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Raw Material Master',
            'updated',
            beforeData,
            { ...beforeData, ...data }
        );

        res.status(200).json({ success: true, message: 'Raw material updated successfully' });
    } catch (error) {
        console.error('Error updating raw material:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'This type and grade combination already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteRawMaterialController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getRawMaterialById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Raw material not found' });
        }

        await deleteRawMaterial(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Raw Material Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'Raw material deleted successfully' });
    } catch (error) {
        console.error('Error deleting raw material:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addRawMaterial,
    getAllRawMaterialsController,
    getRawMaterialByIdController,
    updateRawMaterialController,
    deleteRawMaterialController
};
