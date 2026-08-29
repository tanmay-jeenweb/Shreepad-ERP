const db = require('../config/db.js');

// ─── Table Creation ───────────────────────────────────────────────────────────

const createPurchaseOrderTables = async () => {
    const createPOHeaderQuery = `
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            po_number           VARCHAR(50) NOT NULL UNIQUE,
            name                VARCHAR(255) NOT NULL,
            po_date             DATE NOT NULL,
            address             TEXT,
            gstin               VARCHAR(50),
            purchase_type       VARCHAR(100),
            state               VARCHAR(100),
            state_code          VARCHAR(20),
            transportation_mode VARCHAR(100),
            vehicle_number      VARCHAR(100),
            revision_no         INT DEFAULT 0,
            total_amount        DECIMAL(15,2) DEFAULT 0,
            tc_id               INT,
            tc_description      TEXT,
            vendor_id           INT,
            added_by            INT NOT NULL,
            device_id           VARCHAR(255),
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (tc_id) REFERENCES terms_and_conditions(id) ON DELETE SET NULL,
            FOREIGN KEY (vendor_id) REFERENCES vendor_master(id) ON DELETE SET NULL
        )
    `;

    const createPOItemsQuery = `
        CREATE TABLE IF NOT EXISTS purchase_order_items (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            po_id           INT NOT NULL,
            material_id     INT,
            material_name   VARCHAR(255),
            grade           VARCHAR(100),
            hsn_code        VARCHAR(50),
            unit            VARCHAR(50),
            quantity        DECIMAL(15,4) DEFAULT 0,
            rate            DECIMAL(15,4) DEFAULT 0,
            amount          DECIMAL(15,2) DEFAULT 0,
            discount_percent DECIMAL(5,2) DEFAULT 0,
            taxable_amount  DECIMAL(15,2) DEFAULT 0,
            cgst_percent    DECIMAL(5,2) DEFAULT 0,
            cgst_amount     DECIMAL(15,2) DEFAULT 0,
            sgst_percent    DECIMAL(5,2) DEFAULT 0,
            sgst_amount     DECIMAL(15,2) DEFAULT 0,
            igst_percent    DECIMAL(5,2) DEFAULT 0,
            igst_amount     DECIMAL(15,2) DEFAULT 0,
            total_amount    DECIMAL(15,2) DEFAULT 0,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
        )
    `;

    await db.execute(createPOHeaderQuery);
    await db.execute(createPOItemsQuery);
    console.log('Purchase order tables ready');
};

// ─── Ensure Columns (migration for existing installs) ────────────────────────

const ensurePurchaseOrderColumns = async () => {
    const columnsToEnsure = [
        { name: 'tc_id', query: `ALTER TABLE purchase_orders ADD COLUMN tc_id INT, ADD CONSTRAINT fk_po_tc FOREIGN KEY (tc_id) REFERENCES terms_and_conditions(id) ON DELETE SET NULL` },
        { name: 'tc_description', query: `ALTER TABLE purchase_orders ADD COLUMN tc_description TEXT` },
        { name: 'status', query: `ALTER TABLE purchase_orders ADD COLUMN status VARCHAR(20) DEFAULT 'pending'` },
        { name: 'rejection_reason', query: `ALTER TABLE purchase_orders ADD COLUMN rejection_reason TEXT DEFAULT NULL` },
        { name: 'vendor_id', query: `ALTER TABLE purchase_orders ADD COLUMN vendor_id INT DEFAULT NULL, ADD CONSTRAINT fk_po_vendor FOREIGN KEY (vendor_id) REFERENCES vendor_master(id) ON DELETE SET NULL` },
    ];
    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to purchase_orders`);
        }
    }
};

const ensurePurchaseOrderItemsColumns = async () => {
    const columnsToEnsure = [
        { name: 'grade', query: `ALTER TABLE purchase_order_items ADD COLUMN grade VARCHAR(100)` },
    ];
    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to purchase_order_items`);
        }
    }
};

