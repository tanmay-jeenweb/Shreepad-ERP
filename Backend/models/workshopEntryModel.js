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

module.exports = {
    createWorkshopEntriesTable,
    getAllWorkshopEntries,
    getWorkshopEntryByPMemoId,
    saveWorkshopEntry
};
