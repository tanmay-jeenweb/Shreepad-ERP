const db = require('../config/db.js');
const { getSettings } = require('./settingMasterModel.js');
const { getNextSequence } = require('./batchSequenceModel.js');
const { upsertStockStatus } = require('./stockStatusModel.js');

// ─── Table Creation ───────────────────────────────────────────────────────────

const createGrnTables = async () => {
    const createGrnMasterQuery = `
        CREATE TABLE IF NOT EXISTS grn_master (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            grn_number          VARCHAR(50) NOT NULL UNIQUE,
            grn_date            DATE NOT NULL,
            po_id               INT DEFAULT NULL,
            po_number           VARCHAR(50) DEFAULT NULL,
            vendor_id           INT DEFAULT NULL,
            name                VARCHAR(255) NOT NULL,
            address             TEXT,
            gstin               VARCHAR(50),
            purchase_type       VARCHAR(100),
            state               VARCHAR(100),
            state_code          VARCHAR(20),
            job_party_id        INT DEFAULT NULL,
            job_party_name      VARCHAR(150),
            transportation_mode VARCHAR(100),
            vehicle_number      VARCHAR(100),
            invoice_number      VARCHAR(100),
            invoice_date        DATE DEFAULT NULL,
            challan_number      VARCHAR(100),
            challan_date        DATE DEFAULT NULL,
            total_amount        DECIMAL(15,2) DEFAULT 0,
            tc_id               INT DEFAULT NULL,
            tc_description      TEXT,
            status              VARCHAR(20) DEFAULT 'received',
            added_by            INT NOT NULL,
            device_id           VARCHAR(255),
            location_id         INT DEFAULT NULL,
            location_name       VARCHAR(255) DEFAULT NULL,
            total_quantity      DECIMAL(15,4) DEFAULT 0,
            bag_size            VARCHAR(50) DEFAULT NULL,
            number_of_bags      INT DEFAULT NULL,
            remarks             TEXT DEFAULT NULL,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (po_id)       REFERENCES purchase_orders(id)         ON DELETE SET NULL,
            FOREIGN KEY (vendor_id)   REFERENCES vendor_master(id)           ON DELETE SET NULL,
            FOREIGN KEY (job_party_id) REFERENCES job_parties(id)            ON DELETE SET NULL,
            FOREIGN KEY (tc_id)       REFERENCES terms_and_conditions(id)    ON DELETE SET NULL,
            FOREIGN KEY (added_by)    REFERENCES users(id)                   ON DELETE CASCADE,
            FOREIGN KEY (location_id) REFERENCES locations(id)              ON DELETE SET NULL
        )
    `;

    const createGrnItemsQuery = `
        CREATE TABLE IF NOT EXISTS grn_items (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            grn_id              INT NOT NULL,
            material_id         INT DEFAULT NULL,
            material_name       VARCHAR(255),
            grade               VARCHAR(100),
            hsn_code            VARCHAR(50),
            unit                VARCHAR(50),
            ordered_quantity    DECIMAL(15,4) DEFAULT 0,
            received_quantity   DECIMAL(15,4) DEFAULT 0,
            rate                DECIMAL(15,4) DEFAULT 0,
            amount              DECIMAL(15,2) DEFAULT 0,
            discount_percent    DECIMAL(5,2)  DEFAULT 0,
            taxable_amount      DECIMAL(15,2) DEFAULT 0,
            cgst_percent        DECIMAL(5,2)  DEFAULT 0,
            cgst_amount         DECIMAL(15,2) DEFAULT 0,
            sgst_percent        DECIMAL(5,2)  DEFAULT 0,
            sgst_amount         DECIMAL(15,2) DEFAULT 0,
            igst_percent        DECIMAL(5,2)  DEFAULT 0,
            igst_amount         DECIMAL(15,2) DEFAULT 0,
            total_amount        DECIMAL(15,2) DEFAULT 0,
            supplier_batch_number VARCHAR(100) DEFAULT NULL,
            internal_batch_number VARCHAR(100) DEFAULT NULL,
            number_of_bags      INT DEFAULT 0,
            kgs_per_bag         DECIMAL(15,4) DEFAULT 0,
            total_kg            DECIMAL(15,4) DEFAULT 0,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (grn_id)      REFERENCES grn_master(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id)  ON DELETE SET NULL
        )
    `;

    await db.execute(createGrnMasterQuery);
    await db.execute(createGrnItemsQuery);
    console.log('GRN tables ready');
};

