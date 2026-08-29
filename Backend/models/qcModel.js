const db = require('../config/db.js');

const createQcTables = async () => {
    const createQcMasterQuery = `
        CREATE TABLE IF NOT EXISTS qc_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            qc_number VARCHAR(50) NOT NULL UNIQUE,
            qc_date DATE NOT NULL,
            grn_id INT DEFAULT NULL,
            grn_number VARCHAR(50) DEFAULT NULL,
            ma_id INT DEFAULT NULL,
            ma_number VARCHAR(50) DEFAULT NULL,
            source VARCHAR(20) DEFAULT 'grn',
            status VARCHAR(50) DEFAULT 'completed',
            remarks TEXT DEFAULT NULL,
            added_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (grn_id) REFERENCES grn_master(id) ON DELETE CASCADE,
            FOREIGN KEY (ma_id) REFERENCES material_add_master(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    const createQcItemsQuery = `
        CREATE TABLE IF NOT EXISTS qc_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            qc_id INT NOT NULL,
            grn_item_id INT DEFAULT NULL,
            ma_item_id INT DEFAULT NULL,
            material_id INT DEFAULT NULL,
            material_name VARCHAR(255),
            received_quantity DECIMAL(15,4) DEFAULT 0,
            approved_quantity DECIMAL(15,4) DEFAULT 0,
            rejected_quantity DECIMAL(15,4) DEFAULT 0,
            rejection_type VARCHAR(50) DEFAULT 'reject',
            qc_remarks TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (qc_id) REFERENCES qc_master(id) ON DELETE CASCADE,
            FOREIGN KEY (grn_item_id) REFERENCES grn_items(id) ON DELETE CASCADE,
            FOREIGN KEY (ma_item_id) REFERENCES material_add_items(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
        )
    `;

    await db.execute(createQcMasterQuery);
    await db.execute(createQcItemsQuery);
    console.log('QC tables ready');
};

const generateQcNumber = async () => {
    const year = new Date().getFullYear();
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS cnt FROM qc_master WHERE qc_number LIKE ?`,
        [`QC-${year}-%`]
    );
    const seq = (rows[0].cnt || 0) + 1;
    return `QC-${year}-${String(seq).padStart(4, '0')}`;
};

