const {
    createPurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder,
    getDistinctMaterialTypes,
    getMaterialsByType,
    revisePurchaseOrder,
} = require('../models/purchaseOrderModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');
const { getAllVendors } = require('../models/vendorModel.js');

// ─── Add Purchase Order ───────────────────────────────────────────────────────

const addPOController = async (req, res) => {
    try {
        const { header, items } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!header || !header.name || !header.name.trim()) {
            return res.status(400).json({ success: false, message: 'PO name is required' });
        }
        if (!header.po_date) {
            return res.status(400).json({ success: false, message: 'PO date is required' });
        }

        const { poId, poNumber } = await createPurchaseOrder(header, items || [], addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Purchase Order',
            'created',
            null,
            { po_number: poNumber, name: header.name }
        );

        return res.status(201).json({
            success: true,
            message: 'Purchase Order created successfully',
            data: { id: poId, po_number: poNumber }
        });
    } catch (err) {
        console.error('addPOController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to create Purchase Order', error: err.message });
    }
};

// ─── Get All POs ──────────────────────────────────────────────────────────────

const getAllPOsController = async (req, res) => {
    try {
        const data = await getAllPurchaseOrders();
        return res.json({ success: true, data });
    } catch (err) {
        console.error('getAllPOsController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch Purchase Orders' });
    }
};

// ─── Get PO By ID ─────────────────────────────────────────────────────────────

const getPOByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await getPurchaseOrderById(id);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }
        return res.json({ success: true, data });
    } catch (err) {
        console.error('getPOByIdController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch Purchase Order' });
    }
};

// ─── Update PO ────────────────────────────────────────────────────────────────

const updatePOController = async (req, res) => {
    try {
        const { id } = req.params;
        const { header, items } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!header || !header.name || !header.name.trim()) {
            return res.status(400).json({ success: false, message: 'PO name is required' });
        }

        const existing = await getPurchaseOrderById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }

        if (existing.status === 'closed') {
            return res.status(400).json({ success: false, message: 'This Purchase Order is closed (fully delivered) and cannot be updated.' });
        }

        await updatePurchaseOrder(id, header, items || []);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Purchase Order',
            'updated',
            { name: existing.name },
            { name: header.name }
        );

        return res.json({ success: true, message: 'Purchase Order updated successfully' });
    } catch (err) {
        console.error('updatePOController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to update Purchase Order', error: err.message });
    }
};

// ─── Revise PO ────────────────────────────────────────────────────────────────

const revisePOController = async (req, res) => {
    try {
        const { id } = req.params;
        const { header, items } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!header || !header.name || !header.name.trim()) {
            return res.status(400).json({ success: false, message: 'PO name is required' });
        }

        const existing = await getPurchaseOrderById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }

        if (existing.status === 'closed') {
            return res.status(400).json({ success: false, message: 'This Purchase Order is closed (fully delivered) and cannot be revised.' });
        }

        const { poId, poNumber } = await revisePurchaseOrder(id, header, items || [], addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Purchase Order',
            'revised',
            { po_number: existing.po_number },
            { po_number: poNumber }
        );

        return res.json({ success: true, message: 'Purchase Order revised successfully', data: { id: poId, po_number: poNumber } });
    } catch (err) {
        console.error('revisePOController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to revise Purchase Order', error: err.message });
    }
};

// ─── Delete PO ────────────────────────────────────────────────────────────────

const deletePOController = async (req, res) => {
    try {
        const { id } = req.params;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const existing = await getPurchaseOrderById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }

        if (existing.status === 'closed') {
            return res.status(400).json({ success: false, message: 'This Purchase Order is closed (fully delivered) and cannot be deleted.' });
        }

        await deletePurchaseOrder(id);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Purchase Order',
            'deleted',
            { po_number: existing.po_number, name: existing.name },
            null
        );

        return res.json({ success: true, message: 'Purchase Order deleted successfully' });
    } catch (err) {
        console.error('deletePOController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete Purchase Order' });
    }
};

// ─── Get Material Types ───────────────────────────────────────────────────────

const getMaterialTypesController = async (req, res) => {
    try {
        const types = await getDistinctMaterialTypes();
        return res.json({ success: true, data: types });
    } catch (err) {
        console.error('getMaterialTypesController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch material types' });
    }
};

// ─── Get Materials By Type ────────────────────────────────────────────────────

const getMaterialsByTypeController = async (req, res) => {
    try {
        const { type } = req.query;
        if (!type) {
            return res.status(400).json({ success: false, message: 'type query param is required' });
        }
        const materials = await getMaterialsByType(type);
        return res.json({ success: true, data: materials });
    } catch (err) {
        console.error('getMaterialsByTypeController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch materials by type' });
    }
};

// ─── Get Vendors for PO ────────────────────────────────────────────────────────

const getVendorsForPOController = async (req, res) => {
    try {
        const vendors = await getAllVendors(false);
        return res.json({ success: true, data: vendors });
    } catch (err) {
        console.error('getVendorsForPOController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch vendors for PO' });
    }
};

module.exports = {
    addPOController,
    getAllPOsController,
    getPOByIdController,
    updatePOController,
    deletePOController,
    getMaterialTypesController,
    getMaterialsByTypeController,
    getVendorsForPOController,
    revisePOController,
};
