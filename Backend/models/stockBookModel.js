const db = require('../config/db.js');

const createStockIssuesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS stock_issues (
            id INT AUTO_INCREMENT PRIMARY KEY,
            grn_item_id INT DEFAULT NULL,
            ma_item_id INT DEFAULT NULL,
            rm_return_id INT DEFAULT NULL,
            issue_quantity DECIMAL(15,4) NOT NULL,
            p_memo_number VARCHAR(100) DEFAULT NULL,
            issue_date DATE NOT NULL,
            removal_type VARCHAR(50) DEFAULT 'issue',
            remarks TEXT DEFAULT NULL,
            added_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ma_item_id) REFERENCES material_add_items(id) ON DELETE CASCADE,
            FOREIGN KEY (rm_return_id) REFERENCES rm_returns(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log('Stock issues table ready');
};

const getStockBookRecords = async (filters = {}) => {
    let query = `
        SELECT * FROM (
            SELECT 
                t.*,
                SUM(t.approved_quantity - t.issued_quantity) OVER (
                    PARTITION BY t.material_id, COALESCE(t.grade, '') 
                    ORDER BY t.created_at ASC
                ) AS balance_quantity
            FROM (
            SELECT 
                CONCAT('ma_', mai.id) AS id,
                1 AS is_receipt,
                NULL AS grn_item_id,
                mai.material_id AS material_id,
                ma.ma_date AS date,
                'MA Received' AS particular,
                mai.material_name AS product,
                mai.internal_batch_number AS internal_batch_number,
                '' AS supplier_batch_number,
                '' AS grade,
                '' AS vendor_name,
                NULL AS job_party_name,
                '' AS invoice_number,
                ma.ma_number AS grn_number,
                '' AS p_memo_number,
                mai.quantity AS approved_quantity,
                0 AS issued_quantity,
                NULL AS vendor_id,
                NULL AS job_party_id,
                ma.location_id,
                ma.created_at AS created_at
            FROM material_add_items mai
            JOIN material_add_master ma ON mai.ma_id = ma.id
            WHERE mai.quantity > 0

            UNION ALL

            SELECT 
                CONCAT('rtr_', r.id) AS id,
                1 AS is_receipt,
                NULL AS grn_item_id,
                r.material_id AS material_id,
                r.return_date AS date,
                'RM Returned' AS particular,
                r.material_name AS product,
                r.internal_batch_number AS internal_batch_number,
                '' AS supplier_batch_number,
                r.grade AS grade,
                '' AS vendor_name,
                NULL AS job_party_name,
                '' AS invoice_number,
                r.return_no AS grn_number,
                '' AS p_memo_number,
                r.quantity AS approved_quantity,
                0 AS issued_quantity,
                NULL AS vendor_id,
                NULL AS job_party_id,
                r.location_id,
                r.created_at AS created_at
            FROM rm_returns r

            UNION ALL

            SELECT 
                CONCAT('si_ma_', si.id) AS id,
                0 AS is_receipt,
                NULL AS grn_item_id,
                mai.material_id AS material_id,
                si.issue_date AS date,
                CASE 
                    WHEN si.removal_type = 'issue' THEN 'Stock Issued'
                    ELSE CONCAT('Removal (', si.removal_type, ')')
                END AS particular,
                mai.material_name AS product,
                mai.internal_batch_number AS internal_batch_number,
                '' AS supplier_batch_number,
                '' AS grade,
                '' AS vendor_name,
                NULL AS job_party_name,
                '' AS invoice_number,
                ma.ma_number AS grn_number,
                COALESCE(si.p_memo_number, '') AS p_memo_number,
                0 AS approved_quantity,
                si.issue_quantity AS issued_quantity,
                NULL AS vendor_id,
                NULL AS job_party_id,
                ma.location_id,
                si.created_at AS created_at
            FROM stock_issues si
            JOIN material_add_items mai ON si.ma_item_id = mai.id
            JOIN material_add_master ma ON mai.ma_id = ma.id
            WHERE si.ma_item_id IS NOT NULL

            UNION ALL

            SELECT 
                CONCAT('si_rtr_', si.id) AS id,
                0 AS is_receipt,
                NULL AS grn_item_id,
                r.material_id AS material_id,
                si.issue_date AS date,
                CASE 
                    WHEN si.removal_type = 'issue' THEN 'Stock Issued'
                    ELSE CONCAT('Removal (', si.removal_type, ')')
                END AS particular,
                r.material_name AS product,
                r.internal_batch_number AS internal_batch_number,
                '' AS supplier_batch_number,
                r.grade AS grade,
                '' AS vendor_name,
                NULL AS job_party_name,
                '' AS invoice_number,
                r.return_no AS grn_number,
                COALESCE(si.p_memo_number, '') AS p_memo_number,
                0 AS approved_quantity,
                si.issue_quantity AS issued_quantity,
                NULL AS vendor_id,
                NULL AS job_party_id,
                r.location_id,
                si.created_at AS created_at
            FROM stock_issues si
            JOIN rm_returns r ON si.rm_return_id = r.id
            WHERE si.rm_return_id IS NOT NULL
        ) t
        LEFT JOIN materials m ON t.material_id = m.id
        WHERE 1 = 1
    `;

    const queryParams = [];

    if (filters.material_id && filters.material_id !== 'all' && filters.material_id !== '') {
        query += ` AND t.material_id = ?`;
        queryParams.push(filters.material_id);
    }
    if (filters.location_id && filters.location_id !== 'all' && filters.location_id !== '') {
        query += ` AND t.location_id = ?`;
        queryParams.push(filters.location_id);
    }
    if (filters.material_type === 'rm') {
        query += ` AND m.material_type = 'Raw Materials'`;
    } else if (filters.material_type === 'general') {
        query += ` AND (m.material_type != 'Raw Materials' OR m.material_type IS NULL)`;
    }

    query += `
        ) outer_t
        WHERE 1 = 1
    `;

    if (filters.start_date && filters.start_date !== '') {
        query += ` AND outer_t.date >= ?`;
        queryParams.push(filters.start_date);
    }
    if (filters.end_date && filters.end_date !== '') {
        query += ` AND outer_t.date <= ?`;
        queryParams.push(filters.end_date);
    }

    query += ` ORDER BY outer_t.created_at DESC`;

    const [rows] = await db.execute(query, queryParams);
    return rows;
};

