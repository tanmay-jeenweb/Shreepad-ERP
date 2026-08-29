const stockStatusModel = require('../models/stockStatusModel.js');

const getAllStockStatus = async (req, res) => {
    try {
        const { type } = req.query; // 'rm' or 'general'
        const filters = {
            vendor_id: req.query.vendor_id || null,
            job_party_id: req.query.job_party_id || null,
            material_id: req.query.material_id || null,
            rm_grade: req.query.rm_grade || null,
            location_id: req.query.location_id || null,
            start_date: req.query.start_date || null,
            end_date: req.query.end_date || null
        };
        const records = await stockStatusModel.getAllStockStatus(type, filters);
        res.json({ success: true, data: records });
    } catch (error) {
        console.error('Error fetching stock status records:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stock status records' });
    }
};

module.exports = {
    getAllStockStatus,
};
