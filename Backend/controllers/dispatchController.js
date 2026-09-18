const dispatchModel = require('../models/dispatchModel.js');

const createDispatch = async (req, res) => {
    try {
        const {
            stock_status_id,
            material_id,
            internal_batch_number,
            quantity,
            packing_method,
            dispatch_date,
            party_name,
            vehicle_no,
            remarks,
            dispatch_no
        } = req.body;

        const addedBy = req.user?.id || 1;

        if (!internal_batch_number) {
            return res.status(400).json({
                success: false,
                message: 'Material / internal batch number is required'
            });
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Dispatch quantity must be greater than zero'
            });
        }

        if (!packing_method || !packing_method.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Packing method is required'
            });
        }

        const result = await dispatchModel.createDispatch({
            stock_status_id,
            material_id,
            internal_batch_number,
            quantity: qty,
            packing_method,
            dispatch_date,
            party_name,
            vehicle_no,
            remarks,
            dispatch_no
        }, addedBy);

        return res.status(201).json({
            success: true,
            message: 'Material dispatched successfully! Stock status and stock book updated.',
            data: result
        });
    } catch (error) {
        console.error('Error creating dispatch:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to create dispatch'
        });
    }
};

const getAllDispatches = async (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date || '',
            end_date: req.query.end_date || '',
            material_id: req.query.material_id || '',
            search: req.query.search || ''
        };

        const records = await dispatchModel.getAllDispatches(filters);
        return res.status(200).json({
            success: true,
            data: records
        });
    } catch (error) {
        console.error('Error fetching dispatches:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch dispatch records'
        });
    }
};

const getAvailableStockBatches = async (req, res) => {
    try {
        const batches = await dispatchModel.getAvailableStockStatusBatches();
        return res.status(200).json({
            success: true,
            data: batches
        });
    } catch (error) {
        console.error('Error fetching available stock batches:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch available stock batches'
        });
    }
};

const getDispatchById = async (req, res) => {
    try {
        const { id } = req.params;
        const dispatch = await dispatchModel.getDispatchById(id);
        if (!dispatch) {
            return res.status(404).json({
                success: false,
                message: 'Dispatch record not found'
            });
        }
        return res.status(200).json({
            success: true,
            data: dispatch
        });
    } catch (error) {
        console.error('Error fetching dispatch details:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch dispatch details'
        });
    }
};

module.exports = {
    createDispatch,
    getAllDispatches,
    getAvailableStockBatches,
    getDispatchById
};