const ensureGrnColumns = async () => {
    const columnsToEnsure = [
        { name: 'location_id', query: `ALTER TABLE grn_master ADD COLUMN location_id INT DEFAULT NULL, ADD CONSTRAINT fk_grn_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL` },
        { name: 'location_name', query: `ALTER TABLE grn_master ADD COLUMN location_name VARCHAR(255) DEFAULT NULL` },
        { name: 'total_quantity', query: `ALTER TABLE grn_master ADD COLUMN total_quantity DECIMAL(15,4) DEFAULT 0` },
        { name: 'bag_size', query: `ALTER TABLE grn_master ADD COLUMN bag_size VARCHAR(50) DEFAULT NULL` },
        { name: 'number_of_bags', query: `ALTER TABLE grn_master ADD COLUMN number_of_bags INT DEFAULT NULL` },
        { name: 'remarks', query: `ALTER TABLE grn_master ADD COLUMN remarks TEXT DEFAULT NULL` },
    ];
    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grn_master' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to grn_master`);
        }
    }
};

const ensureGrnItemsColumns = async () => {
    const columnsToEnsure = [
        { name: 'supplier_batch_number', query: `ALTER TABLE grn_items ADD COLUMN supplier_batch_number VARCHAR(100) DEFAULT NULL` },
        { name: 'internal_batch_number', query: `ALTER TABLE grn_items ADD COLUMN internal_batch_number VARCHAR(100) DEFAULT NULL` },
        { name: 'number_of_bags', query: `ALTER TABLE grn_items ADD COLUMN number_of_bags INT DEFAULT 0` },
        { name: 'kgs_per_bag', query: `ALTER TABLE grn_items ADD COLUMN kgs_per_bag DECIMAL(15,4) DEFAULT 0` },
        { name: 'total_kg', query: `ALTER TABLE grn_items ADD COLUMN total_kg DECIMAL(15,4) DEFAULT 0` },
    ];
    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grn_items' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to grn_items`);
        }
    }
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const toIntOrNull = (v) => {
    if (v === null || v === undefined || v === '' || v === false) return null;
    const parsed = parseInt(v, 10);
    return (!isNaN(parsed) && parsed > 0) ? parsed : null;
};

const toDateOrNull = (v) => {
    if (!v) return null;
    return v;
};

// ─── GRN Number Generation ────────────────────────────────────────────────────

