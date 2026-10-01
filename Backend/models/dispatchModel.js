const db = require('../config/db.js');

const createDispatchTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS dispatches (
            id                     INT AUTO_INCREMENT PRIMARY KEY,
            dispatch_no            VARCHAR(50) NOT NULL UNIQUE,
            dispatch_date          DATE NOT NULL,
            stock_status_id        INT DEFAULT NULL,
            material_id            INT NOT NULL,
            internal_batch_number  VARCHAR(100) NOT NULL,
            quantity               DECIMAL(15,4) NOT NULL,
            party_name             VARCHAR(255) DEFAULT NULL,
            vehicle_no             VARCHAR(100) DEFAULT NULL,
            remarks                TEXT DEFAULT NULL,
            added_by               INT NOT NULL,
            created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by)    REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log('Dispatches table ready');
    await ensureDispatchColumns();
};

const ensureDispatchColumns = async () => {
    try {
        const [cols] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'dispatches' 
              AND COLUMN_NAME = 'packing_method'
        `);
        if (cols.length > 0) {
            console.log("Dropping unused packing_method column from dispatches...");
            await db.execute(`ALTER TABLE dispatches DROP COLUMN packing_method`);
        }

        const [woCols] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'dispatches' 
              AND COLUMN_NAME = 'work_order_id'
        `);
        if (woCols.length === 0) {
            console.log("Adding work_order_id and work_order_item_id to dispatches table...");
            await db.execute(`
                ALTER TABLE dispatches 
                ADD COLUMN work_order_id INT DEFAULT NULL, 
                ADD COLUMN work_order_item_id INT DEFAULT NULL
            `);
            try {
                await db.execute(`ALTER TABLE dispatches ADD CONSTRAINT fk_dispatches_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL`);
            } catch (fkErr) {
                console.warn("Notice adding fk_dispatches_work_order:", fkErr.message);
            }
            try {
                await db.execute(`ALTER TABLE dispatches ADD CONSTRAINT fk_dispatches_wo_item FOREIGN KEY (work_order_item_id) REFERENCES work_order_items(id) ON DELETE SET NULL`);
            } catch (fkErr) {
                console.warn("Notice adding fk_dispatches_wo_item:", fkErr.message);
            }
        }
    } catch (err) {
        console.error("Error ensuring columns for dispatches:", err);
    }
};

const generateDispatchNo = async (connection) => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `DSP-${todayStr}-`;
    const [rows] = await connection.execute(
        `SELECT dispatch_no FROM dispatches WHERE dispatch_no LIKE ? ORDER BY id DESC LIMIT 1`,
        [`${prefix}%`]
    );
    let nextSeq = 1;
    if (rows.length > 0) {
        const lastNo = rows[0].dispatch_no;
        const parts = lastNo.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
        }
    }
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

