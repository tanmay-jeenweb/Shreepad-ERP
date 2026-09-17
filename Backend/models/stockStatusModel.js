const db = require('../config/db.js');

// ─── Table Creation ───────────────────────────────────────────────────────────

const createStockStatusTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS stock_status (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            internal_batch_number   VARCHAR(100) NOT NULL UNIQUE,
            party                   VARCHAR(255) DEFAULT NULL,
            location                VARCHAR(255) DEFAULT NULL,
            material_id             INT DEFAULT NULL,
            material_name           VARCHAR(255) DEFAULT NULL,
            material_type           VARCHAR(100) DEFAULT NULL,
            rm_grade                VARCHAR(100) DEFAULT NULL,
            mfi                     VARCHAR(100) DEFAULT NULL,
            number_of_bags          INT DEFAULT 0,
            kgs_per_bag             DECIMAL(15,4) DEFAULT 0,
            total_kg                DECIMAL(15,4) DEFAULT 0,
            remaining_kg            DECIMAL(15,4) DEFAULT 0,
            grn_id                  INT DEFAULT NULL,
            ma_id                   INT DEFAULT NULL,
            rm_return_id            INT DEFAULT NULL,
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
            FOREIGN KEY (ma_id)       REFERENCES material_add_master(id) ON DELETE SET NULL
        )
    `;
    await db.execute(query);
    console.log('Stock status table ready');
};

const ensureStockStatusColumns = async () => {
    try {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'stock_status' 
               AND COLUMN_NAME = 'ma_id'`
        );
        if (rows.length === 0) {
            await db.execute(`ALTER TABLE stock_status ADD COLUMN ma_id INT DEFAULT NULL`);
            await db.execute(`ALTER TABLE stock_status ADD CONSTRAINT fk_stock_status_ma FOREIGN KEY (ma_id) REFERENCES material_add_master(id) ON DELETE SET NULL`);
            console.log("Added ma_id column to stock_status");
        }

        const [rowsRm] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'stock_status' 
               AND COLUMN_NAME = 'rm_return_id'`
        );
        if (rowsRm.length === 0) {
            await db.execute(`ALTER TABLE stock_status ADD COLUMN rm_return_id INT DEFAULT NULL`);
            await db.execute(`ALTER TABLE stock_status ADD CONSTRAINT fk_stock_status_rm_return FOREIGN KEY (rm_return_id) REFERENCES rm_returns(id) ON DELETE SET NULL`);
            console.log("Added rm_return_id column to stock_status");
        }

        const [rowsWoi] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'stock_status' 
               AND COLUMN_NAME = 'work_order_item_id'`
        );
        if (rowsWoi.length === 0) {
            await db.execute(`ALTER TABLE stock_status ADD COLUMN work_order_item_id INT DEFAULT NULL`);
            await db.execute(`ALTER TABLE stock_status ADD CONSTRAINT fk_stock_status_woi FOREIGN KEY (work_order_item_id) REFERENCES work_order_items(id) ON DELETE SET NULL`);
            console.log("Added work_order_item_id column to stock_status");
        }
    } catch (err) {
        console.error("Error ensuring stock_status columns:", err.message);
    }
};