const generateGrnNumber = async () => {
    const year = new Date().getFullYear();
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS cnt FROM grn_master WHERE grn_number LIKE ?`,
        [`GRN-${year}-%`]
    );
    const seq = (rows[0].cnt || 0) + 1;
    return `GRN-${year}-${String(seq).padStart(4, '0')}`;
};

// ─── Batch Number Generation ──────────────────────────────────────────────────

const mapMaterialTypeToPrefixKey = (type) => {
    switch (type) {
        case 'Finished Goods': return 'prefix_finished_goods';
        case 'Semi Finished Goods': return 'prefix_semi_finished_goods';
        case 'Raw Materials': return 'prefix_raw_materials';
        case 'Store Consumed': return 'prefix_store_consumed';
        case 'Packaging Material': return 'prefix_packaging_material';
        case 'Waste and scrap': return 'prefix_waste_and_scrap';
        case 'Capital Equipment': return 'prefix_capital_equipment';
        case 'Assembly Item': return 'prefix_assembly_item';
        case 'Uniform and other Item': return 'prefix_uniform_and_other';
        case 'Service': return 'prefix_service';
        case 'Other': return 'prefix_other';
        default: return 'prefix_other';
    }
};

const generateInternalBatchNumber = async (connection, materialId, settings) => {
    if (!materialId) return null;
    const [matRows] = await connection.execute('SELECT code, material_type FROM materials WHERE id = ?', [materialId]);
    if (matRows.length === 0) return null;
    const mat = matRows[0];
    if (!mat.code) return null; // No code, no batch number

    const prefixKey = mapMaterialTypeToPrefixKey(mat.material_type);
    const prefix = settings ? (settings[prefixKey] || 'OTH') : 'OTH';

    const year = (settings && settings.batch_year) ? settings.batch_year : new Date().getFullYear().toString().slice(-2);

    const seq = await getNextSequence(connection, mat.code, year);

    return `${prefix}${mat.code}${year}${String(seq).padStart(4, '0')}`;
};

// ─── Create ───────────────────────────────────────────────────────────────────

const createGrn = async (headerData, itemsData, addedBy, deviceId) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const poId = toIntOrNull(headerData.po_id);
        if (poId) {
            for (const item of itemsData) {
                const matId = toIntOrNull(item.material_id);
                if (matId) {
                    const [poItemRows] = await connection.execute(
                        `SELECT quantity FROM purchase_order_items WHERE po_id = ? AND material_id = ?`,
                        [poId, matId]
                    );
                    const orderedQty = poItemRows.length > 0 ? parseFloat(poItemRows[0].quantity || 0) : 0;

                    const [receivedRows] = await connection.execute(
                        `SELECT SUM(gi.received_quantity - COALESCE(rep.replaced_qty, 0)) AS total_received 
                         FROM grn_items gi 
                         JOIN grn_master g ON gi.grn_id = g.id 
                         LEFT JOIN (
                             SELECT qi.grn_item_id, SUM(qi.rejected_quantity) AS replaced_qty
                             FROM qc_items qi
                             JOIN qc_master q ON qi.qc_id = q.id
                             WHERE qi.rejection_type = 'replace'
                             GROUP BY qi.grn_item_id
                         ) rep ON gi.id = rep.grn_item_id
                         WHERE g.po_id = ? AND gi.material_id = ?`,
                        [poId, matId]
                    );
                    const alreadyReceived = receivedRows.length > 0 ? parseFloat(receivedRows[0].total_received || 0) : 0;

                    const pendingQty = Math.max(0, orderedQty - alreadyReceived);
                    const receivedQty = parseFloat(item.received_quantity || 0);

                    if (receivedQty > pendingQty) {
                        throw new Error(`Received quantity (${receivedQty}) for material ID ${matId} exceeds the pending quantity (${pendingQty}) of the Purchase Order.`);
                    }
                }
            }
        }

        const grnNumber = await generateGrnNumber();

        let status = headerData.status;
        if (!status || status === 'received' || status === 'partially_received' || status === 'closed') {
            status = 'closed';
            if (itemsData && itemsData.length > 0) {
                const hasPartial = itemsData.some(item => {
                    const ordered = parseFloat(item.ordered_quantity || 0);
                    const received = parseFloat(item.received_quantity || 0);
                    return ordered > 0 && received < ordered;
                });
                if (hasPartial) {
                    status = 'partially_received';
                }
            }
        }

        const insertGrnQuery = `
            INSERT INTO grn_master
                (grn_number, grn_date, po_id, po_number, vendor_id, name, address, gstin,
                 purchase_type, state, state_code, job_party_id, job_party_name,
                 transportation_mode, vehicle_number, invoice_number, invoice_date,
                 challan_number, challan_date, total_amount, tc_id, tc_description,
                 status, added_by, device_id, location_id, location_name, total_quantity,
                 bag_size, number_of_bags, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [grnResult] = await connection.execute(insertGrnQuery, [
            grnNumber,
            headerData.grn_date,
            toIntOrNull(headerData.po_id),
            headerData.po_number || null,
            toIntOrNull(headerData.vendor_id),
            headerData.name,
            headerData.address || null,
            headerData.gstin || null,
            headerData.purchase_type || null,
            headerData.state || null,
            headerData.state_code || null,
            toIntOrNull(headerData.job_party_id),
            headerData.job_party_name || null,
            headerData.transportation_mode || null,
            headerData.vehicle_number || null,
            headerData.invoice_number || null,
            toDateOrNull(headerData.invoice_date),
            headerData.challan_number || null,
            toDateOrNull(headerData.challan_date),
            headerData.total_amount || 0,
            toIntOrNull(headerData.tc_id),
            headerData.tc_description || null,
            status,
            addedBy,
            deviceId,
            toIntOrNull(headerData.location_id),
            headerData.location_name || null,
            0,
            null,
            0,
            headerData.remarks || null,
        ]);

        const grnId = grnResult.insertId;

        // Fetch settings once before inserting items
        const settings = await getSettings();

        if (itemsData && itemsData.length > 0) {
            const insertItemQuery = `
                INSERT INTO grn_items
                    (grn_id, material_id, material_name, grade, hsn_code, unit,
                     ordered_quantity, received_quantity, rate, amount, discount_percent,
                     taxable_amount, cgst_percent, cgst_amount, sgst_percent, sgst_amount,
                     igst_percent, igst_amount, total_amount, supplier_batch_number, internal_batch_number, number_of_bags, kgs_per_bag, total_kg)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            for (const item of itemsData) {
                let validMatId = toIntOrNull(item.material_id);
                if (validMatId) {
                    const [matRows] = await connection.execute('SELECT id FROM materials WHERE id = ?', [validMatId]);
                    if (matRows.length === 0) validMatId = null;
                }

                let internalBatchNumber = null;
                if (validMatId) {
                    internalBatchNumber = await generateInternalBatchNumber(connection, validMatId, settings);
                }

                await connection.execute(insertItemQuery, [
                    grnId,
                    validMatId,
                    item.material_name || null,
                    item.grade || null,
                    item.hsn_code || null,
                    item.unit || null,
                    item.ordered_quantity || 0,
                    item.received_quantity || 0,
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
                    item.supplier_batch_number || null,
                    internalBatchNumber,
                    toIntOrNull(item.number_of_bags) || 0,
                    parseFloat(item.kgs_per_bag) || 0,
                    parseFloat(item.total_kg) || 0,
                ]);

                // Upsert stock status record
                await upsertStockStatus(connection, grnId, {
                    ...item,
                    internal_batch_number: internalBatchNumber,
                    material_id: validMatId,
                }, headerData);
            }
        }

        await connection.commit();
        return { grnId, grnNumber };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// ─── Get All ──────────────────────────────────────────────────────────────────

const getAllGrns = async () => {
    const query = `
        SELECT
            g.id,
            g.grn_number,
            g.grn_date,
            g.po_id,
            g.po_number,
            g.vendor_id,
            g.name,
            g.purchase_type,
            g.state,
            g.total_amount,
            g.status,
            g.invoice_number,
            g.invoice_date,
            g.challan_number,
            g.job_party_name,
            g.location_id,
            g.location_name,
            g.total_quantity,
            g.bag_size,
            g.number_of_bags,
            g.remarks,
            g.created_at,
            g.updated_at,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM grn_master g
        LEFT JOIN users u ON g.added_by = u.id
        ORDER BY g.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

// ─── Get By ID ────────────────────────────────────────────────────────────────

const getGrnById = async (id) => {
    const [grnRows] = await db.execute(
        `SELECT g.*, COALESCE(u.name, 'Unknown') AS added_by_name
         FROM grn_master g
         LEFT JOIN users u ON g.added_by = u.id
         WHERE g.id = ?`,
        [id]
    );
    if (grnRows.length === 0) return null;
    const grn = grnRows[0];

    let items;
    if (grn.po_id) {
        [items] = await db.execute(
            `SELECT 
                gi.*,
                COALESCE(rec.total_received, 0) AS already_received
             FROM grn_items gi
              LEFT JOIN (
                  SELECT gi2.material_id, SUM(gi2.received_quantity - COALESCE(rep.replaced_qty, 0)) AS total_received
                  FROM grn_items gi2
                  JOIN grn_master g2 ON gi2.grn_id = g2.id
                  LEFT JOIN (
                      SELECT qi.grn_item_id, SUM(qi.rejected_quantity) AS replaced_qty
                      FROM qc_items qi
                      JOIN qc_master q ON qi.qc_id = q.id
                      WHERE qi.rejection_type = 'replace'
                      GROUP BY qi.grn_item_id
                  ) rep ON gi2.id = rep.grn_item_id
                  WHERE g2.po_id = ? AND g2.id != ?
                  GROUP BY gi2.material_id
              ) rec ON gi.material_id = rec.material_id
              WHERE gi.grn_id = ? 
              ORDER BY gi.id ASC`,
            [grn.po_id, id, id]
        );
    } else {
        [items] = await db.execute(
            `SELECT *, 0 AS already_received FROM grn_items WHERE grn_id = ? ORDER BY id ASC`,
            [id]
        );
    }
    grn.items = items;
    return grn;
};

// ─── Update ───────────────────────────────────────────────────────────────────

const updateGrn = async (id, headerData, itemsData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const poId = toIntOrNull(headerData.po_id);
        if (poId) {
            for (const item of itemsData) {
                const matId = toIntOrNull(item.material_id);
                if (matId) {
                    const [poItemRows] = await connection.execute(
                        `SELECT quantity FROM purchase_order_items WHERE po_id = ? AND material_id = ?`,
                        [poId, matId]
                    );
                    const orderedQty = poItemRows.length > 0 ? parseFloat(poItemRows[0].quantity || 0) : 0;

                    const [receivedRows] = await connection.execute(
                        `SELECT SUM(gi.received_quantity - COALESCE(rep.replaced_qty, 0)) AS total_received 
                         FROM grn_items gi 
                         JOIN grn_master g ON gi.grn_id = g.id 
                         LEFT JOIN (
                             SELECT qi.grn_item_id, SUM(qi.rejected_quantity) AS replaced_qty
                             FROM qc_items qi
                             JOIN qc_master q ON qi.qc_id = q.id
                             WHERE qi.rejection_type = 'replace'
                             GROUP BY qi.grn_item_id
                         ) rep ON gi.id = rep.grn_item_id
                         WHERE g.po_id = ? AND gi.material_id = ? AND g.id != ?`,
                        [poId, matId, id]
                    );
                    const alreadyReceived = receivedRows.length > 0 ? parseFloat(receivedRows[0].total_received || 0) : 0;

                    const pendingQty = Math.max(0, orderedQty - alreadyReceived);
                    const receivedQty = parseFloat(item.received_quantity || 0);

                    if (receivedQty > pendingQty) {
                        throw new Error(`Received quantity (${receivedQty}) for material ID ${matId} exceeds the pending quantity (${pendingQty}) of the Purchase Order.`);
                    }
                }
            }
        }

        let status = headerData.status;
        if (!status || status === 'received' || status === 'partially_received' || status === 'closed') {
            status = 'closed';
            if (itemsData && itemsData.length > 0) {
                const hasPartial = itemsData.some(item => {
                    const ordered = parseFloat(item.ordered_quantity || 0);
                    const received = parseFloat(item.received_quantity || 0);
                    return ordered > 0 && received < ordered;
                });
                if (hasPartial) {
                    status = 'partially_received';
                }
            }
        }

        const updateGrnQuery = `
            UPDATE grn_master SET
                grn_date            = ?,
                vendor_id           = ?,
                name                = ?,
                address             = ?,
                gstin               = ?,
                purchase_type       = ?,
                state               = ?,
                state_code          = ?,
                job_party_id        = ?,
                job_party_name      = ?,
                transportation_mode = ?,
                vehicle_number      = ?,
                invoice_number      = ?,
                invoice_date        = ?,
                challan_number      = ?,
                challan_date        = ?,
                total_amount        = ?,
                tc_id               = ?,
                tc_description      = ?,
                status              = ?,
                location_id         = ?,
                location_name       = ?,
                remarks             = ?
            WHERE id = ?
        `;

        await connection.execute(updateGrnQuery, [
            headerData.grn_date,
            toIntOrNull(headerData.vendor_id),
            headerData.name,
            headerData.address || null,
            headerData.gstin || null,
            headerData.purchase_type || null,
            headerData.state || null,
            headerData.state_code || null,
            toIntOrNull(headerData.job_party_id),
            headerData.job_party_name || null,
            headerData.transportation_mode || null,
            headerData.vehicle_number || null,
            headerData.invoice_number || null,
            toDateOrNull(headerData.invoice_date),
            headerData.challan_number || null,
            toDateOrNull(headerData.challan_date),
            headerData.total_amount || 0,
            toIntOrNull(headerData.tc_id),
            headerData.tc_description || null,
            status,
            toIntOrNull(headerData.location_id),
            headerData.location_name || null,
            headerData.remarks || null,
            id,
        ]);

        // Keep track of existing items
        const [existingItemsRows] = await connection.execute(`SELECT id FROM grn_items WHERE grn_id = ?`, [id]);
        const existingIds = existingItemsRows.map(row => row.id);
        const payloadIds = itemsData.map(item => item.id).filter(id => id != null);

        const idsToDelete = existingIds.filter(eid => !payloadIds.includes(eid));
        if (idsToDelete.length > 0) {
            const placeholders = idsToDelete.map(() => '?').join(',');
            await connection.execute(`DELETE FROM grn_items WHERE id IN (${placeholders})`, idsToDelete);
        }

        const settings = await getSettings();

        if (itemsData && itemsData.length > 0) {
            const insertItemQuery = `
                INSERT INTO grn_items
                    (grn_id, material_id, material_name, grade, hsn_code, unit,
                     ordered_quantity, received_quantity, rate, amount, discount_percent,
                     taxable_amount, cgst_percent, cgst_amount, sgst_percent, sgst_amount,
                     igst_percent, igst_amount, total_amount, supplier_batch_number, internal_batch_number,
                     number_of_bags, kgs_per_bag, total_kg)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const updateItemQuery = `
                UPDATE grn_items SET
                    material_id = ?, material_name = ?, grade = ?, hsn_code = ?, unit = ?,
                    ordered_quantity = ?, received_quantity = ?, rate = ?, amount = ?, discount_percent = ?,
                    taxable_amount = ?, cgst_percent = ?, cgst_amount = ?, sgst_percent = ?, sgst_amount = ?,
                    igst_percent = ?, igst_amount = ?, total_amount = ?, supplier_batch_number = ?, internal_batch_number = ?,
                    number_of_bags = ?, kgs_per_bag = ?, total_kg = ?
                WHERE id = ?
            `;

            for (const item of itemsData) {
                let validMatId = toIntOrNull(item.material_id);
                if (validMatId) {
                    const [matRows] = await connection.execute('SELECT id FROM materials WHERE id = ?', [validMatId]);
                    if (matRows.length === 0) validMatId = null;
                }

                let internalBatchNumber = item.internal_batch_number || null;
                if (!internalBatchNumber && validMatId && !item.id) {
                    internalBatchNumber = await generateInternalBatchNumber(connection, validMatId, settings);
                }

                if (item.id && existingIds.includes(item.id)) {
                    // Update existing
                    await connection.execute(updateItemQuery, [
                        validMatId,
                        item.material_name || null,
                        item.grade || null,
                        item.hsn_code || null,
                        item.unit || null,
                        item.ordered_quantity || 0,
                        item.received_quantity || 0,
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
                        item.supplier_batch_number || null,
                        internalBatchNumber,
                        toIntOrNull(item.number_of_bags) || 0,
                        parseFloat(item.kgs_per_bag) || 0,
                        parseFloat(item.total_kg) || 0,
                        item.id
                    ]);

                    // Upsert stock status record
                    await upsertStockStatus(connection, id, {
                        ...item,
                        internal_batch_number: internalBatchNumber,
                        material_id: validMatId,
                    }, headerData);
                } else {
                    // Insert new
                    await connection.execute(insertItemQuery, [
                        id,
                        validMatId,
                        item.material_name || null,
                        item.grade || null,
                        item.hsn_code || null,
                        item.unit || null,
                        item.ordered_quantity || 0,
                        item.received_quantity || 0,
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
                        item.supplier_batch_number || null,
                        internalBatchNumber,
                        toIntOrNull(item.number_of_bags) || 0,
                        parseFloat(item.kgs_per_bag) || 0,
                        parseFloat(item.total_kg) || 0,
                    ]);

                    // Upsert stock status record
                    await upsertStockStatus(connection, id, {
                        ...item,
                        internal_batch_number: internalBatchNumber,
                        material_id: validMatId,
                    }, headerData);
                }
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

const deleteGrn = async (id) => {
    const [result] = await db.execute(`DELETE FROM grn_master WHERE id = ?`, [id]);
    return result;
};

const partiallyCloseGrn = async (id) => {
    const [result] = await db.execute(`UPDATE grn_master SET status = 'partially_closed' WHERE id = ?`, [id]);
    return result;
};

// ─── Unified GRN List (GRNs + Approved POs without GRN) ──────────────────────

const getGrnsWithPendingPos = async () => {
    const query = `
        SELECT
            'grn'           AS row_type,
            g.id,
            g.grn_number,
            g.grn_date      AS date,
            g.po_id,
            g.po_number,
            g.vendor_id,
            g.name,
            g.purchase_type,
            g.state,
            g.total_amount,
            g.status,
            g.invoice_number,
            g.invoice_date,
            g.challan_number,
            g.job_party_name,
            g.location_id,
            g.location_name,
            g.total_quantity,
            g.bag_size,
            g.number_of_bags,
            g.remarks,
            g.created_at,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM grn_master g
        LEFT JOIN users u ON g.added_by = u.id

        UNION ALL

        SELECT
            'pending_grn'   AS row_type,
            po.id,
            NULL            AS grn_number,
            po.po_date      AS date,
            po.id           AS po_id,
            po.po_number,
            po.vendor_id,
            po.name,
            po.purchase_type,
            po.state,
            po.total_amount,
            'pending_grn'   AS status,
            NULL            AS invoice_number,
            NULL            AS invoice_date,
            NULL            AS challan_number,
            NULL            AS job_party_name,
            NULL            AS location_id,
            NULL            AS location_name,
            0               AS total_quantity,
            NULL            AS bag_size,
            NULL            AS number_of_bags,
            NULL            AS remarks,
            po.created_at,
            COALESCE(u2.name, 'Unknown') AS added_by_name
        FROM purchase_orders po
        LEFT JOIN users u2 ON po.added_by = u2.id
        WHERE po.status = 'approved'
          AND EXISTS (
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
          )

        ORDER BY date DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const previewNextBatchNumber = async (materialId) => {
    if (!materialId) return null;
    const [matRows] = await db.execute('SELECT code, material_type FROM materials WHERE id = ?', [materialId]);
    if (matRows.length === 0) return null;
    const mat = matRows[0];
    if (!mat.code) return null;

    const { getSettings } = require('./settingMasterModel.js');
    const settings = await getSettings();
    const prefixKey = mapMaterialTypeToPrefixKey(mat.material_type);
    const prefix = settings ? (settings[prefixKey] || 'OTH') : 'OTH';
    const year = (settings && settings.batch_year) ? settings.batch_year : new Date().getFullYear().toString().slice(-2);

    const [seqRows] = await db.execute(
        `SELECT last_sequence FROM batch_number_sequences WHERE material_code = ? AND batch_year = ?`,
        [mat.code, year]
    );
    const lastSeq = seqRows.length > 0 ? seqRows[0].last_sequence : 0;
    const nextSeq = lastSeq + 1;

    return `${prefix}${mat.code}${year}${String(nextSeq).padStart(4, '0')}`;
};

module.exports = {
    createGrnTables,
    ensureGrnColumns,
    ensureGrnItemsColumns,
    createGrn,
    getAllGrns,
    getGrnById,
    updateGrn,
    deleteGrn,
    partiallyCloseGrn,
    getGrnsWithPendingPos,
    previewNextBatchNumber,
};
