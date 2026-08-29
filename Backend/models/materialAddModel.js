const db = require('../config/db.js');
const { getSettings } = require('./settingMasterModel.js');
const { getNextSequence } = require('./batchSequenceModel.js');
const { upsertStockStatusForMa } = require('./stockStatusModel.js');

// ─── Table Creation ───────────────────────────────────────────────────────────

const createMaterialAddTables = async () => {
    const createMasterQuery = `
        CREATE TABLE IF NOT EXISTS material_add_master (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            ma_number           VARCHAR(50) NOT NULL UNIQUE,
            ma_date             DATE NOT NULL,
            job_party_id        INT DEFAULT NULL,
            job_party_name      VARCHAR(150),
            location_id         INT DEFAULT NULL,
            location_name       VARCHAR(255),
            remark              TEXT DEFAULT NULL,
            particular          TEXT DEFAULT NULL,
            status              VARCHAR(20) DEFAULT 'received',
            added_by            INT NOT NULL,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (job_party_id)  REFERENCES job_parties(id)  ON DELETE SET NULL,
            FOREIGN KEY (location_id)   REFERENCES locations(id)    ON DELETE SET NULL,
            FOREIGN KEY (added_by)      REFERENCES users(id)        ON DELETE CASCADE
        )
    `;

    const createItemsQuery = `
        CREATE TABLE IF NOT EXISTS material_add_items (
            id                    INT AUTO_INCREMENT PRIMARY KEY,
            ma_id                 INT NOT NULL,
            material_id           INT DEFAULT NULL,
            material_name         VARCHAR(255),
            material_type         VARCHAR(100),
            grade                 VARCHAR(100),
            unit                  VARCHAR(50),
            quantity              DECIMAL(15,4) DEFAULT 0,
            number_of_bags        INT DEFAULT 0,
            kgs_per_bag           DECIMAL(15,4) DEFAULT 0,
            remaining_kg          DECIMAL(15,4) DEFAULT 0,
            internal_batch_number VARCHAR(100) DEFAULT NULL,
            created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ma_id)        REFERENCES material_add_master(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id)  REFERENCES materials(id)            ON DELETE SET NULL
        )
    `;

    await db.execute(createMasterQuery);
    await db.execute(createItemsQuery);
    console.log('Material Add tables ready');
};

