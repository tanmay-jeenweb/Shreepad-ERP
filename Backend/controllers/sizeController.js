const {
    createSize,
    getAllSizes,
    updateSize,
    deleteSize,
    getSizeById,
} = require('../models/sizeModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addSize = async (req, res) => {
    try {
        const { sizeName, name } = req.body;
        const targetName = (sizeName !== undefined && sizeName !== null) ? sizeName : name;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!targetName || !targetName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Size name is required',
            });
        }

        const size = await createSize(targetName.trim(), addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Size Master',
            'created',
            null,
            {
                id: size.insertId,
                size_name: targetName.trim(),
                added_by: addedBy,
                device_id: deviceId,
            }
        );

        res.status(201).json({
            success: true,
            message: 'Size added successfully',
            data: size,
        });
    } catch (error) {
        console.error('Error adding size:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Size name already exists',
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllSizesController = async (req, res) => {
    try {
        const sizes = await getAllSizes();
        res.status(200).json({
            success: true,
            message: 'Sizes retrieved successfully',
            data: sizes,
        });
    } catch (error) {
        console.error('Error retrieving sizes:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateSizeController = async (req, res) => {
    try {
        const { id } = req.params;
        const { sizeName, name } = req.body;
        const targetName = (sizeName !== undefined && sizeName !== null) ? sizeName : name;

        if (!targetName || !targetName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Size name is required',
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getSizeById(id);

        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Size not found' });
        }

        await updateSize(id, targetName.trim());

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Size Master',
            'updated',
            beforeData,
            { ...beforeData, size_name: targetName.trim() }
        );

        res.status(200).json({ success: true, message: 'Size updated successfully' });
    } catch (error) {
        console.error('Error updating size:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Size name already exists',
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteSizeController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getSizeById(id);

        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Size not found' });
        }

        await deleteSize(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Size Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'Size deleted successfully' });
    } catch (error) {
        console.error('Error deleting size:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addSize,
    getAllSizesController,
    updateSizeController,
    deleteSizeController,
};