const createStockIssue = async (data, addedBy) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const materialId = data.material_id;
        const grade = data.grade || '';
        const requestedQuantity = Number(data.issue_quantity);

        if (requestedQuantity <= 0) {
            throw new Error('Issue quantity must be greater than zero');
        }

        // Fetch all batches of this material (from Material Add and RM Returns)
        const queryBatches = `
            SELECT 
                NULL AS grn_item_id,
                mai.id AS ma_item_id,
                NULL AS rm_return_id,
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
                r.id AS rm_return_id,
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
            WHERE r.material_id = ? AND (r.grade = ? OR ? = '')

            ORDER BY receipt_date ASC, item_id ASC
        `;

        const [batches] = await connection.execute(queryBatches, [materialId, materialId, grade, grade]);

        let totalAvailable = 0;
        const activeBatches = [];

        for (const batch of batches) {
            const approved = Number(batch.approved_qty);
            const issued = Number(batch.issued_qty);
            const available = approved - issued;
            if (available > 0) {
                totalAvailable += available;
                activeBatches.push({
                    ma_item_id: batch.ma_item_id,
                    rm_return_id: batch.rm_return_id,
                    internal_batch_number: batch.internal_batch_number,
                    available: available
                });
            }
        }

        if (requestedQuantity > totalAvailable) {
            throw new Error(`Insufficient stock. Total available balance across all batches is ${totalAvailable}`);
        }

        let remainingToIssue = requestedQuantity;
        const insertQuery = `
            INSERT INTO stock_issues (ma_item_id, rm_return_id, issue_quantity, p_memo_number, issue_date, remarks, added_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        let firstInsertId = null;

        for (const batch of activeBatches) {
            if (remainingToIssue <= 0) break;

            const deductQty = Math.min(remainingToIssue, batch.available);
            const [result] = await connection.execute(insertQuery, [
                batch.ma_item_id || null,
                batch.rm_return_id || null,
                deductQty,
                data.p_memo_number || null,
                data.issue_date,
                data.remarks || null,
                addedBy
            ]);

            if (!firstInsertId) {
                firstInsertId = result.insertId;
            }

            remainingToIssue -= deductQty;
        }

        await connection.commit();
        return firstInsertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getStockIssueLogs = async (materialId, grade) => {
    const query = `
        SELECT 
            si.id,
            si.issue_quantity,
            si.p_memo_number,
            si.issue_date,
            si.remarks,
            si.created_at,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            COALESCE(mai.internal_batch_number, r.internal_batch_number) AS internal_batch_number,
            '' AS supplier_batch_number
        FROM stock_issues si
        LEFT JOIN material_add_items mai ON si.ma_item_id = mai.id
        LEFT JOIN rm_returns r ON si.rm_return_id = r.id
        LEFT JOIN users u ON si.added_by = u.id
        WHERE mai.material_id = ? OR (r.material_id = ? AND (r.grade = ? OR ? = ''))
        ORDER BY si.issue_date DESC, si.id DESC
    `;
    const [rows] = await db.execute(query, [materialId, materialId, grade || '', grade || '']);
    return rows;
};

const ensureStockIssuesColumns = async () => {
    try {
        const columnsToEnsure = [
            { name: 'removal_type', query: "ALTER TABLE stock_issues ADD COLUMN removal_type VARCHAR(50) DEFAULT 'issue'" },
            { name: 'ma_item_id', query: "ALTER TABLE stock_issues ADD COLUMN ma_item_id INT DEFAULT NULL, ADD CONSTRAINT fk_stock_issue_ma FOREIGN KEY (ma_item_id) REFERENCES material_add_items(id) ON DELETE CASCADE" },
            { name: 'rm_return_id', query: "ALTER TABLE stock_issues ADD COLUMN rm_return_id INT DEFAULT NULL, ADD CONSTRAINT fk_stock_issue_rtr FOREIGN KEY (rm_return_id) REFERENCES rm_returns(id) ON DELETE CASCADE" }
        ];
        for (const col of columnsToEnsure) {
            const [rows] = await db.execute(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'stock_issues' 
                   AND COLUMN_NAME = ?`, [col.name]
            );
            if (rows.length === 0) {
                await db.execute(col.query);
                console.log(`Added column ${col.name} to stock_issues`);
            }
        }
        
        // Ensure grn_item_id is nullable if column exists
        const [grnCol] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'stock_issues' 
               AND COLUMN_NAME = 'grn_item_id'`
        );
        if (grnCol.length > 0) {
            await db.execute("ALTER TABLE stock_issues MODIFY grn_item_id INT DEFAULT NULL").catch(() => {});
        }
    } catch (err) {
        console.error("Error ensuring stock_issues columns:", err.message || err);
    }
};

const getActiveBatches = async () => {
    const query = `
        SELECT 
            NULL AS grn_item_id,
            mai.id AS ma_item_id,
            r.id AS rm_return_id,
            COALESCE(mai.internal_batch_number, r.internal_batch_number) AS internal_batch_number,
            COALESCE(mai.material_name, r.material_name) AS product,
            NULL AS job_party_name,
            ss.material_type,
            COALESCE(r.grade, '') AS grade,
            (COALESCE(r.quantity, ss.total_kg, 0) - COALESCE(issue_agg.issued_qty, 0)) AS balance_quantity
        FROM stock_status ss
        LEFT JOIN material_add_items mai ON ss.internal_batch_number = mai.internal_batch_number AND ss.ma_id IS NOT NULL
        LEFT JOIN material_add_master ma ON mai.ma_id = ma.id
        LEFT JOIN rm_returns r ON ss.internal_batch_number = r.internal_batch_number AND ss.rm_return_id IS NOT NULL
        LEFT JOIN (
            SELECT 
                COALESCE(mai_sub2.internal_batch_number, r_sub.internal_batch_number) AS internal_batch_number,
                SUM(si.issue_quantity) AS issued_qty
            FROM stock_issues si
            LEFT JOIN material_add_items mai_sub2 ON si.ma_item_id = mai_sub2.id
            LEFT JOIN rm_returns r_sub ON si.rm_return_id = r_sub.id
            GROUP BY COALESCE(mai_sub2.internal_batch_number, r_sub.internal_batch_number)
        ) issue_agg ON ss.internal_batch_number = issue_agg.internal_batch_number
        HAVING balance_quantity > 0
        ORDER BY internal_batch_number ASC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const removeMaterialStock = async (data, addedBy) => {
    const query = `
        INSERT INTO stock_issues (ma_item_id, rm_return_id, issue_quantity, removal_type, issue_date, remarks, added_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
        data.ma_item_id || null,
        data.rm_return_id || null,
        data.removal_quantity,
        data.removal_type,
        data.date,
        data.remarks || null,
        addedBy
    ]);
    return result.insertId;
};

module.exports = {
    createStockIssuesTable,
    ensureStockIssuesColumns,
    getStockBookRecords,
    createStockIssue,
    getStockIssueLogs,
    getActiveBatches,
    removeMaterialStock
};
