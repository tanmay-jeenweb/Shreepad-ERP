const dispatchModel = require('../models/dispatchModel.js');

const createDispatch = async (req, res) => {
    try {
        const {
            stock_status_id,
            material_id,
            internal_batch_number,
            quantity,
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

        const result = await dispatchModel.createDispatch({
            stock_status_id,
            material_id,
            internal_batch_number,
            quantity: qty,
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

const getWorkOrdersForDispatch = async (req, res) => {
    try {
        const tab = req.query.tab === 'completed' ? 'completed' : 'ongoing';
        const records = await dispatchModel.getWorkOrdersForDispatch(tab);
        return res.status(200).json({
            success: true,
            data: records
        });
    } catch (error) {
        console.error('Error fetching work orders for dispatch:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch work orders for dispatch'
        });
    }
};

const createWorkOrderDispatch = async (req, res) => {
    try {
        const {
            work_order_item_id,
            quantity,
            dispatch_date,
            party_name,
            vehicle_no,
            remarks,
            internal_batch_number,
            batches,
            dispatch_no
        } = req.body;

        const addedBy = req.user?.id || 1;

        if (!work_order_item_id) {
            return res.status(400).json({
                success: false,
                message: 'Work order item ID is required'
            });
        }

        const hasBatches = Array.isArray(batches) && batches.some(b => parseFloat(b.quantity) > 0);
        const qty = parseFloat(quantity);
        if (!hasBatches && (isNaN(qty) || qty <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'Dispatch quantity must be greater than zero'
            });
        }

        const result = await dispatchModel.createWorkOrderDispatch({
            work_order_item_id,
            quantity: qty,
            dispatch_date,
            party_name,
            vehicle_no,
            remarks,
            internal_batch_number,
            batches,
            dispatch_no
        }, addedBy);

        const totalQty = result.total_quantity || result.quantity;
        return res.status(201).json({
            success: true,
            message: `Work Order WO-${String(result.work_order_no).padStart(4, '0')} finished goods (${totalQty} ${result.unit}) dispatched successfully!`,
            data: result
        });
    } catch (error) {
        console.error('Error creating work order dispatch:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to dispatch work order finished goods'
        });
    }
};

module.exports = {
    createDispatch,
    createWorkOrderDispatch,
    getWorkOrdersForDispatch,
    getAllDispatches,
    getAvailableStockBatches,
    getDispatchById
};