const upsertStockStatusForReturn = async (connection, returnId, returnData) => {
    const internalBatchNumber = returnData.internal_batch_number;
    if (!internalBatchNumber) return;

    let totalKg = parseFloat(returnData.quantity || 0);

    let materialType = null;
    let materialId   = returnData.material_id || null;
    if (materialId) {
        const [matRows] = await connection.execute(
            `SELECT material_type FROM materials WHERE id = ?`,
            [materialId]
        );
        if (matRows.length > 0) materialType = matRows[0].material_type;
    }

    const [existing] = await connection.execute(
        `SELECT id FROM stock_status WHERE internal_batch_number = ?`,
        [internalBatchNumber]
    );

    if (existing.length > 0) {
        await connection.execute(
            `UPDATE stock_status SET
                party           = ?,
                location        = ?,
                material_id     = ?,
                material_name   = ?,
                material_type   = ?,
                total_kg        = ?,
                remaining_kg    = ?,
                rm_return_id    = ?
            WHERE internal_batch_number = ?`,
            [
                returnData.job_party_name || null,
                returnData.location_name || null,
                materialId,
                returnData.material_name || null,
                materialType,
                totalKg,
                totalKg,
                returnId,
                internalBatchNumber
            ]
        );
    } else {
        await connection.execute(
            `INSERT INTO stock_status
                (internal_batch_number, party, location, material_id, material_name,
                 material_type, total_kg, remaining_kg, rm_return_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                internalBatchNumber,
                returnData.job_party_name || null,
                returnData.location_name || null,
                materialId,
                returnData.material_name || null,
                materialType,
                totalKg,
                totalKg,
                returnId
            ]
        );
    }
};

// ─── Upsert for Material Add ──────────────────────────────────────────────────

const upsertStockStatusForMa = async (connection, maId, item, maHeader) => {
    const internalBatchNumber = item.internal_batch_number;
    if (!internalBatchNumber) return;

    let totalKg = parseFloat(item.quantity || 0);

    let materialType = null;
    let materialId   = item.material_id || null;
    if (materialId) {
        const [matRows] = await connection.execute(
            `SELECT material_type FROM materials WHERE id = ?`,
            [materialId]
        );
        if (matRows.length > 0) materialType = matRows[0].material_type;
    }

    const [existing] = await connection.execute(
        `SELECT id FROM stock_status WHERE internal_batch_number = ?`,
        [internalBatchNumber]
    );

    if (existing.length > 0) {
        await connection.execute(
            `UPDATE stock_status SET
                party           = ?,
                location        = ?,
                material_id     = ?,
                material_name   = ?,
                material_type   = ?,
                total_kg        = ?,
                remaining_kg    = ?,
                ma_id           = ?
            WHERE internal_batch_number = ?`,
            [
                maHeader.vendor_name || maHeader.particular || null,
                maHeader.location_name || null,
                materialId,
                item.material_name || null,
                materialType,
                totalKg,
                totalKg,
                maId,
                internalBatchNumber
            ]
        );
    } else {
        await connection.execute(
            `INSERT INTO stock_status
                (internal_batch_number, party, location, material_id, material_name,
                 material_type, total_kg, remaining_kg, ma_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                internalBatchNumber,
                maHeader.vendor_name || maHeader.particular || null,
                maHeader.location_name || null,
                materialId,
                item.material_name || null,
                materialType,
                totalKg,
                totalKg,
                maId
            ]
        );
    }
};

