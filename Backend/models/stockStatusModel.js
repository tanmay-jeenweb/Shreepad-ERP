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
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
            FOREIGN KEY (grn_id)      REFERENCES grn_master(id) ON DELETE SET NULL,
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
    } catch (err) {
        console.error("Error ensuring stock_status columns:", err.message);
    }
};

const upsertStockStatusForReturn = async (connection, returnId, returnData) => {
    const internalBatchNumber = returnData.internal_batch_number;
    if (!internalBatchNumber) return;

    let totalKg = parseFloat(returnData.quantity || 0);

    // Fetch material_type from materials table
    let materialType = null;
    let materialId   = returnData.material_id || null;
    if (materialId) {
        const [matRows] = await connection.execute(
            `SELECT material_type FROM materials WHERE id = ?`,
            [materialId]
        );
        if (matRows.length > 0) materialType = matRows[0].material_type;
    }

    const rmGrade = (materialType === 'Raw Materials') ? (returnData.grade || null) : null;

    // Check if row already exists
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
                rm_grade        = ?,
                number_of_bags  = 0,
                kgs_per_bag     = 0,
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
                rmGrade,
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
                 material_type, rm_grade, number_of_bags, kgs_per_bag, total_kg, remaining_kg, rm_return_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
            [
                internalBatchNumber,
                returnData.job_party_name || null,
                returnData.location_name || null,
                materialId,
                returnData.material_name || null,
                materialType,
                rmGrade,
                totalKg,
                totalKg,
                returnId
            ]
        );
    }
};

// ─── Upsert (called from GRN create/update) ───────────────────────────────────

/**
 * Upserts a stock status row based on internal_batch_number.
 * If the row exists, it updates quantities.
 * If not, it creates a new row.
 */
