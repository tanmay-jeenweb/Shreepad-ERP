const {
    getNextPMemoNo,
    getPMemoByWorkOrderItemId,
    createPMemo,
    getPMemoRmIssues
} = require('../models/pmemoModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const getPMemoDetails = async (req, res) => {
    try {
        const { workOrderItemId } = req.params;
        if (!workOrderItemId) {
            return res.status(400).json({ success: false, message: 'Work Order Item ID is required' });
        }

        const details = await getPMemoByWorkOrderItemId(workOrderItemId);
        if (!details) {
            return res.status(404).json({ success: false, message: 'Work Order Item not found' });
        }

        const nextNo = await getNextPMemoNo();

        // Fetch RM issues if production memo already exists
        let rmIssues = [];
        let rmReturns = [];
        let shifts = [];
        if (details.p_memo_no) {
            // Find pmemo_id from database
            const db = require('../config/db.js');
            const [memoRows] = await db.execute(
                `SELECT id FROM production_memos WHERE work_order_item_id = ?`,
                [workOrderItemId]
            );
            if (memoRows.length > 0) {
                const pmemoId = memoRows[0].id;
                rmIssues = await getPMemoRmIssues(pmemoId);

                // Fetch RM returns for this pmemo_id
                const [returnRows] = await db.execute(
                    `SELECT 
                        r.id,
                        r.return_no,
                        r.return_date,
                        r.material_id,
                        r.material_name,
                        NULL AS job_party_name,
                        r.grade,
                        r.location_id,
                        r.location_name,
                        r.quantity,
                        r.internal_batch_number,
                        COALESCE(ss.mfi, '') AS mfi,
                        COALESCE(gi.supplier_batch_number, '') AS supplier_batch_number
                     FROM rm_returns r
                     LEFT JOIN stock_status ss ON r.internal_batch_number = ss.internal_batch_number
                     LEFT JOIN grn_items gi ON ss.internal_batch_number = gi.internal_batch_number AND ss.grn_id IS NOT NULL
                     WHERE r.pmemo_id = ?
                     ORDER BY r.id ASC`,
                    [pmemoId]
                );
                rmReturns = returnRows;

                // Fetch Production Shifts and Hourly Logs
                try {
                    const { getShiftsByPMemoId } = require('../models/workshopEntryModel.js');
                    shifts = await getShiftsByPMemoId(pmemoId);
                } catch (shiftErr) {
                    console.error('Error fetching shifts for P Memo:', shiftErr);
                }
            }
        }

        const db = require('../config/db.js');
        let bomRawMaterials = [];
        try {
            const [bomRows] = await db.execute(
                `SELECT 
                    bm.material_id,
                    m.material_name,
                    m.material_code,
                    bm.quantity AS bom_quantity
                 FROM work_order_items woi
                 JOIN bill_of_materials bom ON woi.material_id = bom.material_id
                 JOIN bom_materials bm ON bom.id = bm.bom_id
                 JOIN materials m ON bm.material_id = m.id
                 WHERE woi.id = ?
                 ORDER BY m.material_name ASC`,
                [workOrderItemId]
            );
            bomRawMaterials = bomRows;
        } catch (bomErr) {
            console.error('Error fetching BOM raw materials for P Memo:', bomErr);
        }

        const productionLogs = (shifts || []).flatMap(s => (s.logs || []).map(l => ({
            ...l,
            shift_name: s.shift_name,
            shift_date: s.shift_date,
            shift_id: s.id
        })));

        res.status(200).json({
            success: true,
            data: {
                ...details,
                proposed_p_memo_no: nextNo,
                rmIssues,
                rmReturns,
                shifts: shifts || [],
                productionLogs,
                bomRawMaterials
            }
        });
    } catch (error) {
        console.error('Error fetching P Memo details:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const addPMemo = async (req, res) => {
    try {
        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const {
            workOrderItemId,
            date,
            is_final_submitted,
            rmIssues
        } = req.body;

        if (!workOrderItemId || !date) {
            return res.status(400).json({ success: false, message: 'Work Order Item ID and Date are required' });
        }

        const result = await createPMemo(
            workOrderItemId,
            date,
            is_final_submitted ? 1 : 0,
            rmIssues !== undefined ? rmIssues : null,
            addedBy
        );

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Production Memo',
            'saved',
            null,
            {
                work_order_item_id: workOrderItemId,
                p_memo_no: result.p_memo_no,
                date,
                is_final_submitted,
                rmIssues_count: Array.isArray(rmIssues) ? rmIssues.length : undefined,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'P Memo saved successfully',
            data: result
        });
    } catch (error) {
        console.error('Error saving P Memo:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

const getAvailableBatchesController = async (req, res) => {
    try {
        const { material_id, grade } = req.query;
        if (!material_id) {
            return res.status(400).json({ success: false, message: 'Material ID is required' });
        }
        const { getAvailableBatches } = require('../models/pmemoModel.js');
        const batches = await getAvailableBatches(Number(material_id), grade || '');
        res.status(200).json({ success: true, data: batches });
    } catch (error) {
        console.error('Error fetching available batches:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getPMemoDetails,
    addPMemo,
    getAvailableBatchesController
};