const upsertStockStatusForFinishedGoods = async (connection, {
    work_order_item_id,
    material_id,
    material_name,
    material_type,
    batch_no,
    quantity,
    customer_name,
    location_name
}) => {
    const internalBatchNumber = batch_no;
    if (!internalBatchNumber) return;

    const qtyToAdd = parseFloat(quantity || 0);
    if (qtyToAdd <= 0) return;

    let matType = material_type || null;
    let matName = material_name || null;
    if (material_id && (!matType || !matName)) {
        const [matRows] = await connection.execute(
            `SELECT material_name, material_type FROM materials WHERE id = ?`,
            [material_id]
        );
        if (matRows.length > 0) {
            matName = matName || matRows[0].material_name;
            matType = matType || matRows[0].material_type;
        }
    }

    const [existing] = await connection.execute(
        `SELECT id, total_kg, remaining_kg FROM stock_status WHERE internal_batch_number = ?`,
        [internalBatchNumber]
    );

    if (existing.length > 0) {
        const newTotal = (parseFloat(existing[0].total_kg) || 0) + qtyToAdd;
        const newRemaining = (parseFloat(existing[0].remaining_kg) || 0) + qtyToAdd;
        await connection.execute(
            `UPDATE stock_status SET
                party = COALESCE(?, party),
                location = COALESCE(?, location),
                material_id = ?,
                material_name = ?,
                material_type = ?,
                total_kg = ?,
                remaining_kg = ?,
                work_order_item_id = COALESCE(?, work_order_item_id)
            WHERE internal_batch_number = ?`,
            [
                customer_name || null,
                location_name || null,
                material_id,
                matName,
                matType,
                newTotal,
                newRemaining,
                work_order_item_id,
                internalBatchNumber
            ]
        );
    } else {
        await connection.execute(
            `INSERT INTO stock_status
                (internal_batch_number, party, location, material_id, material_name,
                 material_type, total_kg, remaining_kg, work_order_item_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                internalBatchNumber,
                customer_name || 'In-House Production',
                location_name || null,
                material_id,
                matName,
                matType || 'Finished Goods',
                qtyToAdd,
                qtyToAdd,
                work_order_item_id
            ]
        );
    }
};

const rollbackStockStatusForFinishedGoods = async (connection, {
    batch_no,
    quantity
}) => {
    const internalBatchNumber = batch_no;
    if (!internalBatchNumber) return;

    const qtyToDeduct = parseFloat(quantity || 0);
    if (qtyToDeduct <= 0) return;

    const [existing] = await connection.execute(
        `SELECT id, total_kg, remaining_kg FROM stock_status WHERE internal_batch_number = ?`,
        [internalBatchNumber]
    );

    if (existing.length > 0) {
        const currentRemaining = parseFloat(existing[0].remaining_kg) || 0;
        if (currentRemaining < qtyToDeduct) {
            throw new Error(
                `Cannot reverse this Finished Goods movement: remaining stock in store (${currentRemaining} Nos) is less than the quantity being reversed (${qtyToDeduct} Nos). Some items may have already been dispatched or removed.`
            );
        }

        const newTotal = Math.max(0, (parseFloat(existing[0].total_kg) || 0) - qtyToDeduct);
        const newRemaining = Math.max(0, currentRemaining - qtyToDeduct);

        if (newTotal === 0 && newRemaining === 0) {
            await connection.execute(`DELETE FROM stock_status WHERE id = ?`, [existing[0].id]);
        } else {
            await connection.execute(
                `UPDATE stock_status SET total_kg = ?, remaining_kg = ? WHERE id = ?`,
                [newTotal, newRemaining, existing[0].id]
            );
        }
    }
};

// ─── Get All Stock Status Records ─────────────────────────────────────────────

const getAllStockStatus = async (typeFilter, filters = {}) => {
    let whereClause = 'WHERE 1=1';
    const params = [];

    const matType = filters.material_type || typeFilter;
    if (matType && matType !== 'all' && matType !== '') {
        if (matType === 'rm') {
            whereClause += ` AND ss.material_type = 'Raw Materials'`;
        } else if (matType === 'general') {
            whereClause += ` AND (ss.material_type != 'Raw Materials' OR ss.material_type IS NULL)`;
        } else {
            whereClause += ` AND ss.material_type = ?`;
            params.push(matType);
        }
    }

    if (filters.material_id && filters.material_id !== 'all' && filters.material_id !== '') {
        whereClause += ` AND ss.material_id = ?`;
        params.push(filters.material_id);
    }
    if (filters.location_id && filters.location_id !== 'all' && filters.location_id !== '') {
        whereClause += ` AND (ma.location_id = ? OR r.location_id = ?)`;
        params.push(filters.location_id, filters.location_id);
    }
    if (filters.start_date && filters.start_date !== '') {
        whereClause += ` AND COALESCE(ma.ma_date, r.return_date, ss.created_at) >= ?`;
        params.push(filters.start_date);
    }
    if (filters.end_date && filters.end_date !== '') {
        whereClause += ` AND COALESCE(ma.ma_date, r.return_date, ss.created_at) <= ?`;
        params.push(filters.end_date);
    }

    const query = `
        SELECT
            ss.id,
            ss.internal_batch_number,
            COALESCE(mai.supplier_batch_number, '') AS supplier_batch_number,
            ss.party,
            ss.location,
            ss.material_name,
            ss.material_type,
            (COALESCE(r.quantity, ss.total_kg) - COALESCE(issue_agg.issued_qty, 0)) AS total_kg,
            ss.grn_id,
            ss.ma_id,
            ss.rm_return_id,
            COALESCE(ma.ma_number, r.return_no, CONCAT('WO-', LPAD(wo.work_order_no, 4, '0'))) AS grn_number,
            NULL AS job_party_name,
            COALESCE(ma.ma_date, r.return_date, ss.created_at) AS date,
            ss.created_at,
            ss.updated_at,
            u.unit_name as unit,
            SUM(COALESCE(r.quantity, ss.total_kg) - COALESCE(issue_agg.issued_qty, 0)) OVER (
                PARTITION BY ss.material_id 
                ORDER BY COALESCE(ma.ma_date, r.return_date, ss.created_at) ASC, ss.id ASC
            ) AS balance_quantity
        FROM stock_status ss
        LEFT JOIN material_add_master ma ON ss.ma_id = ma.id
        LEFT JOIN rm_returns r ON ss.rm_return_id = r.id
        LEFT JOIN work_order_items woi ON ss.work_order_item_id = woi.id
        LEFT JOIN work_orders wo ON woi.work_order_id = wo.id
        LEFT JOIN materials m ON ss.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN material_add_items mai ON ss.internal_batch_number = mai.internal_batch_number AND ss.ma_id IS NOT NULL
        LEFT JOIN (
            SELECT 
                COALESCE(mai_sub2.internal_batch_number, r_sub.internal_batch_number) AS internal_batch_number,
                SUM(si.issue_quantity) AS issued_qty
            FROM stock_issues si
            LEFT JOIN material_add_items mai_sub2 ON si.ma_item_id = mai_sub2.id
            LEFT JOIN rm_returns r_sub ON si.rm_return_id = r_sub.id
            GROUP BY COALESCE(mai_sub2.internal_batch_number, r_sub.internal_batch_number)
        ) issue_agg ON ss.internal_batch_number = issue_agg.internal_batch_number
        ${whereClause}
        ORDER BY ss.updated_at DESC
    `;
    const [rows] = await db.execute(query, params);
    return rows;
};

module.exports = {
    createStockStatusTable,
    ensureStockStatusColumns,
    upsertStockStatusForMa,
    upsertStockStatusForReturn,
    upsertStockStatusForFinishedGoods,
    rollbackStockStatusForFinishedGoods,
    getAllStockStatus,
};