// ─── Helper: safely parse an integer FK id ────────────────────────────────────
// Returns an integer if valid and > 0, otherwise null.
const toIntOrNull = (v) => {
    if (v === null || v === undefined || v === '' || v === false) return null;
    const parsed = parseInt(v, 10);
    return (!isNaN(parsed) && parsed > 0) ? parsed : null;
};

// ─── PO Number Generation ─────────────────────────────────────────────────────

const generatePONumber = async () => {
    const year = new Date().getFullYear();
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS cnt FROM purchase_orders WHERE po_number LIKE ?`,
        [`PO-${year}-%`]
    );
    const seq = (rows[0].cnt || 0) + 1;
    return `PO-${year}-${String(seq).padStart(4, '0')}`;
};

// ─── Create ───────────────────────────────────────────────────────────────────

const createPurchaseOrder = async (headerData, itemsData, addedBy, deviceId) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const poNumber = await generatePONumber();

        const insertPOQuery = `
            INSERT INTO purchase_orders
                (po_number, name, po_date, address, gstin, purchase_type, state, state_code,
                 transportation_mode, vehicle_number, revision_no, total_amount, tc_id, tc_description, added_by, device_id, status, vendor_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `;
        const [poResult] = await connection.execute(insertPOQuery, [
            poNumber,
            headerData.name,
            headerData.po_date,
            headerData.address || null,
            headerData.gstin || null,
            headerData.purchase_type || null,
            headerData.state || null,
            headerData.state_code || null,
            headerData.transportation_mode || null,
            headerData.vehicle_number || null,
            headerData.revision_no || 0,
            headerData.total_amount || 0,
            headerData.tc_id || null,
            headerData.tc_description || null,
            addedBy,
            deviceId,
            toIntOrNull(headerData.vendor_id)
        ]);

        const poId = poResult.insertId;

        if (itemsData && itemsData.length > 0) {
            const insertItemQuery = `
                INSERT INTO purchase_order_items
                    (po_id, material_id, material_name, grade, hsn_code, unit, quantity, rate, amount,
                     discount_percent, taxable_amount, cgst_percent, cgst_amount, sgst_percent, sgst_amount,
                     igst_percent, igst_amount, total_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            for (const item of itemsData) {
                let validMatId = toIntOrNull(item.material_id);
                if (validMatId) {
                    const [matRows] = await connection.execute('SELECT id FROM materials WHERE id = ?', [validMatId]);
                    if (matRows.length === 0) validMatId = null;
                }

                await connection.execute(insertItemQuery, [
                    poId,
                    validMatId,
                    item.material_name || null,
                    item.grade || null,
                    item.hsn_code || null,
                    item.unit || null,
                    item.quantity || 0,
                    item.rate || 0,
                    item.amount || 0,
                    item.discount_percent || 0,
                    item.taxable_amount || 0,
                    item.cgst_percent || 0,
                    item.cgst_amount || 0,
                    item.sgst_percent || 0,
                    item.sgst_amount || 0,
                    item.igst_percent || 0,
                    item.igst_amount || 0,
                    item.total_amount || 0,
                ]);
            }
        }

        await connection.commit();
        return { poId, poNumber };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// ─── Get All ──────────────────────────────────────────────────────────────────

const getAllPurchaseOrders = async () => {
    const query = `
        SELECT
            po.id,
            po.po_number,
            po.name,
            po.vendor_id,
            po.po_date,
            po.address,
            po.gstin,
            po.purchase_type,
            po.state,
            po.state_code,
            po.transportation_mode,
            po.vehicle_number,
            po.revision_no,
            po.total_amount,
            po.tc_id,
            po.tc_description,
            po.rejection_reason,
            tc.name AS tc_name,
            po.created_at,
            po.updated_at,
            COALESCE(usr.name, 'Unknown') AS added_by_name,
            CASE 
                WHEN po.status = 'approved' AND NOT EXISTS (
                    SELECT 1 
                    FROM purchase_order_items poi
                    LEFT JOIN (
                         SELECT g.po_id, gi.material_id, SUM(gi.received_quantity - COALESCE(rep.replaced_qty, 0)) AS total_received
                         FROM grn_items gi
                         JOIN grn_master g ON gi.grn_id = g.id
                         LEFT JOIN (
                             SELECT qi.grn_item_id, SUM(qi.rejected_quantity) AS replaced_qty
                             FROM qc_items qi
                             JOIN qc_master q ON qi.qc_id = q.id
                             WHERE qi.rejection_type = 'replace'
                             GROUP BY qi.grn_item_id
                         ) rep ON gi.id = rep.grn_item_id
                         GROUP BY g.po_id, gi.material_id
                     ) rec ON rec.po_id = po.id AND poi.material_id = rec.material_id
                     WHERE poi.po_id = po.id
                       AND poi.quantity > COALESCE(rec.total_received, 0)
                ) AND EXISTS (
                    SELECT 1 FROM purchase_order_items WHERE po_id = po.id
                ) THEN 'closed'
                ELSE po.status
            END AS status
        FROM purchase_orders po
        LEFT JOIN users usr ON po.added_by = usr.id
        LEFT JOIN terms_and_conditions tc ON po.tc_id = tc.id
        ORDER BY po.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

// ─── Get By ID ────────────────────────────────────────────────────────────────

const getPurchaseOrderById = async (id) => {
    const [poRows] = await db.execute(
        `SELECT po.*, COALESCE(usr.name, 'Unknown') AS added_by_name
         FROM purchase_orders po
         LEFT JOIN users usr ON po.added_by = usr.id
         WHERE po.id = ?`,
        [id]
    );
    if (poRows.length === 0) return null;
    const po = poRows[0];

    const [items] = await db.execute(
        `SELECT 
            poi.*,
            COALESCE(rec.total_received, 0) AS already_received
         FROM purchase_order_items poi
         LEFT JOIN (
             SELECT gi.material_id, SUM(gi.received_quantity - COALESCE(rep.replaced_qty, 0)) AS total_received
             FROM grn_items gi
             JOIN grn_master g ON gi.grn_id = g.id
             LEFT JOIN (
                 SELECT qi.grn_item_id, SUM(qi.rejected_quantity) AS replaced_qty
                 FROM qc_items qi
                 JOIN qc_master q ON qi.qc_id = q.id
                 WHERE qi.rejection_type = 'replace'
                 GROUP BY qi.grn_item_id
             ) rep ON gi.id = rep.grn_item_id
             WHERE g.po_id = ?
             GROUP BY gi.material_id
         ) rec ON poi.material_id = rec.material_id
         WHERE poi.po_id = ? 
         ORDER BY poi.id ASC`,
        [id, id]
    );
    po.items = items;
    if (po.status === 'approved' && items.length > 0) {
        const isFullyReceived = items.every(item => parseFloat(item.already_received) >= parseFloat(item.quantity));
        if (isFullyReceived) {
            po.status = 'closed';
        }
    }
    return po;
};

// ─── Update ───────────────────────────────────────────────────────────────────

const updatePurchaseOrder = async (id, headerData, itemsData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Fetch current PO to determine revision increment
        const [currentPORows] = await connection.execute(
            `SELECT status, revision_no FROM purchase_orders WHERE id = ?`,
            [id]
        );

        if (currentPORows.length === 0) {
            throw new Error("Purchase order not found");
        }

        const currentPO = currentPORows[0];
        let nextRevisionNo = currentPO.revision_no || 0;

        // Auto-increment revision if the PO was previously approved or rejected
        if (currentPO.status === 'approved' || currentPO.status === 'rejected') {
            nextRevisionNo += 1;
        }

        const updatePOQuery = `
            UPDATE purchase_orders SET
                name                = ?,
                po_date             = ?,
                address             = ?,
                gstin               = ?,
                purchase_type       = ?,
                state               = ?,
                state_code          = ?,
                transportation_mode = ?,
                vehicle_number      = ?,
                revision_no         = ?,
                total_amount        = ?,
                tc_id               = ?,
                tc_description      = ?,
                status              = 'pending',
                rejection_reason    = NULL,
                vendor_id           = ?
            WHERE id = ?
        `;
        await connection.execute(updatePOQuery, [
            headerData.name,
            headerData.po_date,
            headerData.address || null,
            headerData.gstin || null,
            headerData.purchase_type || null,
            headerData.state || null,
            headerData.state_code || null,
            headerData.transportation_mode || null,
            headerData.vehicle_number || null,
            nextRevisionNo,
            headerData.total_amount || 0,
            toIntOrNull(headerData.tc_id),
            headerData.tc_description || null,
            toIntOrNull(headerData.vendor_id),
            id
        ]);

        // Replace items
        await connection.execute(`DELETE FROM purchase_order_items WHERE po_id = ?`, [id]);

        if (itemsData && itemsData.length > 0) {
            const insertItemQuery = `
                INSERT INTO purchase_order_items
                    (po_id, material_id, material_name, grade, hsn_code, unit, quantity, rate, amount,
                     discount_percent, taxable_amount, cgst_percent, cgst_amount, sgst_percent, sgst_amount,
                     igst_percent, igst_amount, total_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            for (const item of itemsData) {
                let validMatId = toIntOrNull(item.material_id);
                if (validMatId) {
                    const [matRows] = await connection.execute('SELECT id FROM materials WHERE id = ?', [validMatId]);
                    if (matRows.length === 0) validMatId = null;
                }

                await connection.execute(insertItemQuery, [
                    id,
                    validMatId,
                    item.material_name || null,
                    item.grade || null,
                    item.hsn_code || null,
                    item.unit || null,
                    item.quantity || 0,
                    item.rate || 0,
                    item.amount || 0,
                    item.discount_percent || 0,
                    item.taxable_amount || 0,
                    item.cgst_percent || 0,
                    item.cgst_amount || 0,
                    item.sgst_percent || 0,
                    item.sgst_amount || 0,
                    item.igst_percent || 0,
                    item.igst_amount || 0,
                    item.total_amount || 0,
                ]);
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

// ─── Delete ───────────────────────────────────────────────────────────────────

const deletePurchaseOrder = async (id) => {
    const [result] = await db.execute(`DELETE FROM purchase_orders WHERE id = ?`, [id]);
    return result;
};

// ─── Get distinct material types from materials table ─────────────────────────

const getDistinctMaterialTypes = async () => {
    const [rows] = await db.execute(
        `SELECT DISTINCT material_type FROM materials WHERE material_type IS NOT NULL AND material_type != '' ORDER BY material_type ASC`
    );
    return rows.map(r => r.material_type);
};

// ─── Get materials filtered by type ──────────────────────────────────────────

const getMaterialsByType = async (materialType) => {
    const [rows] = await db.execute(
        `SELECT m.id, m.material_name, m.material_code, m.hsn_code, u.unit_name, m.gst_percent
         FROM materials m
         LEFT JOIN units u ON m.unit_id = u.id
         WHERE m.material_type = ? AND (m.active = 1 OR m.active IS NULL)
         ORDER BY m.material_name ASC`,
        [materialType]
    );
    return rows;
};

// ─── Revise and Reset ─────────────────────────────────────────────────────────

const reviseAndResetPurchaseOrder = async (id) => {
    const [result] = await db.execute(`UPDATE purchase_orders SET status = 'pending', rejection_reason = NULL, revision_no = revision_no + 1 WHERE id = ?`, [id]);
    return result;
};

// ─── Revise Purchase Order (New Entry) ────────────────────────────────────────

const revisePurchaseOrder = async (originalId, headerData, itemsData, addedBy, deviceId) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Fetch current PO
        const [currentPORows] = await connection.execute(
            `SELECT po_number, revision_no FROM purchase_orders WHERE id = ?`,
            [originalId]
        );

        if (currentPORows.length === 0) {
            throw new Error("Purchase order not found");
        }

        const currentPO = currentPORows[0];

        // 2. Determine base PO number and new suffix
        let basePoNumber = currentPO.po_number;
        // Check if it already ends with -XXX
        const suffixMatch = currentPO.po_number.match(/-(\d{3})$/);
        if (suffixMatch) {
            basePoNumber = currentPO.po_number.substring(0, currentPO.po_number.lastIndexOf('-'));
        }

        // 3. Count existing revisions for this base PO to generate the next suffix
        const [revisionRows] = await connection.execute(
            `SELECT COUNT(*) AS cnt FROM purchase_orders WHERE po_number LIKE ? AND po_number != ?`,
            [`${basePoNumber}-%`, basePoNumber]
        );
        const nextSuffixSeq = (revisionRows[0].cnt || 0) + 1;
        const newPoNumber = `${basePoNumber}-${String(nextSuffixSeq).padStart(3, '0')}`;

        const nextRevisionNo = (currentPO.revision_no || 0) + 1;

        // 4. Insert new PO
        const insertPOQuery = `
            INSERT INTO purchase_orders
                (po_number, name, po_date, address, gstin, purchase_type, state, state_code,
                 transportation_mode, vehicle_number, revision_no, total_amount, tc_id, tc_description, added_by, device_id, status, vendor_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `;
        const [poResult] = await connection.execute(insertPOQuery, [
            newPoNumber,
            headerData.name,
            headerData.po_date,
            headerData.address || null,
            headerData.gstin || null,
            headerData.purchase_type || null,
            headerData.state || null,
            headerData.state_code || null,
            headerData.transportation_mode || null,
            headerData.vehicle_number || null,
            nextRevisionNo,
            headerData.total_amount || 0,
            toIntOrNull(headerData.tc_id),
            headerData.tc_description || null,
            addedBy,
            deviceId,
            toIntOrNull(headerData.vendor_id)
        ]);

        const poId = poResult.insertId;

        // 5. Insert items
        if (itemsData && itemsData.length > 0) {
            const insertItemQuery = `
                INSERT INTO purchase_order_items
                    (po_id, material_id, material_name, grade, hsn_code, unit, quantity, rate, amount,
                     discount_percent, taxable_amount, cgst_percent, cgst_amount, sgst_percent, sgst_amount,
                     igst_percent, igst_amount, total_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            for (const item of itemsData) {
                let validMatId = toIntOrNull(item.material_id);
                if (validMatId) {
                    const [matRows] = await connection.execute('SELECT id FROM materials WHERE id = ?', [validMatId]);
                    if (matRows.length === 0) validMatId = null;
                }

                await connection.execute(insertItemQuery, [
                    poId,
                    validMatId,
                    item.material_name || null,
                    item.grade || null,
                    item.hsn_code || null,
                    item.unit || null,
                    item.quantity || 0,
                    item.rate || 0,
                    item.amount || 0,
                    item.discount_percent || 0,
                    item.taxable_amount || 0,
                    item.cgst_percent || 0,
                    item.cgst_amount || 0,
                    item.sgst_percent || 0,
                    item.sgst_amount || 0,
                    item.igst_percent || 0,
                    item.igst_amount || 0,
                    item.total_amount || 0,
                ]);
            }
        }

        await connection.commit();
        return { poId, poNumber: newPoNumber };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createPurchaseOrderTables,
    ensurePurchaseOrderColumns,
    ensurePurchaseOrderItemsColumns,
    createPurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder,
    getDistinctMaterialTypes,
    getMaterialsByType,
    reviseAndResetPurchaseOrder,
    revisePurchaseOrder,
};