const ensureMaterialAddColumns = async () => {
    // Add future columns here if needed
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const toIntOrNull = (v) => {
    if (v === null || v === undefined || v === '' || v === false) return null;
    const parsed = parseInt(v, 10);
    return (!isNaN(parsed) && parsed > 0) ? parsed : null;
};

// ─── Number Generation ────────────────────────────────────────────────────────

const generateMaNumber = async () => {
    const year = new Date().getFullYear();
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS cnt FROM material_add_master WHERE ma_number LIKE ?`,
        [`MA-${year}-%`]
    );
    const seq = (rows[0].cnt || 0) + 1;
    return `MA-${year}-${String(seq).padStart(4, '0')}`;
};

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

const createMaterialAdd = async (headerData, itemsData, addedBy) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const maNumber = await generateMaNumber();

        const insertMasterQuery = `
            INSERT INTO material_add_master
                (ma_number, ma_date, job_party_id, job_party_name, location_id, location_name, remark, particular, status, added_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [maResult] = await connection.execute(insertMasterQuery, [
            maNumber,
            headerData.ma_date,
            toIntOrNull(headerData.job_party_id),
            headerData.job_party_name || null,
            toIntOrNull(headerData.location_id),
            headerData.location_name || null,
            headerData.remark || null,
            headerData.particular || null,
            headerData.status || 'received',
            addedBy
        ]);

        const maId = maResult.insertId;

        const settings = await getSettings();

        if (itemsData && itemsData.length > 0) {
            const insertItemQuery = `
                INSERT INTO material_add_items
                    (ma_id, material_id, material_name, material_type, grade, unit,
                     quantity, number_of_bags, kgs_per_bag, remaining_kg, internal_batch_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    maId,
                    validMatId,
                    item.material_name || null,
                    item.material_type || null,
                    item.grade || null,
                    item.unit || null,
                    parseFloat(item.quantity) || 0,
                    toIntOrNull(item.number_of_bags) || 0,
                    parseFloat(item.kgs_per_bag) || 0,
                    parseFloat(item.remaining_kg) || 0,
                    internalBatchNumber
                ]);

                // Upsert stock status
                await upsertStockStatusForMa(connection, maId, {
                    ...item,
                    internal_batch_number: internalBatchNumber,
                    material_id: validMatId,
                }, headerData);
            }
        }

        await connection.commit();
        return { maId, maNumber };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// ─── Get All ──────────────────────────────────────────────────────────────────

const getAllMaterialAdds = async () => {
    const query = `
        SELECT
            m.id,
            m.ma_number,
            m.ma_date,
            m.job_party_id,
            m.job_party_name,
            m.location_id,
            m.location_name,
            m.remark,
            m.particular,
            m.status,
            m.created_at,
            m.updated_at,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM material_add_master m
        LEFT JOIN users u ON m.added_by = u.id
        ORDER BY m.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

// ─── Get By ID ────────────────────────────────────────────────────────────────

const getMaterialAddById = async (id) => {
    const [maRows] = await db.execute(
        `SELECT m.*, COALESCE(u.name, 'Unknown') AS added_by_name
         FROM material_add_master m
         LEFT JOIN users u ON m.added_by = u.id
         WHERE m.id = ?`,
        [id]
    );
    if (maRows.length === 0) return null;
    const ma = maRows[0];

    const [items] = await db.execute(
        `SELECT * FROM material_add_items WHERE ma_id = ? ORDER BY id ASC`,
        [id]
    );
    ma.items = items;
    return ma;
};

// ─── Update ───────────────────────────────────────────────────────────────────

const updateMaterialAdd = async (id, headerData, itemsData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const updateMasterQuery = `
            UPDATE material_add_master SET
                ma_date             = ?,
                job_party_id        = ?,
                job_party_name      = ?,
                location_id         = ?,
                location_name       = ?,
                remark              = ?,
                particular          = ?,
                status              = ?
            WHERE id = ?
        `;

        await connection.execute(updateMasterQuery, [
            headerData.ma_date,
            toIntOrNull(headerData.job_party_id),
            headerData.job_party_name || null,
            toIntOrNull(headerData.location_id),
            headerData.location_name || null,
            headerData.remark || null,
            headerData.particular || null,
            headerData.status || 'received',
            id,
        ]);

        // Keep track of existing items
        const [existingItemsRows] = await connection.execute(`SELECT id, internal_batch_number FROM material_add_items WHERE ma_id = ?`, [id]);
        const existingIds = existingItemsRows.map(row => row.id);
        const payloadIds = itemsData.map(item => item.id).filter(itemId => itemId != null);

        const idsToDelete = existingIds.filter(eid => !payloadIds.includes(eid));
        if (idsToDelete.length > 0) {
            const itemsToDelete = existingItemsRows.filter(row => idsToDelete.includes(row.id));
            const batchesToDelete = itemsToDelete.map(row => row.internal_batch_number).filter(Boolean);

            if (batchesToDelete.length > 0) {
                const batchPlaceholders = batchesToDelete.map(() => '?').join(',');
                await connection.execute(`DELETE FROM stock_status WHERE internal_batch_number IN (${batchPlaceholders}) AND ma_id = ?`, [...batchesToDelete, id]);
            }

            const placeholders = idsToDelete.map(() => '?').join(',');
            await connection.execute(`DELETE FROM material_add_items WHERE id IN (${placeholders})`, idsToDelete);
        }

        const settings = await getSettings();

        if (itemsData && itemsData.length > 0) {
            const insertItemQuery = `
                INSERT INTO material_add_items
                    (ma_id, material_id, material_name, material_type, grade, unit,
                     quantity, number_of_bags, kgs_per_bag, remaining_kg, internal_batch_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const updateItemQuery = `
                UPDATE material_add_items SET
                    material_id = ?, material_name = ?, material_type = ?, grade = ?, unit = ?,
                    quantity = ?, number_of_bags = ?, kgs_per_bag = ?, remaining_kg = ?, internal_batch_number = ?
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
                        item.material_type || null,
                        item.grade || null,
                        item.unit || null,
                        parseFloat(item.quantity) || 0,
                        toIntOrNull(item.number_of_bags) || 0,
                        parseFloat(item.kgs_per_bag) || 0,
                        parseFloat(item.remaining_kg) || 0,
                        internalBatchNumber,
                        item.id
                    ]);

                    // Upsert stock status record
                    await upsertStockStatusForMa(connection, id, {
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
                        item.material_type || null,
                        item.grade || null,
                        item.unit || null,
                        parseFloat(item.quantity) || 0,
                        toIntOrNull(item.number_of_bags) || 0,
                        parseFloat(item.kgs_per_bag) || 0,
                        parseFloat(item.remaining_kg) || 0,
                        internalBatchNumber
                    ]);

                    // Upsert stock status record
                    await upsertStockStatusForMa(connection, id, {
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

const deleteMaterialAdd = async (id) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Delete from stock_status
        await connection.execute(`DELETE FROM stock_status WHERE ma_id = ?`, [id]);

        // Delete from qc_master (which cascades to qc_items and stock_book)
        // Wait, qc_master doesn't have ON DELETE CASCADE for ma_id? 
        // It's safer to delete explicitly
        await connection.execute(`DELETE FROM qc_master WHERE ma_id = ? AND source = 'material_add'`, [id]);

        const [result] = await connection.execute(`DELETE FROM material_add_master WHERE id = ?`, [id]);

        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createMaterialAddTables,
    ensureMaterialAddColumns,
    createMaterialAdd,
    getAllMaterialAdds,
    getMaterialAddById,
    updateMaterialAdd,
    deleteMaterialAdd
};
