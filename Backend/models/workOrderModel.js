const db = require('../config/db.js');

const dropForeignKeyIfExist = async (tableName, referencedTableName) => {
    try {
        const [rows] = await db.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = ? 
              AND REFERENCED_TABLE_NAME = ?
        `, [tableName, referencedTableName]);
        for (const r of rows) {
            try {
                await db.execute(`ALTER TABLE ${tableName} DROP FOREIGN KEY ${r.CONSTRAINT_NAME}`);
                console.log(`Dropped foreign key constraint ${r.CONSTRAINT_NAME} from ${tableName}`);
            } catch (fkErr) {
                console.error(`Error dropping foreign key ${r.CONSTRAINT_NAME}:`, fkErr.message || fkErr);
            }
        }
    } catch (err) {
        console.error(`Error inspecting foreign keys for ${tableName}:`, err.message || err);
    }
};

const createWorkOrdersTable = async () => {
    const headerQuery = `
        CREATE TABLE IF NOT EXISTS work_orders (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            work_order_no       INT NOT NULL UNIQUE,
            customer_id         INT NOT NULL,
            work_order_date     DATE NOT NULL,
            added_by            INT NOT NULL,
            device_id           VARCHAR(255) DEFAULT NULL,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_master(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    const itemsQuery = `
        CREATE TABLE IF NOT EXISTS work_order_items (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            work_order_id        INT NOT NULL,
            material_id          INT NOT NULL,
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
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL
        )
    `;

    // Perform database migration check for existing tables
    try {
        // Migration for work_orders: sales_order_id -> customer_id
        const [woCols] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'work_orders' 
              AND COLUMN_NAME = 'customer_id'
        `);
        if (woCols.length === 0) {
            console.log('Migrating work_orders schema to support direct customer link...');
            // 1. Drop foreign key constraint referencing sales_orders
            await dropForeignKeyIfExist('work_orders', 'sales_orders');
            // 2. Add customer_id column
            await db.execute('ALTER TABLE work_orders ADD COLUMN customer_id INT DEFAULT NULL');
            // 3. Populate customer_id by joining sales_orders (if tables exist and have data)
            try {
                await db.execute(`
                    UPDATE work_orders wo
                    JOIN sales_orders so ON wo.sales_order_id = so.id
                    SET wo.customer_id = so.customer_id
                `);
                console.log('Successfully copied customer_id from sales_orders');
            } catch (e) {
                console.warn('Could not copy customer data (maybe sales_orders table is already gone or empty):', e.message);
            }
            // 4. Fill defaults or clean null customer_id to make it NOT NULL
            await db.execute('UPDATE work_orders SET customer_id = 1 WHERE customer_id IS NULL');
            await db.execute('ALTER TABLE work_orders MODIFY COLUMN customer_id INT NOT NULL');
            // 5. Add foreign key to customer_master
            await db.execute('ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_customer FOREIGN KEY (customer_id) REFERENCES customer_master(id) ON DELETE CASCADE');
            // 6. Drop sales_order_id column
            try {
                await db.execute('ALTER TABLE work_orders DROP COLUMN sales_order_id');
                console.log('Dropped sales_order_id column from work_orders');
            } catch (e) {
                console.warn('Could not drop sales_order_id column:', e.message);
            }
        }

        // Migration for work_order_items: sales_order_item_id -> material_id
        const [woiCols] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'work_order_items' 
              AND COLUMN_NAME = 'material_id'
        `);
        if (woiCols.length === 0) {
            console.log('Migrating work_order_items schema to support direct material link...');
            // 1. Drop foreign key constraint referencing sales_order_items
            await dropForeignKeyIfExist('work_order_items', 'sales_order_items');
            // 2. Add material_id column
            await db.execute('ALTER TABLE work_order_items ADD COLUMN material_id INT DEFAULT NULL');
            // 3. Populate material_id by joining sales_order_items (if tables exist and have data)
            try {
                await db.execute(`
                    UPDATE work_order_items woi
                    JOIN sales_order_items soi ON woi.sales_order_item_id = soi.id
                    SET woi.material_id = soi.material_id
                `);
                console.log('Successfully copied material_id from sales_order_items');
            } catch (e) {
                console.warn('Could not copy material data (maybe sales_order_items table is already gone or empty):', e.message);
            }
            // 4. Fill defaults or clean null material_id to make it NOT NULL
            await db.execute('UPDATE work_order_items SET material_id = 1 WHERE material_id IS NULL');
            await db.execute('ALTER TABLE work_order_items MODIFY COLUMN material_id INT NOT NULL');
            // 5. Add foreign key to materials
            await db.execute('ALTER TABLE work_order_items ADD CONSTRAINT fk_work_order_items_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE');
            // 6. Drop sales_order_item_id column
            try {
                await db.execute('ALTER TABLE work_order_items DROP COLUMN sales_order_item_id');
                console.log('Dropped sales_order_item_id column from work_order_items');
            } catch (e) {
                console.warn('Could not drop sales_order_item_id column:', e.message);
            }
        }
    } catch (migrationErr) {
        console.error('Error during work_orders table schema migration:', migrationErr.message || migrationErr);
    }

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

const createWorkOrder = async (customerId, workOrderDate, addedBy, deviceId, itemsArray) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const workOrderNo = await getNextWorkOrderNo();

        const insertQuery = `
            INSERT INTO work_orders (work_order_no, customer_id, work_order_date, added_by, device_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [results] = await connection.execute(insertQuery, [
            workOrderNo,
            customerId,
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
                    work_order_id, material_id, quantity, production_quantity,
                    exp_delivery_date, batch_no, actual_delivery_date, remarks, machine_id, production_time_hours, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [itemResult] = await connection.execute(itemQuery, [
                workOrderId,
                item.material_id,
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



            // Deduct from stock if we are getting quantity from stock
            const stockDeductQty = Number(item.quantity) - Number(item.production_quantity || 0);
            if (stockDeductQty > 0) {
                const materialId = item.material_id;

                // Query available batches (FIFO)
                const queryBatches = `
                    SELECT 
                        NULL AS grn_item_id,
                        mai.id AS ma_item_id,
                        mai.internal_batch_number,
                        mai.quantity AS approved_qty,
                        COALESCE(issue_agg.issued_qty, 0) AS issued_qty,
                        ma.ma_date AS receipt_date,
                        mai.id AS item_id
                    FROM material_add_items mai
                    JOIN material_add_master ma ON mai.ma_id = ma.id
                    LEFT JOIN (
                        SELECT ma_item_id, SUM(issue_quantity) AS issued_qty
                        FROM stock_issues WHERE ma_item_id IS NOT NULL
                        GROUP BY ma_item_id
                    ) issue_agg ON mai.id = issue_agg.ma_item_id
                    WHERE mai.material_id = ?

                    UNION ALL

                    SELECT 
                        NULL AS grn_item_id,
                        NULL AS ma_item_id,
                        r.internal_batch_number,
                        r.quantity AS approved_qty,
                        COALESCE(issue_agg.issued_qty, 0) AS issued_qty,
                        r.return_date AS receipt_date,
                        r.id AS item_id
                    FROM rm_returns r
                    LEFT JOIN (
                        SELECT rm_return_id, SUM(issue_quantity) AS issued_qty
                        FROM stock_issues WHERE rm_return_id IS NOT NULL
                        GROUP BY rm_return_id
                    ) issue_agg ON r.id = issue_agg.rm_return_id
                    WHERE r.material_id = ?

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
            woi.material_id,
            m.material_name,
            m.material_code,
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
        FROM work_orders wo
        JOIN work_order_items woi ON woi.work_order_id = wo.id
        LEFT JOIN customer_master c ON wo.customer_id = c.id
        LEFT JOIN materials m ON woi.material_id = m.id
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
        WHERE 1 = 1 ${includeHeld ? '' : 'AND COALESCE(woi.is_on_hold, 0) = 0'}
        ORDER BY wo.work_order_no DESC, wo.created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getWorkOrderById = async (id) => {
    const query = `
        SELECT
            wo.*,
            c.customer_name,
            c.customer_code,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM work_orders wo
        LEFT JOIN customer_master c ON wo.customer_id = c.id
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
            mac.name AS machine_name
        FROM work_order_items woi
        LEFT JOIN materials m ON woi.material_id = m.id
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

        // 3. Delete work order (will cascade delete work_order_items)
        await connection.execute(`DELETE FROM work_orders WHERE id = ?`, [id]);

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
            SUM(COALESCE(r.quantity, ss.total_kg) - COALESCE(issue_agg.issued_qty, 0)) AS available_stock
        FROM stock_status ss
        LEFT JOIN rm_returns r ON ss.rm_return_id = r.id
        LEFT JOIN (
            SELECT 
                COALESCE(mai_sub2.internal_batch_number, r_sub.internal_batch_number) AS internal_batch_number,
                SUM(si.issue_quantity) AS issued_qty
            FROM stock_issues si
            LEFT JOIN material_add_items mai_sub2 ON si.ma_item_id = mai_sub2.id
            LEFT JOIN rm_returns r_sub ON si.rm_return_id = r_sub.id
            GROUP BY COALESCE(mai_sub2.internal_batch_number, r_sub.internal_batch_number)
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

        // 2. Process Deleted Items
        const incomingIds = itemsArray.filter(it => it.id).map(it => Number(it.id));
        const [existingItems] = await connection.execute(
            `SELECT id, machine_id, quantity, production_time_hours, sort_order FROM work_order_items WHERE work_order_id = ?`,
            [workOrderId]
        );
        const itemsToDelete = existingItems.filter(it => !incomingIds.includes(it.id));
        for (const it of itemsToDelete) {
            await connection.execute(`DELETE FROM work_order_items WHERE id = ?`, [it.id]);
        }

        // 3. Process Inserted Items (New items with no id)
        const itemsToInsert = itemsArray.filter(it => !it.id);
        for (const item of itemsToInsert) {
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
                    work_order_id, material_id, quantity, production_quantity,
                    exp_delivery_date, batch_no, actual_delivery_date, remarks, machine_id, production_time_hours, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [itemResult] = await connection.execute(itemQuery, [
                workOrderId,
                item.material_id,
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
            item.id = itemResult.insertId;
        }

        // 4. Process Updated Items
        const itemsToUpdate = itemsArray.filter(it => it.id);
        for (const item of itemsToUpdate) {
            const existingItem = existingItems.find(it => it.id === Number(item.id));
            if (!existingItem) {
                continue;
            }

            const oldMachineId = existingItem.machine_id;
            const newMachineId = item.machine_id ? Number(item.machine_id) : null;
            
            let sortOrder = existingItem.sort_order;

            // Handle machine changes
            if (newMachineId !== oldMachineId) {
                if (newMachineId) {
                    const [maxRows] = await connection.execute(
                        `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM work_order_items WHERE machine_id = ?`,
                        [newMachineId]
                    );
                    sortOrder = maxRows[0].next_order;
                } else {
                    sortOrder = null;
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
                Number(item.quantity),
                item.production_quantity ? Number(item.production_quantity) : 0,
                newMachineId,
                existingItem.production_time_hours,
                sortOrder,
                item.exp_delivery_date || null,
                item.batch_no || null,
                item.actual_delivery_date || null,
                item.remarks || null,
                item.id
            ]);
        }

        // 5. Clean planned dates for items
        for (const item of itemsArray) {
            await connection.execute(
                `UPDATE work_order_items 
                 SET planned_start_date = NULL, planned_end_date = NULL 
                 WHERE id = ?`,
                [item.id]
            );
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
