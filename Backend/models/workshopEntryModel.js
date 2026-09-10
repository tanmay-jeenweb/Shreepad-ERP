const db = require('../config/db.js');

const createWorkshopEntriesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS workshop_entries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pmemo_id INT NOT NULL UNIQUE,
            work_order_item_id INT NOT NULL,
            machine_id INT DEFAULT NULL,
            packing_method VARCHAR(255) DEFAULT NULL,
            status VARCHAR(50) DEFAULT 'Pending',
            remarks TEXT DEFAULT NULL,
            added_by INT NOT NULL,
            device_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (pmemo_id) REFERENCES production_memos(id) ON DELETE CASCADE,
            FOREIGN KEY (work_order_item_id) REFERENCES work_order_items(id) ON DELETE CASCADE,
            FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log('Workshop Entries table ready');
};

const getAllWorkshopEntries = async () => {
    const query = `
        SELECT 
            pm.id AS pmemo_id,
            pm.p_memo_no,
            pm.date AS p_memo_date,
            pm.is_final_submitted,
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
            we.id AS workshop_entry_id,
            COALESCE(we.machine_id, woi.machine_id) AS machine_id,
            COALESCE(we_mac.name, woi_mac.name) AS machine_name,
            COALESCE(we_mac.machine_number, woi_mac.machine_number) AS machine_number,
            we.packing_method,
            COALESCE(we.status, 'Pending') AS status,
            we.remarks,
            we.updated_at AS workshop_updated_at,
            c.customer_name
        FROM production_memos pm
        JOIN work_order_items woi ON pm.work_order_item_id = woi.id
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN materials m ON woi.material_id = m.id
        LEFT JOIN customer_master c ON wo.customer_id = c.id
        LEFT JOIN bill_of_materials bom ON m.id = bom.material_id
        LEFT JOIN workshop_entries we ON pm.id = we.pmemo_id
        LEFT JOIN machines we_mac ON we.machine_id = we_mac.id
        LEFT JOIN machines woi_mac ON woi.machine_id = woi_mac.id
        ORDER BY pm.p_memo_no DESC, pm.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getWorkshopEntryByPMemoId = async (pmemoId) => {
    const query = `
        SELECT 
            pm.id AS pmemo_id,
            pm.p_memo_no,
            pm.date AS p_memo_date,
            pm.is_final_submitted,
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
            we.id AS workshop_entry_id,
            COALESCE(we.machine_id, woi.machine_id) AS machine_id,
            COALESCE(we_mac.name, woi_mac.name) AS machine_name,
            COALESCE(we_mac.machine_number, woi_mac.machine_number) AS machine_number,
            we.packing_method,
            COALESCE(we.status, 'Pending') AS status,
            we.remarks,
            we.updated_at AS workshop_updated_at,
            c.customer_name
        FROM production_memos pm
        JOIN work_order_items woi ON pm.work_order_item_id = woi.id
        JOIN work_orders wo ON woi.work_order_id = wo.id
        JOIN materials m ON woi.material_id = m.id
        LEFT JOIN customer_master c ON wo.customer_id = c.id
        LEFT JOIN bill_of_materials bom ON m.id = bom.material_id
        LEFT JOIN workshop_entries we ON pm.id = we.pmemo_id
        LEFT JOIN machines we_mac ON we.machine_id = we_mac.id
        LEFT JOIN machines woi_mac ON woi.machine_id = woi_mac.id
        WHERE pm.id = ? OR pm.p_memo_no = ? OR woi.id = ?
        LIMIT 1
    `;
    const [rows] = await db.execute(query, [pmemoId, pmemoId, pmemoId]);
    if (rows.length === 0) return null;

    const entry = rows[0];

    // Fetch BOM raw materials
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

    return entry;
};

const saveWorkshopEntry = async ({
    pmemo_id,
    machine_id,
    packing_method,
    status = 'Pending',
    remarks = null,
    added_by,
    device_id = null
}) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get work_order_item_id from production_memos
        const [pMemoRows] = await connection.execute(
            `SELECT id, work_order_item_id FROM production_memos WHERE id = ?`,
            [pmemo_id]
        );
        if (pMemoRows.length === 0) {
            throw new Error('Production Memo not found');
        }
        const workOrderItemId = pMemoRows[0].work_order_item_id;

        // 2. Upsert workshop_entries table
        const upsertQuery = `
            INSERT INTO workshop_entries (
                pmemo_id, work_order_item_id, machine_id, packing_method, status, remarks, added_by, device_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                machine_id = VALUES(machine_id),
                packing_method = VALUES(packing_method),
                status = VALUES(status),
                remarks = VALUES(remarks),
                added_by = VALUES(added_by),
                device_id = VALUES(device_id)
        `;

        const [result] = await connection.execute(upsertQuery, [
            pmemo_id,
            workOrderItemId,
            machine_id || null,
            packing_method || null,
            status || 'Pending',
            remarks || null,
            added_by,
            device_id
        ]);

        // 3. Keep work_order_items.machine_id in sync if machine_id was specified
        if (machine_id) {
            await connection.execute(
                `UPDATE work_order_items SET machine_id = ? WHERE id = ?`,
                [machine_id, workOrderItemId]
            );
        }

        await connection.commit();
        return {
            id: result.insertId || undefined,
            pmemo_id,
            work_order_item_id: workOrderItemId,
            machine_id,
            packing_method,
            status,
            remarks
        };
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const createWorkshopShiftsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS workshop_shifts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pmemo_id INT NOT NULL,
            shift_name VARCHAR(100) NOT NULL DEFAULT 'Shift 1 (Day)',
            shift_date DATE NOT NULL,
            supervisor_a_id INT DEFAULT NULL,
            supervisor_b_id INT DEFAULT NULL,
            running_cavity INT DEFAULT 1,
            cycle_time DECIMAL(10,3) DEFAULT NULL,
            hourly_target DECIMAL(15,2) DEFAULT NULL,
            min_hourly_target DECIMAL(15,2) DEFAULT NULL,
            status VARCHAR(50) DEFAULT 'Configured',
            remarks TEXT DEFAULT NULL,
            added_by INT NOT NULL,
            device_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (pmemo_id) REFERENCES production_memos(id) ON DELETE CASCADE,
            FOREIGN KEY (supervisor_a_id) REFERENCES operators(id) ON DELETE SET NULL,
            FOREIGN KEY (supervisor_b_id) REFERENCES operators(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log('Workshop Shifts table ready');
};

const createWorkshopShiftLogsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS workshop_shift_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            shift_id INT NOT NULL,
            hour_slot VARCHAR(100) DEFAULT NULL,
            time_from VARCHAR(20) DEFAULT NULL,
            time_to VARCHAR(20) DEFAULT NULL,
            operator_id INT DEFAULT NULL,
            operator_2_id INT DEFAULT NULL,
            product_weight DECIMAL(15,4) DEFAULT NULL,
            target_qty DECIMAL(15,2) DEFAULT 0,
            actual_qty DECIMAL(15,2) DEFAULT 0,
            rejection_qty DECIMAL(15,2) DEFAULT 0,
            downtime_minutes INT DEFAULT 0,
            downtime_reason VARCHAR(255) DEFAULT NULL,
            remarks TEXT DEFAULT NULL,
            added_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (shift_id) REFERENCES workshop_shifts(id) ON DELETE CASCADE,
            FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE SET NULL,
            FOREIGN KEY (operator_2_id) REFERENCES operators(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);

    // Ensure columns exist on existing table
    const columns = [
        { name: 'time_from', sql: 'VARCHAR(20) DEFAULT NULL' },
        { name: 'time_to', sql: 'VARCHAR(20) DEFAULT NULL' },
        { name: 'operator_2_id', sql: 'INT DEFAULT NULL' },
        { name: 'product_weight', sql: 'DECIMAL(15,4) DEFAULT NULL' }
    ];
    for (const col of columns) {
        try {
            await db.execute(`ALTER TABLE workshop_shift_logs ADD COLUMN ${col.name} ${col.sql}`);
        } catch (e) {
            // Column already exists or error ignored
        }
    }

    console.log('Workshop Shift Logs table ready');
};

const getShiftsByPMemoId = async (pmemoId) => {
    const query = `
        SELECT 
            ws.*,
            opA.operator_name AS supervisor_a_name,
            opA.operator_code AS supervisor_a_code,
            opB.operator_name AS supervisor_b_name,
            opB.operator_code AS supervisor_b_code
        FROM workshop_shifts ws
        LEFT JOIN operators opA ON ws.supervisor_a_id = opA.id
        LEFT JOIN operators opB ON ws.supervisor_b_id = opB.id
        WHERE ws.pmemo_id = ?
        ORDER BY ws.shift_date ASC, ws.id ASC
    `;
    const [shifts] = await db.execute(query, [pmemoId]);

    for (const shift of shifts) {
        const [logs] = await db.execute(`
            SELECT 
                sl.*,
                op1.operator_name AS operator_1_name,
                op1.operator_code AS operator_1_code,
                op2.operator_name AS operator_2_name,
                op2.operator_code AS operator_2_code,
                COALESCE(op1.operator_name, '') AS operator_name
            FROM workshop_shift_logs sl
            LEFT JOIN operators op1 ON sl.operator_id = op1.id
            LEFT JOIN operators op2 ON sl.operator_2_id = op2.id
            WHERE sl.shift_id = ?
            ORDER BY sl.id ASC
        `, [shift.id]);
        shift.logs = logs;
    }

    return shifts;
};

const saveWorkshopShift = async ({
    id,
    pmemo_id,
    shift_name = 'Shift 1 (Day)',
    shift_date,
    supervisor_a_id,
    supervisor_b_id,
    running_cavity = 1,
    cycle_time,
    hourly_target,
    min_hourly_target,
    status = 'Configured',
    remarks,
    added_by,
    device_id
}) => {
    const cavityNum = Number(running_cavity) || 1;
    const cycleSec = Number(cycle_time) || 0;
    const calcHourlyTarget = cycleSec > 0 ? (3600 / cycleSec) * cavityNum : (Number(hourly_target) || 0);
    const calcMinTarget = calcHourlyTarget * 0.95;

    if (id) {
        const updateQuery = `
            UPDATE workshop_shifts SET
                shift_name = ?,
                shift_date = ?,
                supervisor_a_id = ?,
                supervisor_b_id = ?,
                running_cavity = ?,
                cycle_time = ?,
                hourly_target = ?,
                min_hourly_target = ?,
                status = ?,
                remarks = ?
            WHERE id = ?
        `;
        await db.execute(updateQuery, [
            shift_name,
            shift_date,
            supervisor_a_id || null,
            supervisor_b_id || null,
            cavityNum,
            cycleSec || null,
            calcHourlyTarget.toFixed(2),
            calcMinTarget.toFixed(2),
            status || 'Configured',
            remarks || null,
            id
        ]);
        return { id, pmemo_id, shift_name, shift_date, hourly_target: calcHourlyTarget, min_hourly_target: calcMinTarget };
    } else {
        const insertQuery = `
            INSERT INTO workshop_shifts (
                pmemo_id, shift_name, shift_date, supervisor_a_id, supervisor_b_id,
                running_cavity, cycle_time, hourly_target, min_hourly_target, status, remarks, added_by, device_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(insertQuery, [
            pmemo_id,
            shift_name,
            shift_date,
            supervisor_a_id || null,
            supervisor_b_id || null,
            cavityNum,
            cycleSec || null,
            calcHourlyTarget.toFixed(2),
            calcMinTarget.toFixed(2),
            status || 'Configured',
            remarks || null,
            added_by,
            device_id
        ]);
        return { id: result.insertId, pmemo_id, shift_name, shift_date, hourly_target: calcHourlyTarget, min_hourly_target: calcMinTarget };
    }
};

const deleteWorkshopShift = async (id) => {
    await db.execute(`DELETE FROM workshop_shifts WHERE id = ?`, [id]);
    return true;
};

const saveShiftHourlyLog = async ({
    id,
    shift_id,
    hour_slot,
    time_from,
    time_to,
    operator_id,
    operator_1_id,
    operator_2_id,
    product_weight,
    target_qty = 0,
    actual_qty = 0,
    production,
    production_qty,
    rejection_qty = 0,
    rejection,
    downtime_minutes = 0,
    downtime_reason = null,
    remarks = null,
    added_by
}) => {
    const finalOp1 = operator_1_id !== undefined ? (operator_1_id ? Number(operator_1_id) : null) : (operator_id ? Number(operator_id) : null);
    const finalOp2 = operator_2_id ? Number(operator_2_id) : null;
    const finalActual = Number(production !== undefined ? production : (production_qty !== undefined ? production_qty : actual_qty)) || 0;
    const finalRejection = Number(rejection !== undefined ? rejection : rejection_qty) || 0;
    const finalWeight = product_weight !== undefined && product_weight !== "" && product_weight !== null ? Number(product_weight) : null;
    const formattedSlot = (time_from && time_to) ? `${time_from} - ${time_to}` : (hour_slot || time_from || time_to || '—');

    if (id) {
        const updateQuery = `
            UPDATE workshop_shift_logs SET
                hour_slot = ?,
                time_from = ?,
                time_to = ?,
                operator_id = ?,
                operator_2_id = ?,
                product_weight = ?,
                target_qty = ?,
                actual_qty = ?,
                rejection_qty = ?,
                downtime_minutes = ?,
                downtime_reason = ?,
                remarks = ?
            WHERE id = ?
        `;
        await db.execute(updateQuery, [
            formattedSlot,
            time_from || null,
            time_to || null,
            finalOp1,
            finalOp2,
            finalWeight,
            Number(target_qty) || 0,
            finalActual,
            finalRejection,
            Number(downtime_minutes) || 0,
            downtime_reason || null,
            remarks || null,
            id
        ]);
        return { id, shift_id, hour_slot: formattedSlot, time_from, time_to, operator_id: finalOp1, operator_2_id: finalOp2, product_weight: finalWeight, actual_qty: finalActual, rejection_qty: finalRejection, downtime_minutes };
    } else {
        const insertQuery = `
            INSERT INTO workshop_shift_logs (
                shift_id, hour_slot, time_from, time_to, operator_id, operator_2_id, product_weight, target_qty, actual_qty, rejection_qty, downtime_minutes, downtime_reason, remarks, added_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(insertQuery, [
            shift_id,
            formattedSlot,
            time_from || null,
            time_to || null,
            finalOp1,
            finalOp2,
            finalWeight,
            Number(target_qty) || 0,
            finalActual,
            finalRejection,
            Number(downtime_minutes) || 0,
            downtime_reason || null,
            remarks || null,
            added_by
        ]);
        return { id: result.insertId, shift_id, hour_slot: formattedSlot, time_from, time_to, operator_id: finalOp1, operator_2_id: finalOp2, product_weight: finalWeight, actual_qty: finalActual, rejection_qty: finalRejection, downtime_minutes };
    }
};

const deleteShiftHourlyLog = async (id) => {
    await db.execute(`DELETE FROM workshop_shift_logs WHERE id = ?`, [id]);
    return true;
};

module.exports = {
    createWorkshopEntriesTable,
    createWorkshopShiftsTable,
    createWorkshopShiftLogsTable,
    getAllWorkshopEntries,
    getWorkshopEntryByPMemoId,
    saveWorkshopEntry,
    getShiftsByPMemoId,
    saveWorkshopShift,
    deleteWorkshopShift,
    saveShiftHourlyLog,
    deleteShiftHourlyLog
};
