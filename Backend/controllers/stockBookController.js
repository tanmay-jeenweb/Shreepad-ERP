const stockBookModel = require('../models/stockBookModel.js');

const getStockBookRecords = async (req, res) => {
    try {
        const filters = {
            vendor_id: req.query.vendor_id || null,
            job_party_id: req.query.job_party_id || null,
            material_id: req.query.material_id || null,
            location_id: req.query.location_id || null,
            start_date: req.query.start_date || null,
            end_date: req.query.end_date || null,
            material_type: req.query.material_type || null
        };
        const records = await stockBookModel.getStockBookRecords(filters);
        res.json({ success: true, data: records });
    } catch (error) {
        console.error('Error fetching stock book records:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stock book records' });
    }
};

const createStockIssue = async (req, res) => {
    try {
        const { material_id, grade, issue_quantity, p_memo_number, issue_date, remarks } = req.body;
        const addedBy = req.user.id;

        if (!material_id || !issue_quantity || !issue_date) {
            return res.status(400).json({ success: false, message: 'Invalid data: material_id, issue_quantity, and issue_date are required' });
        }

        const issueId = await stockBookModel.createStockIssue({
            material_id,
            grade,
            issue_quantity,
            p_memo_number,
            issue_date,
            remarks
        }, addedBy);

        res.status(201).json({ success: true, message: 'Stock issued successfully', data: { issueId } });
    } catch (error) {
        console.error('Error creating stock issue:', error);
        res.status(400).json({ success: false, message: error.message || 'Failed to create stock issue' });
    }
};

const getStockIssueLogs = async (req, res) => {
    try {
        const { materialId } = req.params;
        const { grade } = req.query;
        if (!materialId) {
            return res.status(400).json({ success: false, message: 'Material ID is required' });
        }

        const logs = await stockBookModel.getStockIssueLogs(materialId, grade);
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error fetching stock issue logs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stock issue logs' });
    }
};

const getActiveBatches = async (req, res) => {
    try {
        const batches = await stockBookModel.getActiveBatches();
        res.json({ success: true, data: batches });
    } catch (error) {
        console.error('Error fetching active batches:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch active batches' });
    }
};

const removeMaterialStock = async (req, res) => {
    try {
        const { grn_item_id, ma_item_id, removal_quantity, removal_type, date, remarks } = req.body;
        const addedBy = req.user.id;

        if ((!grn_item_id && !ma_item_id) || !removal_quantity || !removal_type || !date) {
            return res.status(400).json({ success: false, message: 'grn_item_id or ma_item_id, removal_quantity, removal_type, and date are required' });
        }

        const qty = parseFloat(removal_quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ success: false, message: 'Removal quantity must be greater than zero' });
        }

        const issueId = await stockBookModel.removeMaterialStock({
            grn_item_id: grn_item_id ? Number(grn_item_id) : null,
            ma_item_id: ma_item_id ? Number(ma_item_id) : null,
            removal_quantity: qty,
            removal_type,
            date,
            remarks
        }, addedBy);

        res.status(201).json({ success: true, message: 'Material removed successfully', data: { issueId } });
    } catch (error) {
        console.error('Error removing material stock:', error);
        res.status(500).json({ success: false, message: 'Failed to remove material stock' });
    }
};

module.exports = {
    getStockBookRecords,
    createStockIssue,
    getStockIssueLogs,
    getActiveBatches,
    removeMaterialStock
};
