const {
    createItem,
    getAllItems,
    updateItem,
    deleteItem,
    getItemById,
} = require('../models/itemModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addItem = async (req, res) => {
    try {
        const { itemName } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!itemName || !itemName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Item name is required',
            });
        }

        const item = await createItem(itemName.trim(), addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Item Master',
            'created',
            null,
            {
                id: item.insertId,
                item_name: itemName.trim(),
                added_by: addedBy,
                device_id: deviceId,
            }
        );

        res.status(201).json({
            success: true,
            message: 'Item added successfully',
            data: item,
        });
    } catch (error) {
        console.error('Error adding item:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Item name already exists',
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllItemsController = async (req, res) => {
    try {
        const items = await getAllItems();
        res.status(200).json({
            success: true,
            message: 'Items retrieved successfully',
            data: items,
        });
    } catch (error) {
        console.error('Error retrieving items:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateItemController = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemName } = req.body;

        if (!itemName || !itemName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Item name is required',
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getItemById(id);

        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        await updateItem(id, itemName.trim());

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Item Master',
            'updated',
            beforeData,
            { ...beforeData, item_name: itemName.trim() }
        );

        res.status(200).json({ success: true, message: 'Item updated successfully' });
    } catch (error) {
        console.error('Error updating item:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Item name already exists',
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteItemController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getItemById(id);

        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        await deleteItem(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Item Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addItem,
    getAllItemsController,
    updateItemController,
    deleteItemController,
};
