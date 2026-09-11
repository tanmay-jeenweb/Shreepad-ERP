const db = require('../config/db.js');
const {
    upsertStockStatusForFinishedGoods,
    rollbackStockStatusForFinishedGoods
} = require('./stockStatusModel.js');

const createWorkshopEntriesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS workshop_entries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            work_order_item_id INT NOT NULL UNIQUE,
            pmemo_id INT DEFAULT NULL,
            machine_id INT DEFAULT NULL,
            packing_method VARCHAR(255) DEFAULT NULL,
            status VARCHAR(50) DEFAULT 'Pending',
            remarks TEXT DEFAULT NULL,
            added_by INT NOT NULL,
            device_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_item_id) REFERENCES work_order_items(id) ON DELETE CASCADE,
            FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log('Workshop Entries table ready');
};

const createWorkshopRmIssuesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS workshop_rm_issues (
            id INT AUTO_INCREMENT PRIMARY KEY,
            work_order_item_id INT NOT NULL,
            workshop_entry_id INT DEFAULT NULL,
            lot DECIMAL(15,4) NOT NULL DEFAULT 1,
            date DATE NOT NULL,
            remark TEXT DEFAULT NULL,
            material_id INT NOT NULL,
            grade VARCHAR(100) DEFAULT '',
            internal_batch_number VARCHAR(100) NOT NULL,
            grn_item_id INT DEFAULT NULL,
            ma_item_id INT DEFAULT NULL,
            rm_return_id INT DEFAULT NULL,
            stock_issue_id INT DEFAULT NULL,
            qty DECIMAL(15,4) NOT NULL,
            total_quantity DECIMAL(15,4) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_item_id) REFERENCES work_order_items(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (ma_item_id) REFERENCES material_add_items(id) ON DELETE SET NULL,
            FOREIGN KEY (rm_return_id) REFERENCES rm_returns(id) ON DELETE SET NULL,
            FOREIGN KEY (stock_issue_id) REFERENCES stock_issues(id) ON DELETE SET NULL
        )
    `;
    await db.execute(query);
    console.log('Workshop RM Issues table ready');
};

const createWorkshopProductionLogsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS workshop_production_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            work_order_item_id INT NOT NULL,
            bom_process_id INT NOT NULL,
            process_id INT NOT NULL,
            step_order INT NOT NULL,
            to_bom_process_id INT DEFAULT NULL,
            quantity DECIMAL(15,4) NOT NULL,
            log_date DATE NOT NULL,
            remarks TEXT DEFAULT NULL,
            added_by INT NOT NULL,
            device_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_item_id) REFERENCES work_order_items(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log('Workshop Production Logs table ready');
};

const ensureWorkshopEntryColumns = async () => {
    try {
        // Ensure work_order_item_id column exists
        const [woiCol] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'workshop_entries' 
              AND COLUMN_NAME = 'work_order_item_id'
        `);

        if (woiCol.length === 0) {
            await db.execute(`ALTER TABLE workshop_entries ADD COLUMN work_order_item_id INT NOT NULL`);
            console.log('Added work_order_item_id column to workshop_entries');
        }

        // Make pmemo_id nullable if it was NOT NULL
        try {
            await db.execute(`ALTER TABLE workshop_entries MODIFY COLUMN pmemo_id INT NULL DEFAULT NULL`);
        } catch (e) {
            // ignore
        }

        // Ensure unique index on work_order_item_id
        const [indices] = await db.execute(`
            SELECT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'workshop_entries' 
              AND COLUMN_NAME = 'work_order_item_id'
        `);

        if (indices.length === 0) {
            try {
                await db.execute(`ALTER TABLE workshop_entries ADD UNIQUE KEY uq_we_wo_item (work_order_item_id)`);
                console.log('Added UNIQUE KEY uq_we_wo_item on workshop_entries(work_order_item_id)');
            } catch (e) {
                console.log('Index creation notice:', e.message);
            }
        }
    } catch (err) {
        console.error('Error ensuring workshop_entries columns:', err.message || err);
    }
};

