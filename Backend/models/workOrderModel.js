const db = require('../config/db.js');
const { bookMachineTime, deleteScheduleByWorkOrderItemId } = require('./machineScheduleModel.js');

const createWorkOrdersTable = async () => {
    const headerQuery = `
        CREATE TABLE IF NOT EXISTS work_orders (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            work_order_no       INT NOT NULL UNIQUE,
            sales_order_id      INT NOT NULL,
            work_order_date     DATE NOT NULL,
            added_by            INT NOT NULL,
            device_id           VARCHAR(255) DEFAULT NULL,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    const itemsQuery = `
        CREATE TABLE IF NOT EXISTS work_order_items (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            work_order_id        INT NOT NULL,
            sales_order_item_id  INT NOT NULL,
            quantity             DECIMAL(15,3) NOT NULL,
            production_quantity  DECIMAL(15,3) NOT NULL,
            exp_delivery_date    DATE DEFAULT NULL,
            batch_no             VARCHAR(100) DEFAULT NULL,
            actual_delivery_date DATE DEFAULT NULL,
            remarks              TEXT DEFAULT NULL,
            machine_id           INT DEFAULT NULL,
            created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (sales_order_item_id) REFERENCES sales_order_items(id) ON DELETE CASCADE,
            FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL
        )
    `;

    await db.execute(headerQuery);
    await db.execute(itemsQuery);
    console.log('Work Order tables ready');
};

const ensureWorkOrderColumns = async () => {
    try {
        const [rows] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_items' AND COLUMN_NAME = 'production_time_hours'");
        if (rows.length === 0) {
            await db.execute("ALTER TABLE work_order_items ADD COLUMN production_time_hours DECIMAL(10,3) DEFAULT NULL");
            console.log('Added column production_time_hours to work_order_items');
        }
        // job_party_id column check removed
    } catch (err) {
        console.error('Error ensuring work order columns:', err.message || err);
    }
};

const ensureSortOrderColumn = async () => {
    try {
        const [rows] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_items' AND COLUMN_NAME = 'sort_order'");
        if (rows.length === 0) {
            await db.execute("ALTER TABLE work_order_items ADD COLUMN sort_order INT DEFAULT NULL");
            console.log('Added column sort_order to work_order_items');
            await db.execute("UPDATE work_order_items SET sort_order = id WHERE sort_order IS NULL");
            console.log('Initialized sort_order with id in work_order_items');
        }
    } catch (err) {
        console.error('Error ensuring sort_order column:', err.message || err);
    }
};

const ensureIsOnHoldColumn = async () => {
    try {
        const [rows] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_items' AND COLUMN_NAME = 'is_on_hold'");
        if (rows.length === 0) {
            await db.execute("ALTER TABLE work_order_items ADD COLUMN is_on_hold TINYINT(1) DEFAULT 0");
            console.log('Added column is_on_hold to work_order_items');
        }
    } catch (err) {
        console.error('Error ensuring is_on_hold column:', err.message || err);
    }
};

const ensurePlannedDateColumns = async () => {
    try {
        const [rowsStart] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_items' AND COLUMN_NAME = 'planned_start_date'");
        if (rowsStart.length === 0) {
            await db.execute("ALTER TABLE work_order_items ADD COLUMN planned_start_date DATE DEFAULT NULL");
            console.log('Added column planned_start_date to work_order_items');
        }
        const [rowsEnd] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_items' AND COLUMN_NAME = 'planned_end_date'");
        if (rowsEnd.length === 0) {
            await db.execute("ALTER TABLE work_order_items ADD COLUMN planned_end_date DATE DEFAULT NULL");
            console.log('Added column planned_end_date to work_order_items');
        }
    } catch (err) {
        console.error('Error ensuring planned date columns:', err.message || err);
    }
};

const getNextWorkOrderNo = async () => {
    const [rows] = await db.execute(
        `SELECT MAX(work_order_no) AS maxNo FROM work_orders`
    );
    const maxNo = rows[0]?.maxNo;
    return maxNo ? maxNo + 1 : 1;
};

const createWorkOrder = async (salesOrderId, workOrderDate, addedBy, deviceId, itemsArray) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const workOrderNo = await getNextWorkOrderNo();

        const insertQuery = `
            INSERT INTO work_orders (work_order_no, sales_order_id, work_order_date, added_by, device_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [results] = await connection.execute(insertQuery, [
            workOrderNo,
            salesOrderId,
            workOrderDate,
            addedBy,
            deviceId || null
        ]);

        const workOrderId = results.insertId;

        for (const item of itemsArray) {
            let productionTimeHours = null;

            let sortOrder = null;
            if (item.machine_id) {
                const [maxRows] = await connection.execute(
                    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM work_order_items WHERE machine_id = ?`,
                    [item.machine_id]
                );
                sortOrder = maxRows[0].next_order;
            }

            const itemQuery = `
                INSERT INTO work_order_items (
                    work_order_id, sales_order_item_id, quantity, production_quantity,
                    exp_delivery_date, batch_no, actual_delivery_date, remarks, machine_id, production_time_hours, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [itemResult] = await connection.execute(itemQuery, [
                workOrderId,
                item.sales_order_item_id,
                item.quantity,
                item.production_quantity || 0,
                item.exp_delivery_date || null,
                item.batch_no || null,
                item.actual_delivery_date || null,
                item.remarks || null,
                item.machine_id || null,
                productionTimeHours,
                sortOrder
            ]);

            const workOrderItemId = itemResult.insertId;

            if (item.machine_id && productionTimeHours && productionTimeHours > 0) {
                 await bookMachineTime(item.machine_id, workOrderItemId, productionTimeHours, connection);

                 // Fetch the computed planned_start and planned_end dates and save them
                 const [datesResult] = await connection.execute(
                     `SELECT MIN(schedule_date) AS planned_start, MAX(schedule_date) AS planned_end 
                      FROM machine_schedule 
                      WHERE work_order_item_id = ?`,
                     [workOrderItemId]
                 );
                 if (datesResult.length > 0 && datesResult[0].planned_start) {
                     await connection.execute(
                         `UPDATE work_order_items 
                          SET planned_start_date = ?, planned_end_date = ? 
                          WHERE id = ?`,
                         [datesResult[0].planned_start, datesResult[0].planned_end, workOrderItemId]
                     );
                 }
            }

            // Deduct from stock if we are getting quantity from stock
            const stockDeductQty = Number(item.quantity) - Number(item.production_quantity || 0);
            if (stockDeductQty > 0) {
                // Get material_id
                const [soiRows] = await connection.execute(
                    `SELECT material_id FROM sales_order_items WHERE id = ?`,
                    [item.sales_order_item_id]
                );
                if (soiRows.length > 0) {
                    const materialId = soiRows[0].material_id;

                    // Query approved batches (FIFO)
                    const queryBatches = `
                        SELECT 
                            gi.id AS grn_item_id,
                            NULL AS ma_item_id,
                            gi.internal_batch_number,
                            COALESCE(qc_agg.approved_qty, 0) AS approved_qty,
                            COALESCE(issue_agg.issued_qty, 0) AS issued_qty,
                            g.grn_date AS receipt_date,
                            gi.id AS item_id
                        FROM grn_items gi
                        JOIN grn_master g ON gi.grn_id = g.id
                        JOIN (
                            SELECT grn_item_id, SUM(approved_quantity) AS approved_qty
                            FROM qc_items WHERE grn_item_id IS NOT NULL
                            GROUP BY grn_item_id
                        ) qc_agg ON gi.id = qc_agg.grn_item_id
                        LEFT JOIN (
                            SELECT grn_item_id, SUM(issue_quantity) AS issued_qty
                            FROM stock_issues WHERE grn_item_id IS NOT NULL
                            GROUP BY grn_item_id
                        ) issue_agg ON gi.id = issue_agg.grn_item_id
                        WHERE gi.material_id = ?

                        UNION ALL

                        SELECT 
                            NULL AS grn_item_id,
                            mai.id AS ma_item_id,
                            mai.internal_batch_number,
                            COALESCE(qc_agg.approved_qty, 0) AS approved_qty,
                            COALESCE(issue_agg.issued_qty, 0) AS issued_qty,
                            ma.ma_date AS receipt_date,
                            mai.id AS item_id
                        FROM material_add_items mai
                        JOIN material_add_master ma ON mai.ma_id = ma.id
                        JOIN (
                            SELECT ma_item_id, SUM(approved_quantity) AS approved_qty
                            FROM qc_items WHERE ma_item_id IS NOT NULL
                            GROUP BY ma_item_id
                        ) qc_agg ON mai.id = qc_agg.ma_item_id
                        LEFT JOIN (
                            SELECT ma_item_id, SUM(issue_quantity) AS issued_qty
                            FROM stock_issues WHERE ma_item_id IS NOT NULL
                            GROUP BY ma_item_id
                        ) issue_agg ON mai.id = issue_agg.ma_item_id
                        WHERE mai.material_id = ?

                        ORDER BY receipt_date ASC, item_id ASC
                    `;

                    const [batches] = await connection.execute(queryBatches, [materialId, materialId]);

                    let remainingToIssue = stockDeductQty;
                    const insertIssueQuery = `
                        INSERT INTO stock_issues (grn_item_id, ma_item_id, issue_quantity, removal_type, issue_date, remarks, added_by)
                        VALUES (?, ?, ?, 'issue', ?, ?, ?)
                    `;

                    const remarksStr = `Issued for Work Order WO-${String(workOrderNo).padStart(4, '0')}`;

                    for (const batch of batches) {
                        if (remainingToIssue <= 0) break;

                        const approved = Number(batch.approved_qty);
                        const issued = Number(batch.issued_qty);
                        const available = approved - issued;

                        if (available > 0) {
                            const deductQty = Math.min(remainingToIssue, available);
                            await connection.execute(insertIssueQuery, [
                                batch.grn_item_id || null,
                                batch.ma_item_id || null,
                                deductQty,
                                workOrderDate,
                                remarksStr,
                                addedBy
                            ]);
                            remainingToIssue -= deductQty;
                        }
                    }

                    if (remainingToIssue > 0) {
                        throw new Error(`Insufficient stock. Need to issue ${stockDeductQty} units, but only ${stockDeductQty - remainingToIssue} units are available.`);
                    }
                }
            }
        }
        // --- DISABLED FOR NOW (Under Planning) ---
        // Deduct from stock if we are getting quantity from stock
        // const stockDeductQty = Number(item.quantity) - Number(item.production_quantity || 0);
        // if (stockDeductQty > 0) {
        //     // Get material_id
        //     const [soiRows] = await connection.execute(
        //         `SELECT material_id FROM sales_order_items WHERE id = ?`,
        //         [item.sales_order_item_id]
        //     );
        //     if (soiRows.length > 0) {
        //         const materialId = soiRows[0].material_id;
        // 
        //         // Query approved batches (FIFO)
        //         const queryBatches = `... (query omitted for brevity) ...`;
        //         // ... (stock issue logic omitted) ...
        //     }
        // }
        // -----------------------------------------

        await connection.commit();
        return { workOrderId, workOrderNo };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getAllWorkOrders = async (includeHeld = false) => {
    const query = `
        SELECT
            soi.id AS sales_order_item_id,
            soi.material_id,
            soi.quantity AS so_quantity,
            m.material_name,
            m.material_code,
            so.sales_order_id AS sales_order_code,
            so.id AS sales_order_id,
            c.customer_name,
            c.customer_code,
            woi.id AS work_order_item_id,
            woi.sort_order,
            woi.is_on_hold,
            woi.quantity AS wo_quantity,
            woi.production_quantity,
            woi.exp_delivery_date,
            woi.batch_no,
            woi.actual_delivery_date,
            woi.remarks,
            woi.machine_id,
            woi.production_time_hours,
            woi.planned_start_date,
            woi.planned_end_date,
            woi.delay_hours,
            woi.delay_reason,
            woi.priority_no,
            wo.id AS work_order_id,
            wo.work_order_no,
            wo.work_order_date,
            mac.name AS machine_name,
            mac.machine_number,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            bom.product_weight,
            sched.running_start_date,
            sched.running_end_date,
            pm.p_memo_no AS p_memo_no,
            pm.date AS p_memo_date
        FROM sales_order_items soi
        JOIN sales_orders so ON soi.sales_order_id = so.id
        LEFT JOIN customer_master c ON so.customer_id = c.id
        LEFT JOIN materials m ON soi.material_id = m.id
        LEFT JOIN work_order_items woi ON woi.sales_order_item_id = soi.id
        LEFT JOIN work_orders wo ON woi.work_order_id = wo.id
        LEFT JOIN machines mac ON woi.machine_id = mac.id
        LEFT JOIN users u ON wo.added_by = u.id
        LEFT JOIN bill_of_materials bom ON m.id = bom.material_id
        LEFT JOIN production_memos pm ON woi.id = pm.work_order_item_id
        LEFT JOIN (
            SELECT 
                work_order_item_id,
                MIN(schedule_date) AS running_start_date,
                MAX(schedule_date) AS running_end_date
            FROM machine_schedule
            GROUP BY work_order_item_id
        ) sched ON woi.id = sched.work_order_item_id
        WHERE so.status = 'approved' ${includeHeld ? '' : 'AND COALESCE(woi.is_on_hold, 0) = 0'}
        ORDER BY wo.work_order_no DESC, so.created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getWorkOrderById = async (id) => {
    const query = `
        SELECT
            wo.*,
            so.sales_order_id AS sales_order_code,
            c.customer_name,
            c.customer_code,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM work_orders wo
        LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
        LEFT JOIN customer_master c ON so.customer_id = c.id
        LEFT JOIN users u ON wo.added_by = u.id
        WHERE wo.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    if (rows.length === 0) return null;
    const workOrder = rows[0];

    const itemsQuery = `
        SELECT 
            woi.*,
            m.material_name,
            m.material_code,
            mac.name AS machine_name,
            soi.quantity AS original_so_quantity
        FROM work_order_items woi
        LEFT JOIN sales_order_items soi ON woi.sales_order_item_id = soi.id
        LEFT JOIN materials m ON soi.material_id = m.id
        LEFT JOIN machines mac ON woi.machine_id = mac.id
        WHERE woi.work_order_id = ?
    `;
    const [items] = await db.execute(itemsQuery, [id]);
    workOrder.items = items;
    return workOrder;
};

const deleteWorkOrder = async (id) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Fetch work order to get work_order_no
        const [woRows] = await connection.execute(
            `SELECT work_order_no FROM work_orders WHERE id = ?`,
            [id]
        );
        if (woRows.length > 0) {
            const workOrderNo = woRows[0].work_order_no;
            // const remarksStr = `Issued for Work Order WO-${String(workOrderNo).padStart(4, '0')}`;
            
            // // 2. Delete corresponding stock issues (DISABLED FOR NOW)
            // await connection.execute(
            //     `DELETE FROM stock_issues WHERE remarks = ?`,
            //     [remarksStr]
            // );
        }

        // 3. Delete schedules (within the same transaction to avoid lock contention)
        const [itemsRows] = await connection.execute(`SELECT id, machine_id FROM work_order_items WHERE work_order_id = ?`, [id]);
        const machinesToReschedule = new Set();
        for (const it of itemsRows) {
            if (it.machine_id) {
                machinesToReschedule.add(it.machine_id);
            }
            await connection.execute(`DELETE FROM machine_schedule WHERE work_order_item_id = ?`, [it.id]);
        }

        // 4. Delete work order (will cascade delete work_order_items)
        await connection.execute(`DELETE FROM work_orders WHERE id = ?`, [id]);

        // 5. Reschedule affected machines
        const { rescheduleMachine } = require('./machineScheduleModel.js');
        const { getSettings } = require('./settingMasterModel.js');
        const settings = await getSettings();
        const waitHour = settings ? parseInt(settings.wait_hour || 0, 10) : 0;
        
        for (const machineId of machinesToReschedule) {
            await rescheduleMachine(machineId, connection, waitHour);
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getMaterialStock = async (materialId) => {
    const query = `
        SELECT 
            SUM(COALESCE(qc_agg.approved_qty, ss.total_kg) - COALESCE(issue_agg.issued_qty, 0)) AS available_stock
        FROM stock_status ss
        LEFT JOIN (
            SELECT 
                COALESCE(gi_sub.internal_batch_number, mai_sub.internal_batch_number) AS internal_batch_number,
                SUM(qi.approved_quantity) AS approved_qty
            FROM qc_items qi
            LEFT JOIN grn_items gi_sub ON qi.grn_item_id = gi_sub.id
            LEFT JOIN material_add_items mai_sub ON qi.ma_item_id = mai_sub.id
            GROUP BY COALESCE(gi_sub.internal_batch_number, mai_sub.internal_batch_number)
        ) qc_agg ON ss.internal_batch_number = qc_agg.internal_batch_number
        LEFT JOIN (
            SELECT 
                COALESCE(gi_sub2.internal_batch_number, mai_sub2.internal_batch_number, r_sub.internal_batch_number) AS internal_batch_number,
                SUM(si.issue_quantity) AS issued_qty
            FROM stock_issues si
            LEFT JOIN grn_items gi_sub2 ON si.grn_item_id = gi_sub2.id
            LEFT JOIN material_add_items mai_sub2 ON si.ma_item_id = mai_sub2.id
            LEFT JOIN rm_returns r_sub ON si.rm_return_id = r_sub.id
            GROUP BY COALESCE(gi_sub2.internal_batch_number, mai_sub2.internal_batch_number, r_sub.internal_batch_number)
        ) issue_agg ON ss.internal_batch_number = issue_agg.internal_batch_number
        WHERE ss.material_id = ?
    `;
    const [rows] = await db.execute(query, [materialId]);
    return rows[0]?.available_stock ? parseFloat(rows[0].available_stock) : 0;
};

const ensureDelayColumns = async () => {
    try {
        const [rowsHours] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_items' AND COLUMN_NAME = 'delay_hours'");
        if (rowsHours.length === 0) {
            await db.execute("ALTER TABLE work_order_items ADD COLUMN delay_hours DECIMAL(10,2) DEFAULT 0.00");
            console.log('Added column delay_hours to work_order_items');
        }
        const [rowsReason] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_items' AND COLUMN_NAME = 'delay_reason'");
        if (rowsReason.length === 0) {
            await db.execute("ALTER TABLE work_order_items ADD COLUMN delay_reason TEXT DEFAULT NULL");
            console.log('Added column delay_reason to work_order_items');
        }
    } catch (err) {
        console.error('Error ensuring delay columns:', err.message || err);
    }
};

const updateWorkOrderItemDelay = async (id, delayHours, delayReason) => {
    const query = `
        UPDATE work_order_items
        SET delay_hours = ?, delay_reason = ?
        WHERE id = ?
    `;
    const [results] = await db.execute(query, [delayHours, delayReason, id]);
    return results;
};

const ensurePriorityColumn = async () => {
    try {
        const [rows] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_items' AND COLUMN_NAME = 'priority_no'");
        if (rows.length === 0) {
            await db.execute("ALTER TABLE work_order_items ADD COLUMN priority_no INT DEFAULT NULL");
            console.log('Added column priority_no to work_order_items');
        }
    } catch (err) {
        console.error('Error ensuring priority column:', err.message || err);
    }
};

const updateWorkOrder = async (workOrderId, workOrderDate, itemsArray) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update the work order date
        const updateHeaderQuery = `
            UPDATE work_orders
            SET work_order_date = ?
            WHERE id = ?
        `;
        await connection.execute(updateHeaderQuery, [workOrderDate, workOrderId]);

        // 2. Fetch existing items for tracking before any updates
        const [existingItems] = await connection.execute(
            `SELECT id, machine_id, quantity, production_time_hours, sort_order FROM work_order_items WHERE work_order_id = ?`,
            [workOrderId]
        );

        const machinesToReschedule = new Set();

        // 3. Process each item update
        for (const item of itemsArray) {
            const existingItem = existingItems.find(it => it.id === Number(item.id));
            if (!existingItem) {
                continue;
            }

            const oldMachineId = existingItem.machine_id;
            const newMachineId = item.machine_id ? Number(item.machine_id) : null;
            const oldQty = Number(existingItem.quantity);
            const newQty = Number(item.quantity);
            // Compute production time hours
            let productionTimeHours = existingItem.production_time_hours;
            if (newQty !== oldQty) {
                productionTimeHours = null;
            }

            let sortOrder = existingItem.sort_order;

            // Handle machine changes
            if (newMachineId !== oldMachineId) {
                // Machine changed! Delete old schedule entries
                await connection.execute(
                    `DELETE FROM machine_schedule WHERE work_order_item_id = ?`,
                    [item.id]
                );

                if (oldMachineId) {
                    machinesToReschedule.add(oldMachineId);
                }

                if (newMachineId) {
                    const [maxRows] = await connection.execute(
                        `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM work_order_items WHERE machine_id = ?`,
                        [newMachineId]
                    );
                    sortOrder = maxRows[0].next_order;
                    machinesToReschedule.add(newMachineId);
                } else {
                    sortOrder = null;
                }
            } else if (newMachineId) {
                // Machine is same, but if production_time_hours changed, delete schedule for re-booking
                const hoursDiff = Math.abs((productionTimeHours || 0) - (existingItem.production_time_hours || 0));
                if (hoursDiff > 0.001) {
                    await connection.execute(
                        `DELETE FROM machine_schedule WHERE work_order_item_id = ?`,
                        [item.id]
                    );
                    machinesToReschedule.add(newMachineId);
                }
            }

            const updateItemQuery = `
                UPDATE work_order_items
                SET quantity = ?,
                    production_quantity = ?,
                    machine_id = ?,
                    production_time_hours = ?,
                    sort_order = ?,
                    exp_delivery_date = ?,
                    batch_no = ?,
                    actual_delivery_date = ?,
                    remarks = ?
                WHERE id = ?
            `;

            await connection.execute(updateItemQuery, [
                newQty,
                item.production_quantity ? Number(item.production_quantity) : 0,
                newMachineId,
                productionTimeHours,
                sortOrder,
                item.exp_delivery_date || null,
                item.batch_no || null,
                item.actual_delivery_date || null,
                item.remarks || null,
                item.id
            ]);
        }

        // 4. Reschedule all affected machines
        const { rescheduleMachine } = require('./machineScheduleModel.js');
        const { getSettings } = require('./settingMasterModel.js');
        const settings = await getSettings();
        const waitHour = settings ? parseInt(settings.wait_hour || 0, 10) : 0;

        for (const mId of machinesToReschedule) {
            await rescheduleMachine(mId, connection, waitHour);
        }

        // 5. Update planned start/end dates for items that were updated
        for (const item of itemsArray) {
            const newMachineId = item.machine_id ? Number(item.machine_id) : null;
            if (newMachineId) {
                const [datesResult] = await connection.execute(
                    `SELECT MIN(schedule_date) AS planned_start, MAX(schedule_date) AS planned_end 
                     FROM machine_schedule 
                     WHERE work_order_item_id = ?`,
                    [item.id]
                );
                if (datesResult.length > 0 && datesResult[0].planned_start) {
                    await connection.execute(
                        `UPDATE work_order_items 
                         SET planned_start_date = ?, planned_end_date = ? 
                         WHERE id = ?`,
                        [datesResult[0].planned_start, datesResult[0].planned_end, item.id]
                    );
                } else {
                    await connection.execute(
                        `UPDATE work_order_items 
                         SET planned_start_date = NULL, planned_end_date = NULL 
                         WHERE id = ?`,
                        [item.id]
                    );
                }
            } else {
                await connection.execute(
                    `UPDATE work_order_items 
                     SET planned_start_date = NULL, planned_end_date = NULL 
                     WHERE id = ?`,
                    [item.id]
                );
            }
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const updateWorkOrderItemPriority = async (id, priorityNo) => {
    const query = `
        UPDATE work_order_items
        SET priority_no = ?
        WHERE id = ?
    `;
    const [results] = await db.execute(query, [priorityNo, id]);
    return results;
};

const updateWorkOrderItemRemarks = async (id, remarks) => {
    const query = `
        UPDATE work_order_items
        SET remarks = ?
        WHERE id = ?
    `;
    const [results] = await db.execute(query, [remarks, id]);
    return results;
};

module.exports = {
    createWorkOrdersTable,
    ensureWorkOrderColumns,
    ensureSortOrderColumn,
    ensureIsOnHoldColumn,
    ensurePlannedDateColumns,
    ensureDelayColumns,
    ensurePriorityColumn,
    getNextWorkOrderNo,
    createWorkOrder,
    getAllWorkOrders,
    getWorkOrderById,
    deleteWorkOrder,
    getMaterialStock,
    updateWorkOrderItemDelay,
    updateWorkOrderItemPriority,
    updateWorkOrderItemRemarks,
    updateWorkOrder
};
