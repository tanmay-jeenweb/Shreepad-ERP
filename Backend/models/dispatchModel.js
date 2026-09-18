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
            packing_method         VARCHAR(100) NOT NULL,
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

        if (!data.packing_method || !data.packing_method.trim()) {
            throw new Error('Packing method is required');
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
                packing_method,
                party_name,
                vehicle_no,
                remarks,
                added_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [insertRes] = await connection.execute(insertQuery, [
            dispatchNo,
            dispatchDate,
            stockRow.id,
            materialId,
            data.internal_batch_number,
            qty,
            data.packing_method.trim(),
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
            packing_method: data.packing_method.trim(),
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

const getAllDispatches = async (filters = {}) => {
    let query = `
        SELECT
            d.id,
            d.dispatch_no,
            d.dispatch_date,
            d.stock_status_id,
            d.material_id,
            m.material_name,
            m.material_type,
            COALESCE(u.unit_name, 'Nos') AS unit,
            d.internal_batch_number,
            d.quantity,
            d.packing_method,
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
        query += ` AND (d.dispatch_no LIKE ? OR d.internal_batch_number LIKE ? OR m.material_name LIKE ? OR d.party_name LIKE ? OR d.packing_method LIKE ?)`;
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
            m.material_name,
            m.material_type,
            COALESCE(u.unit_name, 'Nos') AS unit,
            usr.name AS added_by_name
        FROM dispatches d
        JOIN materials m ON d.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN users usr ON d.added_by = usr.id
        WHERE d.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0] || null;
};

module.exports = {
    createDispatchTable,
    createDispatch,
    getAllDispatches,
    getDispatchById,
    getAvailableStockStatusBatches
};