const getAllWorkshopEntries = async () => {
    const query = `
        SELECT 
            woi.id AS work_order_item_id,
            woi.work_order_id,
            woi.batch_no,
            woi.quantity,
            woi.production_quantity,
            wo.work_order_no,
            wo.work_order_date,
            m.id AS material_id,
            m.material_name,
            m.material_code,
            bom.product_weight AS unit_weight,
            c.customer_name,
            COALESCE(issue_summary.issued_rm_count, 0) AS issued_rm_count
        FROM work_order_items woi
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN materials m ON woi.material_id = m.id
        LEFT JOIN customer_master c ON wo.customer_id = c.id
        LEFT JOIN bill_of_materials bom ON m.id = bom.material_id
        LEFT JOIN (
            SELECT work_order_item_id, COUNT(*) AS issued_rm_count
            FROM workshop_rm_issues
            GROUP BY work_order_item_id
        ) issue_summary ON woi.id = issue_summary.work_order_item_id
        WHERE COALESCE(woi.is_on_hold, 0) = 0 
          AND COALESCE(woi.production_quantity, 0) > 0
        ORDER BY wo.work_order_no DESC, woi.id DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getWorkshopEntryByWorkOrderItemId = async (workOrderItemId) => {
    const query = `
        SELECT 
            woi.id AS work_order_item_id,
            woi.work_order_id,
            woi.batch_no,
            woi.quantity,
            woi.production_quantity,
            woi.production_time_hours,
            wo.work_order_no,
            wo.work_order_date,
            m.id AS material_id,
            m.material_name,
            m.material_code,
            bom.id AS bom_id,
            bom.product_weight AS unit_weight,
            bom.unit_weight_tolerance,
            c.customer_name
        FROM work_order_items woi
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN materials m ON woi.material_id = m.id
        LEFT JOIN customer_master c ON wo.customer_id = c.id
        LEFT JOIN bill_of_materials bom ON m.id = bom.material_id
        WHERE woi.id = ?
        LIMIT 1
    `;
    const [rows] = await db.execute(query, [workOrderItemId]);
    if (rows.length === 0) return null;

    const entry = rows[0];

    // 1. Fetch BOM raw materials
    let rawMaterials = [];
    let processes = [];

    if (entry.material_id) {
        try {
            const [rmRows] = await db.execute(`
                SELECT 
                    bm.id,
                    bm.material_id,
                    m.material_name,
                    m.material_code,
                    bm.quantity AS bom_quantity,
                    COALESCE(u.unit_name, '') AS unit_name
                FROM bill_of_materials bom
                JOIN bom_materials bm ON bom.id = bm.bom_id
                JOIN materials m ON bm.material_id = m.id
                LEFT JOIN units u ON m.unit_id = u.id
                WHERE bom.material_id = ?
                ORDER BY m.material_name ASC
            `, [entry.material_id]);
            rawMaterials = rmRows;
        } catch (rmErr) {
            console.error("Error fetching BOM raw materials:", rmErr.message);
        }

        try {
            const [procRows] = await db.execute(`
                SELECT 
                    bp.id,
                    bp.process_id,
                    pm.process_name,
                    bp.time,
                    COALESCE(u.unit_name, '') AS unit_name
                FROM bill_of_materials bom
                JOIN bom_processes bp ON bom.id = bp.bom_id
                JOIN process_masters pm ON bp.process_id = pm.id
                LEFT JOIN units u ON bp.unit_id = u.id
                WHERE bom.material_id = ?
                ORDER BY bp.id ASC
            `, [entry.material_id]);
            processes = procRows;
        } catch (procErr) {
            console.error("Error fetching BOM processes:", procErr.message);
        }
    }

    entry.rawMaterials = rawMaterials;
    entry.processes = processes;

    // 2. Fetch RM Issues for this work order item
    let rmIssues = [];
    try {
        const [issueRows] = await db.execute(`
            SELECT 
                wri.id,
                wri.work_order_item_id,
                wri.lot,
                wri.date,
                wri.material_id,
                m.material_name AS rm_type_name,
                m.material_code,
                wri.internal_batch_number,
                wri.grn_item_id,
                wri.ma_item_id,
                wri.rm_return_id,
                wri.stock_issue_id,
                wri.qty,
                wri.total_quantity
            FROM workshop_rm_issues wri
            JOIN materials m ON wri.material_id = m.id
            WHERE wri.work_order_item_id = ?
            ORDER BY wri.lot ASC, wri.id ASC
        `, [workOrderItemId]);
        rmIssues = issueRows;
    } catch (issueErr) {
        console.error("Error fetching workshop RM issues:", issueErr.message);
    }
    entry.rmIssues = rmIssues;

    // 3. Fetch RM Returns for this work order item
    let rmReturns = [];
    try {
        const [returnRows] = await db.execute(`
            SELECT 
                r.id,
                r.return_no,
                r.return_date,
                r.material_id,
                r.material_name,
                r.location_id,
                r.location_name,
                r.quantity,
                r.internal_batch_number
            FROM rm_returns r
            WHERE r.work_order_item_id = ?
            ORDER BY r.id ASC
        `, [workOrderItemId]);
        rmReturns = returnRows;
    } catch (returnErr) {
        console.error("Error fetching RM returns:", returnErr.message);
    }
    entry.rmReturns = rmReturns;

    // 4. Fetch Production Movement Logs for this work order item
    let productionLogs = [];
    try {
        const [prodRows] = await db.execute(`
            SELECT 
                wpl.id,
                wpl.work_order_item_id,
                wpl.bom_process_id,
                wpl.process_id,
                from_pm.process_name AS from_process_name,
                wpl.step_order,
                wpl.to_bom_process_id,
                to_pm.process_name AS to_process_name,
                wpl.quantity,
                wpl.log_date,
                wpl.remarks,
                wpl.added_by,
                COALESCE(u.name, 'Unknown') AS added_by_name,
                wpl.created_at
            FROM workshop_production_logs wpl
            JOIN process_masters from_pm ON wpl.process_id = from_pm.id
            LEFT JOIN bom_processes to_bp ON wpl.to_bom_process_id = to_bp.id
            LEFT JOIN process_masters to_pm ON to_bp.process_id = to_pm.id
            LEFT JOIN users u ON wpl.added_by = u.id
            WHERE wpl.work_order_item_id = ?
            ORDER BY wpl.id DESC
        `, [workOrderItemId]);
        productionLogs = prodRows;
    } catch (prodErr) {
        console.error("Error fetching production logs:", prodErr.message);
    }
    entry.productionLogs = productionLogs;

    return entry;
};

const getAvailableBatches = async (materialId) => {
    const query = `
        SELECT 
            ss.internal_batch_number,
            NULL AS grn_item_id,
            mai.id AS ma_item_id,
            r.id AS rm_return_id,
            (COALESCE(r.quantity, ss.total_kg) - COALESCE(issue_ma_agg.issued_qty, issue_rtr_agg.issued_qty, 0)) AS available_qty
        FROM stock_status ss
        LEFT JOIN material_add_items mai ON ss.internal_batch_number = mai.internal_batch_number AND ss.ma_id IS NOT NULL
        LEFT JOIN rm_returns r ON ss.internal_batch_number = r.internal_batch_number AND ss.rm_return_id IS NOT NULL
        LEFT JOIN (
            SELECT ma_item_id, SUM(issue_quantity) AS issued_qty
            FROM stock_issues WHERE ma_item_id IS NOT NULL
            GROUP BY ma_item_id
        ) issue_ma_agg ON mai.id = issue_ma_agg.ma_item_id
        LEFT JOIN (
            SELECT rm_return_id, SUM(issue_quantity) AS issued_qty
            FROM stock_issues WHERE rm_return_id IS NOT NULL
            GROUP BY rm_return_id
        ) issue_rtr_agg ON r.id = issue_rtr_agg.rm_return_id
        WHERE ss.material_id = ?
        HAVING available_qty > 0
    `;
    const [rows] = await db.execute(query, [materialId]);
    return rows;
};

const issueWorkshopRawMaterials = async ({
    work_order_item_id,
    issues,
    date,
    added_by
}) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get Work Order Number
        const [woRows] = await connection.execute(`
            SELECT wo.work_order_no
            FROM work_order_items woi
            JOIN work_orders wo ON woi.work_order_id = wo.id
            WHERE woi.id = ?
        `, [work_order_item_id]);

        if (woRows.length === 0) {
            throw new Error('Work Order item not found');
        }

        const workOrderNo = woRows[0].work_order_no;
        const formattedRefNo = `WO-${String(workOrderNo).padStart(4, '0')}`;

        // 2. Determine next lot number
        const [lotRows] = await connection.execute(`
            SELECT MAX(lot) AS max_lot FROM workshop_rm_issues WHERE work_order_item_id = ?
        `, [work_order_item_id]);
        const nextLot = (Number(lotRows[0]?.max_lot) || 0) + 1;

        // 3. Process each issue
        const createdIssues = [];
        for (const item of issues) {
            const issueQty = Number(item.qty) || 0;
            if (issueQty <= 0) continue;

            // Deduct stock in stock_issues
            const insertStockIssueQuery = `
                INSERT INTO stock_issues (
                    ma_item_id, rm_return_id, issue_quantity, p_memo_number, issue_date, remarks, removal_type, added_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'issue', ?)
            `;
            const [stockIssueResult] = await connection.execute(insertStockIssueQuery, [
                item.ma_item_id || null,
                item.rm_return_id || null,
                issueQty,
                formattedRefNo,
                date || new Date().toISOString().split('T')[0],
                `Work Order #${workOrderNo} Chit #${nextLot}`,
                added_by || null
            ]);
            const stockIssueId = stockIssueResult.insertId;

            // Record in workshop_rm_issues
            const insertWorkshopRmQuery = `
                INSERT INTO workshop_rm_issues (
                    work_order_item_id, lot, date, remark, material_id, grade, internal_batch_number, grn_item_id, ma_item_id, rm_return_id, stock_issue_id, qty, total_quantity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [wriResult] = await connection.execute(insertWorkshopRmQuery, [
                work_order_item_id,
                nextLot,
                date || new Date().toISOString().split('T')[0],
                item.remark || null,
                Number(item.material_id),
                item.grade || '',
                item.internal_batch_number,
                null,
                item.ma_item_id || null,
                item.rm_return_id || null,
                stockIssueId,
                issueQty,
                issueQty
            ]);

            createdIssues.push({
                id: wriResult.insertId,
                lot: nextLot,
                stock_issue_id: stockIssueId
            });
        }

        // 4. Update or create workshop entry touch record
        await connection.execute(`
            INSERT INTO workshop_entries (
                work_order_item_id, added_by
            ) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                updated_at = CURRENT_TIMESTAMP
        `, [work_order_item_id, added_by || 1]);

        await connection.commit();
        return {
            lot: nextLot,
            count: createdIssues.length,
            ref_no: formattedRefNo
        };
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const addWorkshopProductionLog = async ({
    work_order_item_id,
    bom_process_id,
    quantity,
    log_date,
    remarks,
    added_by,
    device_id
}) => {
    const moveQty = Number(quantity);
    if (isNaN(moveQty) || moveQty <= 0) {
        throw new Error('Quantity must be greater than 0');
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get work order item details, material_id, batch_no & work order info
        const [woiRows] = await connection.execute(`
            SELECT woi.id, woi.work_order_id, woi.production_quantity, woi.quantity, woi.material_id, woi.batch_no,
                   m.material_name, m.material_type, wo.work_order_no, c.customer_name
            FROM work_order_items woi
            JOIN work_orders wo ON woi.work_order_id = wo.id
            JOIN materials m ON woi.material_id = m.id
            LEFT JOIN customer_master c ON wo.customer_id = c.id
            WHERE woi.id = ?
        `, [work_order_item_id]);

        if (woiRows.length === 0) {
            throw new Error('Work Order item not found');
        }

        const targetQty = Number(woiRows[0].production_quantity || woiRows[0].quantity) || 0;
        const materialId = woiRows[0].material_id;

        // 2. Get BOM processes in order
        const [procRows] = await connection.execute(`
            SELECT bp.id, bp.process_id, pm.process_name
            FROM bill_of_materials bom
            JOIN bom_processes bp ON bom.id = bp.bom_id
            JOIN process_masters pm ON bp.process_id = pm.id
            WHERE bom.material_id = ?
            ORDER BY bp.id ASC
        `, [materialId]);

        if (procRows.length === 0) {
            throw new Error('No BOM processes configured for this product');
        }

        const stageIndex = procRows.findIndex(p => Number(p.id) === Number(bom_process_id));
        if (stageIndex === -1) {
            throw new Error('Specified process stage does not belong to this product BOM');
        }

        const currentStage = procRows[stageIndex];
        const nextStage = stageIndex < procRows.length - 1 ? procRows[stageIndex + 1] : null;

        // 3. Get all existing production logs for this item
        const [existingLogs] = await connection.execute(`
            SELECT bom_process_id, step_order, quantity
            FROM workshop_production_logs
            WHERE work_order_item_id = ?
        `, [work_order_item_id]);

        // Calculate available qty for each stage
        let prevCompleted = targetQty;
        const stageStats = procRows.map((proc, idx) => {
            const completed = existingLogs
                .filter(l => Number(l.bom_process_id) === Number(proc.id))
                .reduce((sum, l) => sum + Number(l.quantity), 0);
            const input = idx === 0 ? targetQty : prevCompleted;
            const available = Math.max(0, input - completed);
            prevCompleted = completed;
            return {
                id: proc.id,
                input,
                completed,
                available
            };
        });

        const currentStat = stageStats[stageIndex];
        if (moveQty > currentStat.available) {
            throw new Error(`Cannot move ${moveQty} units. Only ${currentStat.available} units available in ${currentStage.process_name}.`);
        }

        // 4. Insert production log
        const insertQuery = `
            INSERT INTO workshop_production_logs (
                work_order_item_id,
                bom_process_id,
                process_id,
                step_order,
                to_bom_process_id,
                quantity,
                log_date,
                remarks,
                added_by,
                device_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [insertResult] = await connection.execute(insertQuery, [
            work_order_item_id,
            currentStage.id,
            currentStage.process_id,
            stageIndex + 1,
            nextStage ? nextStage.id : null,
            moveQty,
            log_date || new Date().toISOString().split('T')[0],
            remarks || null,
            added_by,
            device_id || null
        ]);

        // 5. Update touch record in workshop_entries
        await connection.execute(`
            INSERT INTO workshop_entries (work_order_item_id, added_by)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
        `, [work_order_item_id, added_by || 1]);

        // 6. If moving to Finished Goods (final process), update stock_status
        if (!nextStage) {
            const batchNo = woiRows[0].batch_no || `WO-${String(woiRows[0].work_order_no).padStart(4, '0')}`;
            await upsertStockStatusForFinishedGoods(connection, {
                work_order_item_id,
                material_id: materialId,
                material_name: woiRows[0].material_name,
                material_type: woiRows[0].material_type || 'Finished Goods',
                batch_no: batchNo,
                quantity: moveQty,
                customer_name: woiRows[0].customer_name || 'In-House Production'
            });
        }

        await connection.commit();

        return {
            id: insertResult.insertId,
            from_process_name: currentStage.process_name,
            to_process_name: nextStage ? nextStage.process_name : 'Finished Goods',
            quantity: moveQty
        };
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const deleteWorkshopProductionLog = async (logId) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [logRows] = await connection.execute(`
            SELECT * FROM workshop_production_logs WHERE id = ?
        `, [logId]);

        if (logRows.length === 0) {
            throw new Error('Production log not found');
        }

        const targetLog = logRows[0];
        const workOrderItemId = targetLog.work_order_item_id;

        // Get target quantity, material_id, batch_no
        const [woiRows] = await connection.execute(`
            SELECT woi.production_quantity, woi.quantity, woi.material_id, woi.batch_no, wo.work_order_no
            FROM work_order_items woi
            JOIN work_orders wo ON woi.work_order_id = wo.id
            WHERE woi.id = ?
        `, [workOrderItemId]);

        const targetQty = Number(woiRows[0]?.production_quantity || woiRows[0]?.quantity) || 0;
        const materialId = woiRows[0]?.material_id;
        const batchNo = woiRows[0]?.batch_no || (woiRows[0]?.work_order_no ? `WO-${String(woiRows[0].work_order_no).padStart(4, '0')}` : null);

        // Get BOM processes
        const [procRows] = await connection.execute(`
            SELECT bp.id, bp.process_id, pm.process_name
            FROM bill_of_materials bom
            JOIN bom_processes bp ON bom.id = bp.bom_id
            JOIN process_masters pm ON bp.process_id = pm.id
            WHERE bom.material_id = ?
            ORDER BY bp.id ASC
        `, [materialId]);

        // Get existing logs excluding the one being deleted
        const [remainingLogs] = await connection.execute(`
            SELECT bom_process_id, step_order, quantity
            FROM workshop_production_logs
            WHERE work_order_item_id = ? AND id != ?
        `, [workOrderItemId, logId]);

        // Check if any stage would have negative available inventory
        let prevCompleted = targetQty;
        for (let idx = 0; idx < procRows.length; idx++) {
            const proc = procRows[idx];
            const completed = remainingLogs
                .filter(l => Number(l.bom_process_id) === Number(proc.id))
                .reduce((sum, l) => sum + Number(l.quantity), 0);
            const input = idx === 0 ? targetQty : prevCompleted;
            const available = input - completed;
            if (available < 0) {
                throw new Error(
                    `Cannot delete this log: subsequent process '${proc.process_name}' has already processed items from this movement. Please reverse subsequent processes first.`
                );
            }
            prevCompleted = completed;
        }

        // If this log moved to Finished Goods, roll back stock_status
        if (!targetLog.to_bom_process_id && batchNo) {
            await rollbackStockStatusForFinishedGoods(connection, {
                batch_no: batchNo,
                quantity: targetLog.quantity
            });
        }

        // Delete the log
        await connection.execute(`DELETE FROM workshop_production_logs WHERE id = ?`, [logId]);

        await connection.commit();
        return { success: true };
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

module.exports = {
    createWorkshopEntriesTable,
    createWorkshopRmIssuesTable,
    createWorkshopProductionLogsTable,
    ensureWorkshopEntryColumns,
    getAllWorkshopEntries,
    getWorkshopEntryByWorkOrderItemId,
    getAvailableBatches,
    issueWorkshopRawMaterials,
    addWorkshopProductionLog,
    deleteWorkshopProductionLog
};