const createQcDocument = async (headerData, itemsData, addedBy) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const qcNumber = await generateQcNumber();

        const insertQcQuery = `
            INSERT INTO qc_master (qc_number, qc_date, grn_id, grn_number, ma_id, ma_number, source, status, remarks, added_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [qcResult] = await connection.execute(insertQcQuery, [
            qcNumber,
            headerData.qc_date,
            headerData.grn_id || null,
            headerData.grn_number || null,
            headerData.ma_id || null,
            headerData.ma_number || null,
            headerData.source || 'grn',
            headerData.status || 'completed',
            headerData.remarks || null,
            addedBy
        ]);

        const qcId = qcResult.insertId;

        const insertItemQuery = `
            INSERT INTO qc_items (qc_id, grn_item_id, ma_item_id, material_id, material_name, received_quantity, approved_quantity, rejected_quantity, rejection_type, qc_remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const updateStockGrnQuery = `
            UPDATE stock_status ss
            JOIN grn_items gi ON ss.internal_batch_number = gi.internal_batch_number
            SET 
                ss.total_kg = ss.total_kg - ?,
                ss.remaining_kg = ss.remaining_kg - ?
            WHERE gi.id = ?
        `;

        const updateStockMaQuery = `
            UPDATE stock_status ss
            JOIN material_add_items mai ON ss.internal_batch_number = mai.internal_batch_number
            SET 
                ss.total_kg = ss.total_kg - ?,
                ss.remaining_kg = ss.remaining_kg - ?
            WHERE mai.id = ?
        `;

        for (const item of itemsData) {
            await connection.execute(insertItemQuery, [
                qcId,
                item.grn_item_id || null,
                item.ma_item_id || null,
                item.material_id || null,
                item.material_name || null,
                item.received_quantity || 0,
                item.approved_quantity || 0,
                item.rejected_quantity || 0,
                item.rejection_type || 'reject',
                item.qc_remarks || null
            ]);

            const rejectedQty = parseFloat(item.rejected_quantity || 0);
            if (rejectedQty > 0) {
                if (item.grn_item_id) {
                    await connection.execute(updateStockGrnQuery, [
                        rejectedQty,
                        rejectedQty,
                        item.grn_item_id
                    ]);
                } else if (item.ma_item_id) {
                    await connection.execute(updateStockMaQuery, [
                        rejectedQty,
                        rejectedQty,
                        item.ma_item_id
                    ]);
                }
            }
        }

        if (headerData.ma_id) {
            await connection.execute(`UPDATE material_add_master SET status = 'QC Completed' WHERE id = ?`, [headerData.ma_id]);
        }
        if (headerData.grn_id) {
            await connection.execute(`UPDATE grn_master SET status = 'QC Completed' WHERE id = ?`, [headerData.grn_id]);
        }

        await connection.commit();
        return { qcId, qcNumber };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getPendingQcGrns = async () => {
    // A GRN is pending QC if any of its items have received_quantity > (sum of approved + rejected in QC)
    const query = `
        SELECT 
            g.id AS grn_id,
            g.grn_number,
            g.grn_date,
            g.vendor_id,
            g.name AS vendor_name,
            g.status AS grn_status,
            GROUP_CONCAT(DISTINCT gi.supplier_batch_number SEPARATOR ', ') AS supplier_batch_numbers,
            GROUP_CONCAT(DISTINCT gi.internal_batch_number SEPARATOR ', ') AS internal_batch_numbers,
            SUM(gi.received_quantity) AS total_received,
            SUM(COALESCE(qc_agg.total_qc_done, 0)) AS total_qc_done
        FROM grn_master g
        JOIN grn_items gi ON g.id = gi.grn_id
        LEFT JOIN (
            SELECT grn_item_id, SUM(approved_quantity + rejected_quantity) AS total_qc_done
            FROM qc_items
            GROUP BY grn_item_id
        ) qc_agg ON gi.id = qc_agg.grn_item_id
        WHERE g.status IN ('received', 'partially_received', 'closed')
        GROUP BY g.id
        HAVING total_received > total_qc_done
        ORDER BY g.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getPendingQcItemsByGrnId = async (grnId) => {
    const query = `
        SELECT 
            gi.id AS grn_item_id,
            gi.material_id,
            gi.material_name,
            gi.ordered_quantity,
            gi.received_quantity,
            gi.supplier_batch_number,
            gi.internal_batch_number,
            COALESCE(qc_agg.approved, 0) AS previously_approved,
            COALESCE(qc_agg.rejected, 0) AS previously_rejected,
            (gi.received_quantity - COALESCE(qc_agg.approved, 0) - COALESCE(qc_agg.rejected, 0)) AS pending_qc_quantity
        FROM grn_items gi
        LEFT JOIN (
            SELECT grn_item_id, SUM(approved_quantity) AS approved, SUM(rejected_quantity) AS rejected
            FROM qc_items
            GROUP BY grn_item_id
        ) qc_agg ON gi.id = qc_agg.grn_item_id
        WHERE gi.grn_id = ?
        HAVING pending_qc_quantity > 0
    `;
    const [rows] = await db.execute(query, [grnId]);
    return rows;
};

const getPendingQcMas = async () => {
    const query = `
        SELECT 
            m.id AS ma_id,
            m.ma_number,
            m.ma_date,
            m.status AS ma_status,
            GROUP_CONCAT(DISTINCT mai.internal_batch_number SEPARATOR ', ') AS internal_batch_numbers,
            SUM(mai.quantity) AS total_received,
            SUM(COALESCE(qc_agg.total_qc_done, 0)) AS total_qc_done
        FROM material_add_master m
        JOIN material_add_items mai ON m.id = mai.ma_id
        LEFT JOIN (
            SELECT ma_item_id, SUM(approved_quantity + rejected_quantity) AS total_qc_done
            FROM qc_items
            WHERE ma_item_id IS NOT NULL
            GROUP BY ma_item_id
        ) qc_agg ON mai.id = qc_agg.ma_item_id
        GROUP BY m.id
        HAVING total_received > total_qc_done
        ORDER BY m.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getPendingQcItemsByMaId = async (maId) => {
    const query = `
        SELECT 
            mai.id AS ma_item_id,
            mai.material_id,
            mai.material_name,
            mai.quantity AS received_quantity,
            mai.internal_batch_number,
            COALESCE(qc_agg.approved, 0) AS previously_approved,
            COALESCE(qc_agg.rejected, 0) AS previously_rejected,
            (mai.quantity - COALESCE(qc_agg.approved, 0) - COALESCE(qc_agg.rejected, 0)) AS pending_qc_quantity
        FROM material_add_items mai
        LEFT JOIN (
            SELECT ma_item_id, SUM(approved_quantity) AS approved, SUM(rejected_quantity) AS rejected
            FROM qc_items
            WHERE ma_item_id IS NOT NULL
            GROUP BY ma_item_id
        ) qc_agg ON mai.id = qc_agg.ma_item_id
        WHERE mai.ma_id = ?
        HAVING pending_qc_quantity > 0
    `;
    const [rows] = await db.execute(query, [maId]);
    return rows;
};

const getAllQcDocuments = async () => {
    const query = `
        SELECT 
            q.id,
            q.qc_number,
            q.qc_date,
            q.grn_id,
            q.grn_number,
            q.ma_id,
            q.ma_number,
            q.source,
            q.status,
            q.remarks,
            q.created_at,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM qc_master q
        LEFT JOIN users u ON q.added_by = u.id
        ORDER BY q.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getAllQcHistoryLogs = async () => {
    const query = `
        SELECT 
            qi.id,
            q.qc_number,
            q.qc_date,
            COALESCE(q.grn_number, q.ma_number) AS reference_number,
            q.source,
            qi.material_name,
            COALESCE(gi.supplier_batch_number, '') AS supplier_batch_number,
            COALESCE(gi.internal_batch_number, mai.internal_batch_number) AS internal_batch_number,
            qi.received_quantity,
            qi.approved_quantity,
            qi.rejected_quantity,
            qi.rejection_type,
            qi.qc_remarks,
            q.created_at,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM qc_items qi
        JOIN qc_master q ON qi.qc_id = q.id
        LEFT JOIN grn_items gi ON qi.grn_item_id = gi.id
        LEFT JOIN material_add_items mai ON qi.ma_item_id = mai.id
        LEFT JOIN users u ON q.added_by = u.id
        ORDER BY q.created_at DESC, qi.id ASC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getQcById = async (id) => {
    const [qcRows] = await db.execute(
        `SELECT q.*, COALESCE(u.name, 'Unknown') AS added_by_name
         FROM qc_master q
         LEFT JOIN users u ON q.added_by = u.id
         WHERE q.id = ?`,
        [id]
    );
    if (qcRows.length === 0) return null;
    const qc = qcRows[0];

    const [items] = await db.execute(
        `SELECT * FROM qc_items WHERE qc_id = ? ORDER BY id ASC`,
        [id]
    );
    qc.items = items;
    return qc;
};

const ensureQcItemsColumns = async () => {
    try {
        const columnsToEnsureItems = [
            { name: 'rejection_type', query: `ALTER TABLE qc_items ADD COLUMN rejection_type VARCHAR(50) DEFAULT 'reject'` },
            { name: 'ma_item_id', query: `ALTER TABLE qc_items ADD COLUMN ma_item_id INT DEFAULT NULL, ADD CONSTRAINT fk_qc_ma_item FOREIGN KEY (ma_item_id) REFERENCES material_add_items(id) ON DELETE CASCADE` },
        ];
        for (const col of columnsToEnsureItems) {
            const [rows] = await db.execute(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_items' AND COLUMN_NAME = ?`,
                [col.name]
            );
            if (rows.length === 0) {
                await db.execute(col.query);
                console.log(`Added column ${col.name} to qc_items`);
            }
        }
        await db.execute("ALTER TABLE qc_items MODIFY grn_item_id INT DEFAULT NULL");

        const columnsToEnsureMaster = [
            { name: 'ma_id', query: `ALTER TABLE qc_master ADD COLUMN ma_id INT DEFAULT NULL, ADD CONSTRAINT fk_qc_ma FOREIGN KEY (ma_id) REFERENCES material_add_master(id) ON DELETE CASCADE` },
            { name: 'ma_number', query: `ALTER TABLE qc_master ADD COLUMN ma_number VARCHAR(50) DEFAULT NULL` },
            { name: 'source', query: `ALTER TABLE qc_master ADD COLUMN source VARCHAR(20) DEFAULT 'grn'` },
        ];
        for (const col of columnsToEnsureMaster) {
            const [rows] = await db.execute(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_master' AND COLUMN_NAME = ?`,
                [col.name]
            );
            if (rows.length === 0) {
                await db.execute(col.query);
                console.log(`Added column ${col.name} to qc_master`);
            }
        }
        await db.execute("ALTER TABLE qc_master MODIFY grn_id INT DEFAULT NULL");
        await db.execute("ALTER TABLE qc_master MODIFY grn_number VARCHAR(50) DEFAULT NULL");
    } catch (err) {
        console.error("Error ensuring qc_items columns:", err.message || err);
    }
};

module.exports = {
    createQcTables,
    ensureQcItemsColumns,
    createQcDocument,
    getPendingQcGrns,
    getPendingQcMas,
    getPendingQcItemsByGrnId,
    getPendingQcItemsByMaId,
    getAllQcDocuments,
    getAllQcHistoryLogs,
    getQcById
};