const getAvailableStockStatusBatches = async () => {
    const query = `
        SELECT
            ss.id AS stock_status_id,
            ss.internal_batch_number,
            COALESCE(mai.supplier_batch_number, '') AS supplier_batch_number,
            ss.party,
            ss.location,
            ss.material_id,
            ss.material_name,
            ss.material_type,
            COALESCE(u.unit_name, 'Nos') AS unit,
            COALESCE(ma.ma_number, r.return_no, CONCAT('WO-', LPAD(wo.work_order_no, 4, '0')), '—') AS grn_number,
            (COALESCE(r.quantity, ss.total_kg, 0) - COALESCE(issue_agg.issued_qty, 0)) AS available_quantity
        FROM stock_status ss
        LEFT JOIN materials m ON ss.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN material_add_master ma ON ss.ma_id = ma.id
        LEFT JOIN rm_returns r ON ss.rm_return_id = r.id
        LEFT JOIN work_order_items woi ON ss.work_order_item_id = woi.id
        LEFT JOIN work_orders wo ON woi.work_order_id = wo.id
        LEFT JOIN material_add_items mai ON ss.internal_batch_number = mai.internal_batch_number AND ss.ma_id IS NOT NULL
        LEFT JOIN (
            SELECT 
                internal_batch_number,
                SUM(qty) AS issued_qty
            FROM (
                SELECT 
                    COALESCE(mai_sub2.internal_batch_number, r_sub.internal_batch_number) AS internal_batch_number,
                    si.issue_quantity AS qty
                FROM stock_issues si
                LEFT JOIN material_add_items mai_sub2 ON si.ma_item_id = mai_sub2.id
                LEFT JOIN rm_returns r_sub ON si.rm_return_id = r_sub.id

                UNION ALL

                SELECT 
                    d_sub.internal_batch_number,
                    d_sub.quantity AS qty
                FROM dispatches d_sub
            ) all_issues
            WHERE internal_batch_number IS NOT NULL
            GROUP BY internal_batch_number
        ) issue_agg ON ss.internal_batch_number = issue_agg.internal_batch_number
        HAVING available_quantity > 0
        ORDER BY ss.material_name ASC, ss.internal_batch_number ASC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const createDispatch = async (data, addedBy) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const qty = parseFloat(data.quantity);
        if (isNaN(qty) || qty <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        if (!data.internal_batch_number) {
            throw new Error('Internal batch number is required');
        }

        // 1. Lock and fetch current stock_status item
        const [statusRows] = await connection.execute(
            `SELECT 
                ss.id,
                ss.material_id,
                ss.material_name,
                ss.material_type,
                ss.party,
                ss.location,
                ss.total_kg,
                ss.remaining_kg,
                r.quantity AS rm_return_quantity
             FROM stock_status ss
             LEFT JOIN rm_returns r ON ss.rm_return_id = r.id
             WHERE ss.internal_batch_number = ?
             FOR UPDATE`,
            [data.internal_batch_number]
        );

        if (statusRows.length === 0) {
            throw new Error(`Batch '${data.internal_batch_number}' not found in stock status`);
        }

        const stockRow = statusRows[0];
        const materialId = data.material_id || stockRow.material_id;

        // 2. Compute aggregate already issued or dispatched for this batch
        const [issueRows] = await connection.execute(
            `SELECT SUM(qty) AS total_issued
             FROM (
                SELECT si.issue_quantity AS qty
                FROM stock_issues si
                LEFT JOIN material_add_items mai ON si.ma_item_id = mai.id
                LEFT JOIN rm_returns r ON si.rm_return_id = r.id
                WHERE mai.internal_batch_number = ? OR r.internal_batch_number = ?

                UNION ALL

                SELECT d.quantity AS qty
                FROM dispatches d
                WHERE d.internal_batch_number = ?
             ) t`,
            [data.internal_batch_number, data.internal_batch_number, data.internal_batch_number]
        );

        const totalIssued = parseFloat(issueRows[0]?.total_issued || 0);
        const baseQty = parseFloat(stockRow.rm_return_quantity != null ? stockRow.rm_return_quantity : stockRow.total_kg);
        const availableQty = baseQty - totalIssued;

        if (qty > availableQty) {
            throw new Error(
                `Insufficient stock! Requested ${qty}, but only ${availableQty > 0 ? availableQty : 0} is currently available in batch '${data.internal_batch_number}'.`
            );
        }

        // 3. Generate dispatch number if not supplied
        const dispatchNo = data.dispatch_no && data.dispatch_no.trim() 
            ? data.dispatch_no.trim() 
            : await generateDispatchNo(connection);

        const dispatchDate = data.dispatch_date || new Date().toISOString().split('T')[0];
        const partyName = data.party_name || stockRow.party || null;

        // 4. Insert into dispatches
        const insertQuery = `
            INSERT INTO dispatches (
                dispatch_no,
                dispatch_date,
                stock_status_id,
                material_id,
                internal_batch_number,
                quantity,
                party_name,
                vehicle_no,
                remarks,
                added_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [insertRes] = await connection.execute(insertQuery, [
            dispatchNo,
            dispatchDate,
            stockRow.id,
            materialId,
            data.internal_batch_number,
            qty,
            partyName,
            data.vehicle_no || null,
            data.remarks || null,
            addedBy
        ]);

        // 5. Update remaining_kg in stock_status table
        const newRemaining = Math.max(0, (parseFloat(stockRow.remaining_kg) || availableQty) - qty);
        await connection.execute(
            `UPDATE stock_status SET remaining_kg = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [newRemaining, stockRow.id]
        );

        await connection.commit();

        return {
            id: insertRes.insertId,
            dispatch_no: dispatchNo,
            dispatch_date: dispatchDate,
            internal_batch_number: data.internal_batch_number,
            quantity: qty,
            party_name: partyName,
            available_after_dispatch: availableQty - qty
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getWorkOrdersForDispatch = async (tab = 'ongoing') => {
    let query = `
        SELECT 
            wo.id AS work_order_id,
            wo.work_order_no,
            wo.work_order_date,
            COALESCE(wo.status, 'Draft') AS work_order_status,
            wo.started_at,
            wo.customer_id,
            c.customer_name,
            c.customer_code,
            woi.id AS work_order_item_id,
            woi.material_id,
            m.material_name,
            m.material_code,
            m.material_group,
            m.material_type,
            woi.remarks,
            COALESCE(u.unit_name, 'Nos') AS unit,
            COALESCE(wob.batches, woi.batch_no, CONCAT('WO-', LPAD(wo.work_order_no, 4, '0'))) AS batch_no,
            COALESCE(woi.quantity, woi.production_quantity, 0) AS order_quantity,
            COALESCE(woi.production_quantity, 0) AS production_quantity,
            COALESCE(woi.quantity, woi.production_quantity, 0) AS target_quantity,
            COALESCE(fg_agg.completed_quantity, 0) AS completed_quantity,
            COALESCE(dsp_agg.dispatched_quantity, 0) AS dispatched_quantity,
            GREATEST(0, COALESCE(woi.quantity, woi.production_quantity, 0) - COALESCE(dsp_agg.dispatched_quantity, 0)) AS remaining_order_quantity
        FROM work_order_items woi
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN materials m ON woi.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN customer_master c ON wo.customer_id = c.id
        LEFT JOIN (
            SELECT work_order_item_id, GROUP_CONCAT(batch_no ORDER BY id SEPARATOR ', ') AS batches
            FROM work_order_batches
            WHERE work_order_item_id IS NOT NULL
            GROUP BY work_order_item_id
        ) wob ON woi.id = wob.work_order_item_id
        LEFT JOIN (
            SELECT 
                work_order_item_id,
                SUM(
                    CASE 
                        WHEN movement_type = 'revert' THEN -quantity 
                        ELSE quantity 
                    END
                ) AS completed_quantity
            FROM workshop_production_logs
            WHERE to_bom_process_id IS NULL
            GROUP BY work_order_item_id
        ) fg_agg ON woi.id = fg_agg.work_order_item_id
        LEFT JOIN (
            SELECT 
                COALESCE(d.work_order_item_id, ss.work_order_item_id) AS work_order_item_id,
                SUM(d.quantity) AS dispatched_quantity
            FROM dispatches d
            LEFT JOIN stock_status ss ON d.stock_status_id = ss.id
            GROUP BY COALESCE(d.work_order_item_id, ss.work_order_item_id)
        ) dsp_agg ON woi.id = dsp_agg.work_order_item_id
        WHERE COALESCE(woi.is_on_hold, 0) = 0
          AND (COALESCE(woi.quantity, 0) > 0 OR COALESCE(woi.production_quantity, 0) > 0)
          AND (wo.status = 'Started' OR wo.status = 'Completed')
          AND COALESCE(woi.remarks, '') NOT LIKE 'Allocated raw material%'
          AND LOWER(COALESCE(m.material_group, '')) NOT LIKE '%raw%'
    `;

    if (tab === 'completed') {
        query += `
          AND (
            (COALESCE(dsp_agg.dispatched_quantity, 0) >= COALESCE(woi.quantity, woi.production_quantity, 0) AND COALESCE(woi.quantity, woi.production_quantity, 0) > 0)
            OR wo.status = 'Completed'
          )
        `;
    } else {
        // Ongoing: order dispatch is pending
        query += `
          AND (
            COALESCE(dsp_agg.dispatched_quantity, 0) < COALESCE(woi.quantity, woi.production_quantity, 0)
            OR COALESCE(woi.quantity, woi.production_quantity, 0) = 0
          )
          AND wo.status = 'Started'
        `;
    }

    query += ` ORDER BY wo.work_order_no DESC, woi.id DESC`;

    const [rows] = await db.execute(query);
    if (rows.length === 0) return [];

    const itemIds = rows.map(r => r.work_order_item_id);
    const placeholders = itemIds.map(() => '?').join(',');

    // 1. Fetch batch-level finished quantities and dispatches for active Work Orders
    const [batchRows] = await db.execute(`
        SELECT 
            wpl.work_order_item_id,
            COALESCE(NULLIF(TRIM(wpl.batch_no), ''), woi.batch_no, CONCAT('WO-', LPAD(wo.work_order_no, 4, '0'))) AS batch_no,
            SUM(CASE WHEN wpl.movement_type = 'revert' THEN -wpl.quantity ELSE wpl.quantity END) AS completed_qty,
            COALESCE(dsp.dispatched_qty, 0) AS dispatched_qty,
            GREATEST(0, SUM(CASE WHEN wpl.movement_type = 'revert' THEN -wpl.quantity ELSE wpl.quantity END) - COALESCE(dsp.dispatched_qty, 0)) AS available_qty
        FROM workshop_production_logs wpl
        JOIN work_order_items woi ON wpl.work_order_item_id = woi.id
        JOIN work_orders wo ON woi.work_order_id = wo.id
        LEFT JOIN (
            SELECT 
                work_order_item_id,
                internal_batch_number,
                SUM(quantity) AS dispatched_qty
            FROM dispatches
            WHERE work_order_item_id IS NOT NULL
            GROUP BY work_order_item_id, internal_batch_number
        ) dsp ON wpl.work_order_item_id = dsp.work_order_item_id 
             AND COALESCE(NULLIF(TRIM(wpl.batch_no), ''), woi.batch_no, CONCAT('WO-', LPAD(wo.work_order_no, 4, '0'))) = dsp.internal_batch_number
        WHERE wpl.to_bom_process_id IS NULL AND wpl.work_order_item_id IN (${placeholders})
        GROUP BY wpl.work_order_item_id, batch_no, dsp.dispatched_qty
        HAVING available_qty > 0
        ORDER BY available_qty DESC, batch_no ASC
    `, itemIds);

    const woBatchMap = {};
    for (const b of batchRows) {
        if (!woBatchMap[b.work_order_item_id]) {
            woBatchMap[b.work_order_item_id] = [];
        }
        woBatchMap[b.work_order_item_id].push({
            batch_no: b.batch_no,
            source_type: 'wo_production',
            source_label: 'WO Production',
            completed_quantity: parseFloat(b.completed_qty),
            dispatched_quantity: parseFloat(b.dispatched_qty),
            available_quantity: parseFloat(b.available_qty),
            location: 'Workshop FG Bay'
        });
    }

    // 2. Fetch available stock batches in warehouse (stock_status) for these materials
    const uniqueMaterialIds = [...new Set(rows.map(r => r.material_id))];
    const matPlaceholders = uniqueMaterialIds.map(() => '?').join(',');

    const [stockStatusBatches] = await db.execute(`
        SELECT
            ss.id AS stock_status_id,
            ss.material_id,
            ss.internal_batch_number AS batch_no,
            ss.party,
            ss.location,
            ss.total_kg,
            ss.remaining_kg,
            ss.work_order_item_id,
            (COALESCE(r.quantity, ss.total_kg, 0) - COALESCE(issue_agg.issued_qty, 0)) AS available_quantity
        FROM stock_status ss
        LEFT JOIN rm_returns r ON ss.rm_return_id = r.id
        LEFT JOIN (
            SELECT 
                internal_batch_number,
                SUM(qty) AS issued_qty
            FROM (
                SELECT 
                    COALESCE(mai_sub2.internal_batch_number, r_sub.internal_batch_number) AS internal_batch_number,
                    si.issue_quantity AS qty
                FROM stock_issues si
                LEFT JOIN material_add_items mai_sub2 ON si.ma_item_id = mai_sub2.id
                LEFT JOIN rm_returns r_sub ON si.rm_return_id = r_sub.id

                UNION ALL

                SELECT 
                    d_sub.internal_batch_number,
                    d_sub.quantity AS qty
                FROM dispatches d_sub
            ) all_issues
            WHERE internal_batch_number IS NOT NULL
            GROUP BY internal_batch_number
        ) issue_agg ON ss.internal_batch_number = issue_agg.internal_batch_number
        WHERE ss.material_id IN (${matPlaceholders})
        HAVING available_quantity > 0
        ORDER BY ss.internal_batch_number ASC
    `, uniqueMaterialIds);

    const stockBatchMap = {};
    for (const sb of stockStatusBatches) {
        if (!stockBatchMap[sb.material_id]) {
            stockBatchMap[sb.material_id] = [];
        }
        stockBatchMap[sb.material_id].push({
            stock_status_id: sb.stock_status_id,
            material_id: sb.material_id,
            batch_no: sb.batch_no,
            source_type: 'warehouse_stock',
            source_label: 'Warehouse Stock',
            work_order_item_id: sb.work_order_item_id,
            available_quantity: parseFloat(sb.available_quantity),
            location: sb.location || 'Store / Godown',
            party: sb.party
        });
    }

    // 3. Map batches and calculate balance metrics for each work order item
    for (const row of rows) {
        const woBatches = woBatchMap[row.work_order_item_id] || [];
        const allStockForMat = stockBatchMap[row.material_id] || [];

        // Exclude stock_status batches that share the same batch_no as one of the active WO batches to prevent duplicate listing
        const woBatchNames = new Set(woBatches.map(b => String(b.batch_no).trim()));
        const otherStockBatches = allStockForMat.filter(sb => !woBatchNames.has(String(sb.batch_no).trim()));

        // Combined batches with WO batches first, followed by warehouse stock batches
        const combinedBatches = [...woBatches, ...otherStockBatches];

        row.wo_batches = woBatches;
        row.stock_batches = otherStockBatches;
        row.available_batches = combinedBatches;

        const totalAvailableStock = combinedBatches.reduce((sum, b) => sum + parseFloat(b.available_quantity || 0), 0);
        const orderQty = parseFloat(row.order_quantity || 0);
        const completedQty = parseFloat(row.completed_quantity || 0);
        const dispatchedQty = parseFloat(row.dispatched_quantity || 0);
        const remainingOrder = Math.max(0, orderQty - dispatchedQty);

        row.total_available_stock = totalAvailableStock;
        row.available_to_dispatch = totalAvailableStock;
        row.remaining_order_quantity = remainingOrder;
        row.production_difference = Math.max(0, orderQty - completedQty);
        row.needs_stock_fulfillment = orderQty > completedQty;

        if (combinedBatches.length > 1) {
            row.batch_no = `${combinedBatches.length} Batches (${woBatches.length} WO + ${otherStockBatches.length} Stock)`;
        } else if (combinedBatches.length === 1) {
            row.batch_no = combinedBatches[0].batch_no;
        } else {
            row.batch_no = "—";
        }
    }

    return rows;
};

const createWorkOrderDispatch = async (data, addedBy) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const workOrderItemId = data.work_order_item_id;

        // 1. Lock and fetch Work Order Item details
        const [woiRows] = await connection.execute(`
            SELECT 
                woi.id AS work_order_item_id,
                woi.work_order_id,
                woi.material_id,
                woi.batch_no,
                COALESCE(woi.quantity, woi.production_quantity, 0) AS order_quantity,
                COALESCE(woi.production_quantity, 0) AS production_quantity,
                wo.work_order_no,
                wo.status AS work_order_status,
                wo.customer_id,
                c.customer_name,
                m.material_name,
                m.material_type,
                COALESCE(u.unit_name, 'Nos') AS unit
            FROM work_order_items woi
            JOIN work_orders wo ON woi.work_order_id = wo.id
            JOIN materials m ON woi.material_id = m.id
            LEFT JOIN units u ON m.unit_id = u.id
            LEFT JOIN customer_master c ON wo.customer_id = c.id
            WHERE woi.id = ?
            FOR UPDATE
        `, [workOrderItemId]);

        if (woiRows.length === 0) {
            throw new Error('Work Order item not found');
        }

        const woItem = woiRows[0];
        if (woItem.work_order_status !== 'Started' && woItem.work_order_status !== 'Completed') {
            throw new Error(`Cannot dispatch: Work Order WO-${String(woItem.work_order_no).padStart(4, '0')} has not been started yet.`);
        }

        // 2. Normalize batches list (support multi-batch allocation array or single batch input)
        let batchList = [];
        if (Array.isArray(data.batches) && data.batches.length > 0) {
            batchList = data.batches
                .filter(b => parseFloat(b.quantity) > 0)
                .map(b => ({
                    internal_batch_number: String(b.internal_batch_number || b.batch_no).trim(),
                    quantity: parseFloat(b.quantity),
                    stock_status_id: b.stock_status_id || null
                }));
        } else if (data.internal_batch_number && parseFloat(data.quantity) > 0) {
            batchList = [{
                internal_batch_number: String(data.internal_batch_number).trim(),
                quantity: parseFloat(data.quantity),
                stock_status_id: data.stock_status_id || null
            }];
        }

        if (batchList.length === 0) {
            throw new Error('Please select at least one batch with quantity greater than zero to dispatch.');
        }

        const dispatchDate = data.dispatch_date || new Date().toISOString().split('T')[0];
        const partyName = data.party_name || woItem.customer_name || null;
        const vehicleNo = data.vehicle_no || null;
        const remarks = data.remarks || null;

        const createdDispatches = [];
        let totalDispatchedInRequest = 0;

        // 3. Process each batch allocation
        for (const item of batchList) {
            const batchNo = item.internal_batch_number;
            const batchQty = item.quantity;
            totalDispatchedInRequest += batchQty;

            // Check if batch exists in stock_status
            const [statusRows] = await connection.execute(`
                SELECT 
                    id, material_id, material_name, material_type, party, location,
                    total_kg, remaining_kg, work_order_item_id
                FROM stock_status
                WHERE internal_batch_number = ?
                FOR UPDATE
            `, [batchNo]);

            let stockRow = statusRows[0] || null;

            // If not found in stock_status, check if it's a finished goods batch from workshop_production_logs
            if (!stockRow) {
                const [fgRows] = await connection.execute(`
                    SELECT 
                        SUM(CASE WHEN movement_type = 'revert' THEN -quantity ELSE quantity END) AS completed_quantity
                    FROM workshop_production_logs
                    WHERE work_order_item_id = ? AND to_bom_process_id IS NULL
                      AND COALESCE(NULLIF(TRIM(batch_no), ''), ?) = ?
                `, [workOrderItemId, woItem.batch_no || `WO-${String(woItem.work_order_no).padStart(4, '0')}`, batchNo]);

                const fgCompleted = parseFloat(fgRows[0]?.completed_quantity || 0);
                if (fgCompleted > 0) {
                    const [insertSs] = await connection.execute(`
                        INSERT INTO stock_status 
                            (internal_batch_number, party, material_id, material_name, material_type, total_kg, remaining_kg, work_order_item_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        batchNo,
                        woItem.customer_name || 'In-House Production',
                        woItem.material_id,
                        woItem.material_name,
                        woItem.material_type || 'Finished Goods',
                        fgCompleted,
                        fgCompleted,
                        workOrderItemId
                    ]);

                    const [newSs] = await connection.execute(`SELECT * FROM stock_status WHERE id = ? FOR UPDATE`, [insertSs.insertId]);
                    stockRow = newSs[0];
                } else {
                    throw new Error(`Batch '${batchNo}' not found in stock status or workshop production.`);
                }
            }

            // Calculate aggregate issued/dispatched for this batch
            const [issueRows] = await connection.execute(`
                SELECT SUM(qty) AS total_issued
                FROM (
                    SELECT si.issue_quantity AS qty
                    FROM stock_issues si
                    LEFT JOIN material_add_items mai ON si.ma_item_id = mai.id
                    LEFT JOIN rm_returns r ON si.rm_return_id = r.id
                    WHERE mai.internal_batch_number = ? OR r.internal_batch_number = ?

                    UNION ALL

                    SELECT d.quantity AS qty
                    FROM dispatches d
                    WHERE d.internal_batch_number = ?
                ) t
            `, [batchNo, batchNo, batchNo]);

            const totalIssued = parseFloat(issueRows[0]?.total_issued || 0);
            const baseQty = parseFloat(stockRow.total_kg || 0);
            const availableQty = baseQty - totalIssued;

            if (batchQty > availableQty) {
                throw new Error(
                    `Cannot dispatch ${batchQty} ${woItem.unit} from batch '${batchNo}'. Only ${availableQty > 0 ? availableQty : 0} ${woItem.unit} is available.`
                );
            }

            // Generate unique dispatch number for this line
            const dispatchNo = await generateDispatchNo(connection);

            // Insert into dispatches
            const [insertRes] = await connection.execute(`
                INSERT INTO dispatches (
                    dispatch_no,
                    dispatch_date,
                    stock_status_id,
                    material_id,
                    internal_batch_number,
                    quantity,
                    party_name,
                    vehicle_no,
                    remarks,
                    work_order_id,
                    work_order_item_id,
                    added_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                dispatchNo,
                dispatchDate,
                stockRow.id,
                woItem.material_id,
                batchNo,
                batchQty,
                partyName,
                vehicleNo,
                remarks,
                woItem.work_order_id,
                workOrderItemId,
                addedBy
            ]);

            // Deduct remaining_kg in stock_status
            const newRemaining = Math.max(0, (parseFloat(stockRow.remaining_kg) || availableQty) - batchQty);
            await connection.execute(`
                UPDATE stock_status SET remaining_kg = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `, [newRemaining, stockRow.id]);

            createdDispatches.push({
                dispatch_id: insertRes.insertId,
                dispatch_no: dispatchNo,
                batch_no: batchNo,
                quantity: batchQty,
                available_after: availableQty - batchQty
            });
        }

        // 4. Calculate total dispatched against the Order Quantity (woi.quantity)
        const orderQty = parseFloat(woItem.order_quantity) || 0;
        const [totalDispRows] = await connection.execute(`
            SELECT COALESCE(SUM(quantity), 0) AS total_disp
            FROM dispatches
            WHERE work_order_item_id = ?
        `, [workOrderItemId]);
        const newTotalDispatched = parseFloat(totalDispRows[0]?.total_disp || 0);

        // If order_quantity is fully fulfilled, check if the entire work order is complete
        if (orderQty > 0 && newTotalDispatched >= orderQty) {
            const [otherItems] = await connection.execute(`
                SELECT woi.id, COALESCE(woi.quantity, woi.production_quantity, 0) AS target_qty,
                       COALESCE(d_sub.total_disp, 0) AS total_disp
                FROM work_order_items woi
                JOIN materials m ON woi.material_id = m.id
                LEFT JOIN (
                    SELECT work_order_item_id, SUM(quantity) AS total_disp
                    FROM dispatches
                    WHERE work_order_item_id IS NOT NULL
                    GROUP BY work_order_item_id
                ) d_sub ON woi.id = d_sub.work_order_item_id
                WHERE woi.work_order_id = ? AND woi.id != ? 
                  AND COALESCE(woi.quantity, woi.production_quantity, 0) > 0
                  AND COALESCE(woi.remarks, '') NOT LIKE 'Allocated raw material%'
                  AND LOWER(COALESCE(m.material_group, '')) NOT LIKE '%raw%'
            `, [woItem.work_order_id, workOrderItemId]);

            const allOthersDone = otherItems.every(it => parseFloat(it.total_disp) >= parseFloat(it.target_qty));
            if (allOthersDone) {
                await connection.execute(`
                    UPDATE work_orders SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
                `, [woItem.work_order_id]);
            }
        }

        await connection.commit();

        return {
            work_order_id: woItem.work_order_id,
            work_order_no: woItem.work_order_no,
            work_order_item_id: workOrderItemId,
            material_id: woItem.material_id,
            material_name: woItem.material_name,
            unit: woItem.unit,
            party_name: partyName,
            dispatch_date: dispatchDate,
            quantity: totalDispatchedInRequest,
            total_quantity: totalDispatchedInRequest,
            dispatches_created: createdDispatches,
            order_quantity: orderQty,
            dispatched_quantity: newTotalDispatched,
            remaining_order_quantity: Math.max(0, orderQty - newTotalDispatched),
            available_after_dispatch: Math.max(0, orderQty - newTotalDispatched)
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getAllDispatches = async (filters = {}) => {
    let query = `
        SELECT
            d.id,
            d.dispatch_no,
            d.dispatch_date,
            d.stock_status_id,
            d.material_id,
            d.work_order_id,
            d.work_order_item_id,
            wo.work_order_no,
            m.material_name,
            m.material_type,
            COALESCE(u.unit_name, 'Nos') AS unit,
            d.internal_batch_number,
            d.quantity,
            d.party_name,
            d.vehicle_no,
            d.remarks,
            d.added_by,
            d.created_at,
            usr.name AS added_by_name
        FROM dispatches d
        JOIN materials m ON d.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN users usr ON d.added_by = usr.id
        LEFT JOIN work_orders wo ON d.work_order_id = wo.id
        WHERE 1=1
    `;

    const params = [];

    if (filters.material_id && filters.material_id !== 'all' && filters.material_id !== '') {
        query += ` AND d.material_id = ?`;
        params.push(filters.material_id);
    }

    if (filters.start_date && filters.start_date !== '') {
        query += ` AND d.dispatch_date >= ?`;
        params.push(filters.start_date);
    }

    if (filters.end_date && filters.end_date !== '') {
        query += ` AND d.dispatch_date <= ?`;
        params.push(filters.end_date);
    }

    if (filters.search && filters.search.trim() !== '') {
        const searchTerm = `%${filters.search.trim()}%`;
        query += ` AND (d.dispatch_no LIKE ? OR d.internal_batch_number LIKE ? OR m.material_name LIKE ? OR d.party_name LIKE ? OR CAST(wo.work_order_no AS CHAR) LIKE ?)`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY d.dispatch_date DESC, d.id DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
};

const getDispatchById = async (id) => {
    const query = `
        SELECT
            d.*,
            wo.work_order_no,
            m.material_name,
            m.material_type,
            COALESCE(u.unit_name, 'Nos') AS unit,
            usr.name AS added_by_name
        FROM dispatches d
        JOIN materials m ON d.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN users usr ON d.added_by = usr.id
        LEFT JOIN work_orders wo ON d.work_order_id = wo.id
        WHERE d.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0] || null;
};

module.exports = {
    createDispatchTable,
    createDispatch,
    createWorkOrderDispatch,
    getWorkOrdersForDispatch,
    getAllDispatches,
    getDispatchById,
    getAvailableStockStatusBatches
};
