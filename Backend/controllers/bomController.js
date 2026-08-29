const {
    createBOM,
    getAllBOMs,
    getBOMById,
    updateBOM,
    deleteBOM,
    getFinishedAndSemiFinishedMaterials,
} = require('../models/bomModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const getProductsController = async (req, res) => {
    try {
        const products = await getFinishedAndSemiFinishedMaterials();
        res.status(200).json({ success: true, data: products });
    } catch (error) {
        console.error('Error fetching BOM products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const addBOM = async (req, res) => {
    try {
        const addedBy  = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const data     = req.body;

        if (!data.materialId) {
            return res.status(400).json({ success: false, message: 'Product (material) is required' });
        }

        const result = await createBOM(data, addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Bill of Material',
            'created',
            null,
            { id: result.insertId, ...data, added_by: addedBy, device_id: deviceId }
        );

        res.status(201).json({ success: true, message: 'BOM created successfully', data: result });
    } catch (error) {
        console.error('Error creating BOM:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllBOMsController = async (req, res) => {
    try {
        const boms = await getAllBOMs();
        res.status(200).json({ success: true, data: boms });
    } catch (error) {
        console.error('Error fetching BOMs:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateBOMController = async (req, res) => {
    try {
        const { id }   = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const data     = req.body;

        const beforeData = await getBOMById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'BOM not found' });
        }

        if (!data.materialId) {
            return res.status(400).json({ success: false, message: 'Product (material) is required' });
        }

        await updateBOM(id, data);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Bill of Material',
            'updated',
            beforeData,
            { ...beforeData, ...data }
        );

        res.status(200).json({ success: true, message: 'BOM updated successfully' });
    } catch (error) {
        console.error('Error updating BOM:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteBOMController = async (req, res) => {
    try {
        const { id }   = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getBOMById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'BOM not found' });
        }

        await deleteBOM(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Bill of Material',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'BOM deleted successfully' });
    } catch (error) {
        console.error('Error deleting BOM:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getProductsController,
    addBOM,
    getAllBOMsController,
    updateBOMController,
    deleteBOMController,
};
