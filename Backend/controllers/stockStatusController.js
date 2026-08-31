const stockStatusModel = require('../models/stockStatusModel.js');

const getAllStockStatus = async (req, res) => {
    try {
        const material_type = req.query.material_type || req.query.type || null;
        const filters = {
            vendor_id: req.query.vendor_id || null,
            job_party_id: req.query.job_party_id || null,
            material_id: req.query.material_id || null,
            location_id: req.query.location_id || null,
            start_date: req.query.start_date || null,
            end_date: req.query.end_date || null,
            material_type: material_type
        };
        const records = await stockStatusModel.getAllStockStatus(material_type, filters);
        res.json({ success: true, data: records });
    } catch (error) {
        console.error('Error fetching stock status records:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stock status records' });
    }
};

module.exports = {
    getAllStockStatus,
};
