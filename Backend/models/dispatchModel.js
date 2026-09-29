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
            COALESCE(u.unit_name, 'Nos') AS unit,
            COALESCE(wob.batches, woi.batch_no, CONCAT('WO-', LPAD(wo.work_order_no, 4, '0'))) AS batch_no,
            COALESCE(woi.production_quantity, woi.quantity, 0) AS target_quantity,
            COALESCE(fg_agg.completed_quantity, 0) AS completed_quantity,
            COALESCE(dsp_agg.dispatched_quantity, 0) AS dispatched_quantity,
            GREATEST(0, COALESCE(fg_agg.completed_quantity, 0) - COALESCE(dsp_agg.dispatched_quantity, 0)) AS available_to_dispatch
        FROM work_order_items woi
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN materials m ON woi.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN customer_master c ON wo.customer_id = c.id
        LEFT JOIN (
            SELECT work_order_id, GROUP_CONCAT(batch_no ORDER BY id SEPARATOR ', ') AS batches
            FROM work_order_batches
            GROUP BY work_order_id
        ) wob ON wo.id = wob.work_order_id
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
          AND COALESCE(woi.production_quantity, 0) > 0
          AND (wo.status = 'Started' OR wo.status = 'Completed')
    `;

    if (tab === 'completed') {
        query += `
          AND (
            (COALESCE(dsp_agg.dispatched_quantity, 0) >= COALESCE(woi.production_quantity, woi.quantity, 0) AND COALESCE(woi.production_quantity, woi.quantity, 0) > 0)
            OR wo.status = 'Completed'
          )
        `;
    } else {
        // Ongoing: production / dispatch is pending
        query += `
          AND (
            COALESCE(dsp_agg.dispatched_quantity, 0) < COALESCE(woi.production_quantity, woi.quantity, 0)
            OR COALESCE(woi.production_quantity, woi.quantity, 0) = 0
          )
          AND wo.status = 'Started'
        `;
    }

    query += ` ORDER BY wo.work_order_no DESC, woi.id DESC`;

    const [rows] = await db.execute(query);
    if (rows.length === 0) return [];

    // Fetch batch-level finished quantities and dispatches
    const itemIds = rows.map(r => r.work_order_item_id);
    const placeholders = itemIds.map(() => '?').join(',');

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

    const batchMap = {};
    for (const b of batchRows) {
        if (!batchMap[b.work_order_item_id]) {
            batchMap[b.work_order_item_id] = [];
        }
        batchMap[b.work_order_item_id].push({
            batch_no: b.batch_no,
            completed_quantity: parseFloat(b.completed_qty),
            dispatched_quantity: parseFloat(b.dispatched_qty),
            available_quantity: parseFloat(b.available_qty)
        });
    }

    for (const row of rows) {
        const availableBatches = batchMap[row.work_order_item_id] || [];
        row.available_batches = availableBatches;
        if (availableBatches.length > 0) {
            row.batch_no = availableBatches.map(b => b.batch_no).join(', ');
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
        const qty = parseFloat(data.quantity);
        if (isNaN(qty) || qty <= 0) {
            throw new Error('Dispatch quantity must be greater than zero');
        }

        // 1. Lock and fetch Work Order Item details
        const [woiRows] = await connection.execute(`
            SELECT 
                woi.id AS work_order_item_id,
                woi.work_order_id,
                woi.material_id,
                woi.batch_no,
                COALESCE(woi.production_quantity, woi.quantity, 0) AS production_quantity,
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

        let selectedBatch = (data.internal_batch_number && data.internal_batch_number.trim()) || null;

        // 2. Compute completed and dispatched quantities (at batch level if batch specified)
        let fgQuery = `
            SELECT 
                COALESCE(NULLIF(TRIM(wpl.batch_no), ''), ?) AS effective_batch,
                COALESCE(SUM(
                    CASE 
                        WHEN wpl.movement_type = 'revert' THEN -wpl.quantity 
                        ELSE wpl.quantity 
                    END
                ), 0) AS completed_quantity
            FROM workshop_production_logs wpl
            WHERE wpl.work_order_item_id = ? AND wpl.to_bom_process_id IS NULL
        `;
        const defaultFallbackBatch = woItem.batch_no || `WO-${String(woItem.work_order_no).padStart(4, '0')}`;
        const fgParams = [defaultFallbackBatch, workOrderItemId];

        if (selectedBatch) {
            fgQuery += ` AND COALESCE(NULLIF(TRIM(wpl.batch_no), ''), ?) = ?`;
            fgParams.push(defaultFallbackBatch, selectedBatch);
        }
        fgQuery += ` GROUP BY effective_batch`;

        const [fgRows] = await connection.execute(fgQuery, fgParams);
        const completedQty = fgRows.reduce((sum, r) => sum + parseFloat(r.completed_quantity || 0), 0);

        let dspQuery = `
            SELECT COALESCE(SUM(d.quantity), 0) AS total_dispatched
            FROM dispatches d
            LEFT JOIN stock_status ss ON d.stock_status_id = ss.id
            WHERE (d.work_order_item_id = ? OR ss.work_order_item_id = ?)
        `;
        const dspParams = [workOrderItemId, workOrderItemId];
        if (selectedBatch) {
            dspQuery += ` AND (d.internal_batch_number = ? OR ss.internal_batch_number = ?)`;
            dspParams.push(selectedBatch, selectedBatch);
        }

        const [dspRows] = await connection.execute(dspQuery, dspParams);
        const alreadyDispatched = parseFloat(dspRows[0]?.total_dispatched || 0);
        const availableToDispatch = Math.max(0, completedQty - alreadyDispatched);

        if (availableToDispatch <= 0) {
            throw new Error(`No finished goods are currently available to dispatch for batch '${selectedBatch || "default"}'. Completed: ${completedQty}, Already Dispatched: ${alreadyDispatched}.`);
        }

        if (qty > availableToDispatch) {
            throw new Error(`Cannot dispatch ${qty} ${woItem.unit}. Only ${availableToDispatch} ${woItem.unit} completed finished goods are available in batch '${selectedBatch || "default"}'.`);
        }

        // 3. Find or update stock_status row for this work order item & batch
        let ssQuery = `
            SELECT id, remaining_kg, total_kg, internal_batch_number
            FROM stock_status
            WHERE work_order_item_id = ?
        `;
        const ssParams = [workOrderItemId];
        if (selectedBatch) {
            ssQuery += ` AND internal_batch_number = ?`;
            ssParams.push(selectedBatch);
        }
        ssQuery += ` ORDER BY id DESC LIMIT 1 FOR UPDATE`;

        const [ssRows] = await connection.execute(ssQuery, ssParams);

        let stockStatusId = null;
        let batchNumber = selectedBatch || defaultFallbackBatch;

        if (ssRows.length > 0) {
            stockStatusId = ssRows[0].id;
            batchNumber = ssRows[0].internal_batch_number || batchNumber;

            // Deduct remaining_kg
            const curRem = parseFloat(ssRows[0].remaining_kg) || 0;
            const newRem = Math.max(0, curRem - qty);
            await connection.execute(`
                UPDATE stock_status 
                SET remaining_kg = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [newRem, stockStatusId]);
        } else {
            // Create stock_status record if none existed
            const [insertSs] = await connection.execute(`
                INSERT INTO stock_status 
                    (internal_batch_number, party, material_id, material_name, material_type, total_kg, remaining_kg, work_order_item_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                batchNumber,
                woItem.customer_name || 'In-House Production',
                woItem.material_id,
                woItem.material_name,
                woItem.material_type || 'Finished Goods',
                completedQty,
                Math.max(0, completedQty - (alreadyDispatched + qty)),
                workOrderItemId
            ]);
            stockStatusId = insertSs.insertId;
        }

        // 4. Generate dispatch_no
        const dispatchNo = data.dispatch_no && data.dispatch_no.trim()
            ? data.dispatch_no.trim()
            : await generateDispatchNo(connection);

        const dispatchDate = data.dispatch_date || new Date().toISOString().split('T')[0];
        const partyName = data.party_name || woItem.customer_name || null;

        // 5. Insert into dispatches
        const insertDispatchQuery = `
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
        `;

        const [insertRes] = await connection.execute(insertDispatchQuery, [
            dispatchNo,
            dispatchDate,
            stockStatusId,
            woItem.material_id,
            batchNumber,
            qty,
            partyName,
            data.vehicle_no || null,
            data.remarks || null,
            woItem.work_order_id,
            workOrderItemId,
            addedBy
        ]);

        // 6. Check if all items in this work order are now fully dispatched
        const targetQty = parseFloat(woItem.production_quantity) || 0;
        const [totalDispRows] = await connection.execute(`
            SELECT COALESCE(SUM(quantity), 0) AS total_disp
            FROM dispatches
            WHERE work_order_item_id = ?
        `, [workOrderItemId]);
        const newTotalDispatched = parseFloat(totalDispRows[0]?.total_disp || 0);

        if (targetQty > 0 && newTotalDispatched >= targetQty) {
            const [otherItems] = await connection.execute(`
                SELECT woi.id, COALESCE(woi.production_quantity, woi.quantity, 0) AS target_qty,
                       COALESCE(d_sub.total_disp, 0) AS total_disp
                FROM work_order_items woi
                LEFT JOIN (
                    SELECT work_order_item_id, SUM(quantity) AS total_disp
                    FROM dispatches
                    WHERE work_order_item_id IS NOT NULL
                    GROUP BY work_order_item_id
                ) d_sub ON woi.id = d_sub.work_order_item_id
                WHERE woi.work_order_id = ? AND woi.id != ? AND COALESCE(woi.production_quantity, 0) > 0
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
            id: insertRes.insertId,
            dispatch_no: dispatchNo,
            dispatch_date: dispatchDate,
            stock_status_id: stockStatusId,
            work_order_id: woItem.work_order_id,
            work_order_no: woItem.work_order_no,
            work_order_item_id: workOrderItemId,
            material_id: woItem.material_id,
            material_name: woItem.material_name,
            internal_batch_number: batchNumber,
            quantity: qty,
            unit: woItem.unit,
            party_name: partyName,
            completed_quantity: completedQty,
            dispatched_quantity: newTotalDispatched,
            available_after_dispatch: availableToDispatch - qty
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