const upsertStockStatus = async (connection, grnId, item, grnHeader) => {
    const internalBatchNumber = item.internal_batch_number;
    if (!internalBatchNumber) return;

    let totalKg = parseFloat(item.received_quantity || 0);

    // Deduct any rejected quantity from QC if it exists for this batch
    const [rejectedRows] = await connection.execute(
        `SELECT SUM(qi.rejected_quantity) as total_rejected
         FROM qc_items qi
         JOIN grn_items gi ON qi.grn_item_id = gi.id
         WHERE gi.internal_batch_number = ?`,
        [internalBatchNumber]
    );
    const rejectedQty = rejectedRows.length > 0 ? parseFloat(rejectedRows[0].total_rejected || 0) : 0;
    totalKg = Math.max(0, totalKg - rejectedQty);

    // Compute kgs_per_bag and number_of_bags from item fields
    const kgsPerBag  = parseFloat(item.kgs_per_bag || 0);
    const numBags    = parseInt(item.number_of_bags || 0, 10);
    const remaining  = totalKg - (numBags * kgsPerBag);

    // Fetch material_type from materials table
    let materialType = null;
    let materialId   = item.material_id || null;
    if (materialId) {
        const [matRows] = await connection.execute(
            `SELECT material_type FROM materials WHERE id = ?`,
            [materialId]
        );
        if (matRows.length > 0) materialType = matRows[0].material_type;
    }

    // rm_grade is only applicable for Raw Materials
    const rmGrade = (materialType === 'Raw Materials') ? (item.grade || null) : null;

    // Check if row already exists
    const [existing] = await connection.execute(
        `SELECT id FROM stock_status WHERE internal_batch_number = ?`,
        [internalBatchNumber]
    );

    if (existing.length > 0) {
        // Update existing row
        await connection.execute(
            `UPDATE stock_status SET
                party           = ?,
                location        = ?,
                material_id     = ?,
                material_name   = ?,
                material_type   = ?,
                rm_grade        = ?,
                number_of_bags  = ?,
                kgs_per_bag     = ?,
                total_kg        = ?,
                remaining_kg    = ?,
                grn_id          = ?
            WHERE internal_batch_number = ?`,
            [
                grnHeader.name || null,
                grnHeader.location_name || null,
                materialId,
                item.material_name || null,
                materialType,
                rmGrade,
                numBags,
                kgsPerBag,
                totalKg,
                remaining,
                grnId,
                internalBatchNumber
            ]
        );
    } else {
        // Insert new row
        await connection.execute(
            `INSERT INTO stock_status
                (internal_batch_number, party, location, material_id, material_name,
                 material_type, rm_grade, number_of_bags, kgs_per_bag, total_kg, remaining_kg, grn_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                internalBatchNumber,
                grnHeader.name || null,
                grnHeader.location_name || null,
                materialId,
                item.material_name || null,
                materialType,
                rmGrade,
                numBags,
                kgsPerBag,
                totalKg,
                remaining,
                grnId
            ]
        );
    }
};

// ─── Upsert for Material Add ──────────────────────────────────────────────────

const upsertStockStatusForMa = async (connection, maId, item, maHeader) => {
    const internalBatchNumber = item.internal_batch_number;
    if (!internalBatchNumber) return;

    let totalKg = parseFloat(item.quantity || 0);

    // Deduct any rejected quantity from QC if it exists for this batch
    const [rejectedRows] = await connection.execute(
        `SELECT SUM(qi.rejected_quantity) as total_rejected
         FROM qc_items qi
         JOIN material_add_items mai ON qi.ma_item_id = mai.id
         WHERE mai.internal_batch_number = ?`,
        [internalBatchNumber]
    );
    const rejectedQty = rejectedRows.length > 0 ? parseFloat(rejectedRows[0].total_rejected || 0) : 0;
    totalKg = Math.max(0, totalKg - rejectedQty);

    // Compute kgs_per_bag and number_of_bags from item fields
    const kgsPerBag  = parseFloat(item.kgs_per_bag || 0);
    const numBags    = parseInt(item.number_of_bags || 0, 10);
    const remaining  = totalKg - (numBags * kgsPerBag);

    // Fetch material_type from materials table
    let materialType = null;
    let materialId   = item.material_id || null;
    if (materialId) {
        const [matRows] = await connection.execute(
            `SELECT material_type FROM materials WHERE id = ?`,
            [materialId]
        );
        if (matRows.length > 0) materialType = matRows[0].material_type;
    }

    const rmGrade = (materialType === 'Raw Materials') ? (item.grade || null) : null;

    // Check if row already exists
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
                rm_grade        = ?,
                number_of_bags  = ?,
                kgs_per_bag     = ?,
                total_kg        = ?,
                remaining_kg    = ?,
                ma_id           = ?
            WHERE internal_batch_number = ?`,
            [
                maHeader.job_party_name || null,
                maHeader.location_name || null,
                materialId,
                item.material_name || null,
                materialType,
                rmGrade,
                numBags,
                kgsPerBag,
                totalKg,
                remaining,
                maId,
                internalBatchNumber
            ]
        );
    } else {
        await connection.execute(
            `INSERT INTO stock_status
                (internal_batch_number, party, location, material_id, material_name,
                 material_type, rm_grade, number_of_bags, kgs_per_bag, total_kg, remaining_kg, ma_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                internalBatchNumber,
                maHeader.job_party_name || null,
                maHeader.location_name || null,
                materialId,
                item.material_name || null,
                materialType,
                rmGrade,
                numBags,
                kgsPerBag,
                totalKg,
                remaining,
                maId
            ]
        );
    }
};

// ─── Get All Stock Status Records ─────────────────────────────────────────────

const getAllStockStatus = async (typeFilter, filters = {}) => {
    let whereClause = '';
    const params = [];
    if (typeFilter === 'rm') {
        whereClause = `WHERE ss.material_type = 'Raw Materials' AND (qc_agg.approved_qty > 0 OR ss.rm_return_id IS NOT NULL)`;
    } else if (typeFilter === 'general') {
        whereClause = `WHERE (ss.material_type != 'Raw Materials' OR ss.material_type IS NULL) AND (qc_agg.approved_qty > 0 OR ss.rm_return_id IS NOT NULL)`;
    } else {
        whereClause = `WHERE (qc_agg.approved_qty > 0 OR ss.rm_return_id IS NOT NULL)`;
    }

    if (filters.vendor_id && filters.vendor_id !== 'all' && filters.vendor_id !== '') {
        whereClause += ` AND g.vendor_id = ?`;
        params.push(filters.vendor_id);
    }
    if (filters.job_party_id && filters.job_party_id !== 'all' && filters.job_party_id !== '') {
        whereClause += ` AND (g.job_party_id = ? OR ma.job_party_id = ? OR r.job_party_id = ?)`;
        params.push(filters.job_party_id, filters.job_party_id, filters.job_party_id);
    }
    if (filters.material_id && filters.material_id !== 'all' && filters.material_id !== '') {
        whereClause += ` AND ss.material_id = ?`;
        params.push(filters.material_id);
    }
    if (filters.rm_grade && filters.rm_grade !== 'all' && filters.rm_grade !== '') {
        whereClause += ` AND ss.rm_grade = ?`;
        params.push(filters.rm_grade);
    }
    if (filters.location_id && filters.location_id !== 'all' && filters.location_id !== '') {
        whereClause += ` AND (g.location_id = ? OR ma.location_id = ? OR r.location_id = ?)`;
        params.push(filters.location_id, filters.location_id, filters.location_id);
    }
    if (filters.start_date && filters.start_date !== '') {
        whereClause += ` AND COALESCE(g.grn_date, ma.ma_date, r.return_date, ss.created_at) >= ?`;
        params.push(filters.start_date);
    }
    if (filters.end_date && filters.end_date !== '') {
        whereClause += ` AND COALESCE(g.grn_date, ma.ma_date, r.return_date, ss.created_at) <= ?`;
        params.push(filters.end_date);
    }

    const query = `
        SELECT
            ss.id,
            ss.internal_batch_number,
            COALESCE(gi.supplier_batch_number, '') AS supplier_batch_number,
            CASE WHEN ss.grn_id IS NOT NULL THEN ss.party ELSE '' END AS party,
            ss.location,
            ss.material_name,
            ss.material_type,
            ss.rm_grade,
            ss.mfi,
            COALESCE(FLOOR(GREATEST(0, (COALESCE(qc_agg.approved_qty, r.quantity, ss.total_kg) - COALESCE(issue_agg.issued_qty, 0))) / NULLIF(ss.kgs_per_bag, 0)), 0) AS number_of_bags,
            ss.kgs_per_bag,
            (GREATEST(0, (COALESCE(qc_agg.approved_qty, r.quantity, ss.total_kg) - COALESCE(issue_agg.issued_qty, 0))) - COALESCE(FLOOR(GREATEST(0, (COALESCE(qc_agg.approved_qty, r.quantity, ss.total_kg) - COALESCE(issue_agg.issued_qty, 0))) / NULLIF(ss.kgs_per_bag, 0)), 0) * ss.kgs_per_bag) AS remaining_kg,
            (COALESCE(qc_agg.approved_qty, r.quantity, ss.total_kg) - COALESCE(issue_agg.issued_qty, 0)) AS total_kg,
            ss.grn_id,
            ss.ma_id,
            ss.rm_return_id,
            COALESCE(g.grn_number, ma.ma_number, r.return_no) AS grn_number,
            COALESCE(g.job_party_name, ma.job_party_name, r.job_party_name) AS job_party_name,
            COALESCE(g.grn_date, ma.ma_date, r.return_date, ss.created_at) AS date,
            ss.created_at,
            ss.updated_at,
            u.unit_name as unit,
            SUM(COALESCE(qc_agg.approved_qty, r.quantity, ss.total_kg) - COALESCE(issue_agg.issued_qty, 0)) OVER (
                PARTITION BY ss.material_id, COALESCE(ss.rm_grade, '') 
                ORDER BY COALESCE(g.grn_date, ma.ma_date, r.return_date) ASC, ss.id ASC
            ) AS balance_quantity
        FROM stock_status ss
        LEFT JOIN grn_master g ON ss.grn_id = g.id
        LEFT JOIN material_add_master ma ON ss.ma_id = ma.id
        LEFT JOIN rm_returns r ON ss.rm_return_id = r.id
        LEFT JOIN materials m ON ss.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN grn_items gi ON ss.internal_batch_number = gi.internal_batch_number AND ss.grn_id IS NOT NULL
        LEFT JOIN material_add_items mai ON ss.internal_batch_number = mai.internal_batch_number AND ss.ma_id IS NOT NULL
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
        ${whereClause}
        ORDER BY ss.updated_at DESC
    `;
    const [rows] = await db.execute(query, params);
    return rows;
};
module.exports = {
    createStockStatusTable,
    ensureStockStatusColumns,
    upsertStockStatus,
    upsertStockStatusForMa,
    upsertStockStatusForReturn,
    getAllStockStatus,
};
