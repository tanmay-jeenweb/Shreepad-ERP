const {
    createGrn,
    getAllGrns,
    getGrnById,
    updateGrn,
    deleteGrn,
    partiallyCloseGrn,
    getGrnsWithPendingPos,
    previewNextBatchNumber,
} = require('../models/grnModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');
const { getAllVendors } = require('../models/vendorModel.js');
// Removed jobPartyModel import

// ─── Add GRN ──────────────────────────────────────────────────────────────────

const addGrnController = async (req, res) => {
    try {
        const { header, items } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!header || !header.name || !header.name.trim()) {
            return res.status(400).json({ success: false, message: 'Vendor name is required' });
        }
        if (!header.grn_date) {
            return res.status(400).json({ success: false, message: 'GRN date is required' });
        }

        const { grnId, grnNumber } = await createGrn(header, items || [], addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'GRN',
            'created',
            null,
            { grn_number: grnNumber, name: header.name }
        );

        return res.status(201).json({
            success: true,
            message: 'GRN created successfully',
            data: { id: grnId, grn_number: grnNumber }
        });
    } catch (err) {
        console.error('addGrnController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to create GRN', error: err.message });
    }
};

// ─── Get All GRNs ───────────────────────────────────────────────────────────────────

const getAllGrnsController = async (req, res) => {
    try {
        const data = await getAllGrns();
        return res.json({ success: true, data });
    } catch (err) {
        console.error('getAllGrnsController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch GRNs' });
    }
};

// ─── Get Unified GRN List (GRNs + Approved POs pending GRN) ────────────────────

const getGrnsUnifiedController = async (req, res) => {
    try {
        const data = await getGrnsWithPendingPos();
        return res.json({ success: true, data });
    } catch (err) {
        console.error('getGrnsUnifiedController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch unified GRN list' });
    }
};

// ─── Get GRN By ID ────────────────────────────────────────────────────────────

const getGrnByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await getGrnById(id);
        if (!data) {
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }
        return res.json({ success: true, data });
    } catch (err) {
        console.error('getGrnByIdController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch GRN' });
    }
};

// ─── Update GRN ───────────────────────────────────────────────────────────────

const updateGrnController = async (req, res) => {
    try {
        const { id } = req.params;
        const { header, items } = req.body;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!header || !header.name || !header.name.trim()) {
            return res.status(400).json({ success: false, message: 'Vendor name is required' });
        }

        const existing = await getGrnById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        if (existing.status === 'closed') {
            return res.status(400).json({ success: false, message: 'This GRN is closed and cannot be modified.' });
        }

        await updateGrn(id, header, items || []);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'GRN',
            'updated',
            { grn_number: existing.grn_number },
            { grn_number: existing.grn_number, name: header.name }
        );

        return res.json({ success: true, message: 'GRN updated successfully' });
    } catch (err) {
        console.error('updateGrnController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to update GRN', error: err.message });
    }
};

// ─── Delete GRN ───────────────────────────────────────────────────────────────

const deleteGrnController = async (req, res) => {
    try {
        const { id } = req.params;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const existing = await getGrnById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        if (existing.status === 'closed') {
            return res.status(400).json({ success: false, message: 'This GRN is closed and cannot be deleted.' });
        }

        await deleteGrn(id);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'GRN',
            'deleted',
            { grn_number: existing.grn_number, name: existing.name },
            null
        );

        return res.json({ success: true, message: 'GRN deleted successfully' });
    } catch (err) {
        console.error('deleteGrnController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete GRN' });
    }
};

// ─── Partially Close GRN ───────────────────────────────────────────────────────

const partiallyCloseGrnController = async (req, res) => {
    try {
        const { id } = req.params;
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const existing = await getGrnById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        if (existing.status !== 'partially_received') {
            return res.status(400).json({ success: false, message: 'Only partially received GRNs can be partially closed.' });
        }

        await partiallyCloseGrn(id);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'GRN',
            'partially_closed',
            { grn_number: existing.grn_number, status: existing.status },
            { status: 'partially_closed' }
        );

        return res.json({ success: true, message: 'GRN partially closed successfully' });
    } catch (err) {
        console.error('partiallyCloseGrnController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to partially close GRN' });
    }
};

// ─── Get Vendors (dropdown helper) ───────────────────────────────────────────

const getVendorsForGrnController = async (req, res) => {
    try {
        const data = await getAllVendors(false);
        return res.json({ success: true, data });
    } catch (err) {
        console.error('getVendorsForGrnController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
    }
};

const getNextBatchNumberController = async (req, res) => {
    try {
        const { material_id } = req.query;
        if (!material_id) {
            return res.status(400).json({ success: false, message: 'material_id is required' });
        }
        const preview = await previewNextBatchNumber(material_id);
        return res.json({ success: true, data: preview });
    } catch (err) {
        console.error('getNextBatchNumberController error:', err);
        return res.status(500).json({ success: false, message: 'Failed to preview next batch number' });
    }
};

module.exports = {
    addGrnController,
    getAllGrnsController,
    getGrnsUnifiedController,
    getGrnByIdController,
    updateGrnController,
    deleteGrnController,
    partiallyCloseGrnController,
    getVendorsForGrnController,
    getNextBatchNumberController,
};
