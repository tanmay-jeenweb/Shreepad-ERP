const db = require('../config/db.js');

const createBOMTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS bill_of_materials (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            material_id             INT NOT NULL,
            product_insert          VARCHAR(255),
            raw_material_id         INT,
            product_counting_type   VARCHAR(100),
            unit_weight_tolerance   DECIMAL(10,4),
            mould_id                INT,
            color                   VARCHAR(100),
            process_id              INT,
            product_weight          DECIMAL(15,4),
            rm_formulation          VARCHAR(255),
            price                   DECIMAL(15,2),
            product_weight_for_sale DECIMAL(15,4),
            packing_method          VARCHAR(255),
            difference              DECIMAL(15,4),
            added_by                INT NOT NULL,
            device_id               VARCHAR(255),
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id)    REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id) ON DELETE SET NULL,
            FOREIGN KEY (mould_id)       REFERENCES moulds(id) ON DELETE SET NULL,
            FOREIGN KEY (process_id)     REFERENCES process_masters(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by)       REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log('Bill of Materials table ready');

    const junctionQuery = `
        CREATE TABLE IF NOT EXISTS bom_moulds (
            bom_id INT NOT NULL,
            mould_id INT NOT NULL,
            PRIMARY KEY (bom_id, mould_id),
            FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id) ON DELETE CASCADE,
            FOREIGN KEY (mould_id) REFERENCES moulds(id) ON DELETE CASCADE
        )
    `;
    await db.execute(junctionQuery);
    console.log('bom_moulds junction table ready');

    // Sync existing mould_ids to bom_moulds table if empty
    try {
        const [rows] = await db.execute("SELECT COUNT(*) as count FROM bom_moulds");
        if (rows[0] && rows[0].count === 0) {
            console.log('Syncing existing mould_ids to bom_moulds...');
            const [existing] = await db.execute("SELECT id, mould_id FROM bill_of_materials WHERE mould_id IS NOT NULL");
            for (const row of existing) {
                await db.execute("INSERT IGNORE INTO bom_moulds (bom_id, mould_id) VALUES (?, ?)", [row.id, row.mould_id]);
            }
            console.log(`Synced ${existing.length} mould references.`);
        }
    } catch (err) {
        console.error("Migration error syncing bom_moulds:", err);
    }
};

const ensureBOMColumns = async () => {
    try {
        const [cols] = await db.execute(`
            SELECT DATA_TYPE as dataType 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'bill_of_materials' 
              AND COLUMN_NAME = 'rm_formulation'
        `);
        if (cols.length > 0 && cols[0].dataType !== 'varchar') {
            console.log("Altering column rm_formulation in bill_of_materials to VARCHAR(255)...");
            await db.execute(`
                ALTER TABLE bill_of_materials 
                MODIFY COLUMN rm_formulation VARCHAR(255)
            `);
            console.log("Column rm_formulation altered successfully.");
        }
    } catch (err) {
        console.error("Error in ensureBOMColumns:", err);
    }
};

// ─── Fetch products (FG + SFG only) for dropdown ────────────────────────────
const getFinishedAndSemiFinishedMaterials = async () => {
    const query = `
        SELECT id, material_code, material_name, material_type
        FROM materials
        WHERE material_type IN ('Finished Goods', 'Semi Finished Goods')
          AND active = 1
        ORDER BY material_name ASC
    `;
    const [results] = await db.execute(query);
    return results;
};

// ─── CRUD ────────────────────────────────────────────────────────────────────
const createBOM = async (data, addedBy, deviceId) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        let mouldIds = data.mouldIds || [];
        if (typeof mouldIds === 'string') {
            mouldIds = mouldIds.split(',').map(id => id.trim()).filter(Boolean);
        } else if (typeof mouldIds === 'number') {
            mouldIds = [mouldIds];
        }

        if (mouldIds.length === 0 && data.mouldId) {
            mouldIds = [data.mouldId];
        }

        const firstMouldId = mouldIds.length > 0 ? Number(mouldIds[0]) : null;

        const query = `
            INSERT INTO bill_of_materials
                (material_id, product_insert, raw_material_id, product_counting_type,
                 unit_weight_tolerance, mould_id, color, process_id, product_weight,
                 rm_formulation, price, product_weight_for_sale, packing_method,
                 difference, added_by, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [results] = await conn.execute(query, [
            data.materialId,
            data.productInsert          || null,
            data.rawMaterialId          || null,
            data.productCountingType    || null,
            data.unitWeightTolerance    !== '' && data.unitWeightTolerance !== undefined ? Number(data.unitWeightTolerance)    : null,
            firstMouldId,
            data.color                  || null,
            data.processId              || null,
            data.productWeight          !== '' && data.productWeight !== undefined          ? Number(data.productWeight)          : null,
            data.rmFormulation          || null,
            data.price                  !== '' && data.price !== undefined                  ? Number(data.price)                  : null,
            data.productWeightForSale   !== '' && data.productWeightForSale !== undefined   ? Number(data.productWeightForSale)   : null,
            data.packingMethod          || null,
            data.difference             !== '' && data.difference !== undefined             ? Number(data.difference)             : null,
            addedBy,
            deviceId,
        ]);

        const bomId = results.insertId;

        if (mouldIds && mouldIds.length > 0) {
            for (const mId of mouldIds) {
                await conn.execute(
                    `INSERT INTO bom_moulds (bom_id, mould_id) VALUES (?, ?)`,
                    [bomId, Number(mId)]
                );
            }
        }

        await conn.commit();
        return results;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const getAllBOMs = async () => {
    const query = `
        SELECT
            bom.id AS id,
            m.id AS material_id,
            m.material_name,
            m.material_code,
            m.material_type,
            bom.product_insert,
            bom.raw_material_id,
            CONCAT(rm_mat.material_name, ' - ', rm.grade) AS raw_material_label,
            rm.grade                                       AS raw_material_grade,
            rm_mat.material_name                          AS raw_material_name,
            bom.product_counting_type,
            bom.unit_weight_tolerance,
            GROUP_CONCAT(bm.mould_id ORDER BY mo.mould_name SEPARATOR ',') AS mould_ids,
            GROUP_CONCAT(mo.mould_name ORDER BY mo.mould_name SEPARATOR ', ') AS mould_name,
            bom.color,
            bom.process_id,
            pm.process_name,
            bom.product_weight,
            bom.rm_formulation,
            bom.price,
            bom.product_weight_for_sale,
            bom.packing_method,
            bom.difference,
            bom.added_by,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            bom.device_id,
            bom.created_at
        FROM materials m
        LEFT JOIN bill_of_materials bom ON m.id = bom.material_id
        LEFT JOIN raw_materials rm   ON bom.raw_material_id = rm.id
        LEFT JOIN materials rm_mat   ON rm.material_id      = rm_mat.id
        LEFT JOIN bom_moulds bm      ON bom.id              = bm.bom_id
        LEFT JOIN moulds mo          ON bm.mould_id         = mo.id
        LEFT JOIN process_masters pm ON bom.process_id      = pm.id
        LEFT JOIN users u            ON bom.added_by        = u.id
        WHERE m.material_type IN ('Finished Goods', 'Semi Finished Goods')
          AND m.active = 1
        GROUP BY m.id, bom.id, bom.product_insert, bom.raw_material_id, 
                 rm_mat.material_name, rm.grade, bom.product_counting_type, 
                 bom.unit_weight_tolerance, bom.color, bom.process_id, 
                 pm.process_name, bom.product_weight, bom.rm_formulation, 
                 bom.price, bom.product_weight_for_sale, bom.packing_method, 
                 bom.difference, bom.added_by, u.name, bom.device_id, bom.created_at
        ORDER BY m.created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getBOMById = async (id) => {
    const query = `
        SELECT
            bom.*,
            m.material_name,
            m.material_code,
            m.material_type,
            CONCAT(rm_mat.material_name, ' - ', rm.grade) AS raw_material_label,
            rm.grade                                       AS raw_material_grade,
            GROUP_CONCAT(bm.mould_id ORDER BY mo.mould_name SEPARATOR ',') AS mould_ids,
            GROUP_CONCAT(mo.mould_name ORDER BY mo.mould_name SEPARATOR ', ') AS mould_name,
            pm.process_name,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM bill_of_materials bom
        LEFT JOIN materials m        ON bom.material_id     = m.id
        LEFT JOIN raw_materials rm   ON bom.raw_material_id = rm.id
        LEFT JOIN materials rm_mat   ON rm.material_id      = rm_mat.id
        LEFT JOIN bom_moulds bm      ON bom.id              = bm.bom_id
        LEFT JOIN moulds mo          ON bm.mould_id         = mo.id
        LEFT JOIN process_masters pm ON bom.process_id      = pm.id
        LEFT JOIN users u            ON bom.added_by        = u.id
        WHERE bom.id = ?
        GROUP BY bom.id, m.material_name, m.material_code, m.material_type, 
                 rm_mat.material_name, rm.grade, pm.process_name, u.name
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateBOM = async (id, data) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        let mouldIds = data.mouldIds || [];
        if (typeof mouldIds === 'string') {
            mouldIds = mouldIds.split(',').map(id => id.trim()).filter(Boolean);
        } else if (typeof mouldIds === 'number') {
            mouldIds = [mouldIds];
        }

        if (mouldIds.length === 0 && data.mouldId) {
            mouldIds = [data.mouldId];
        }

        const firstMouldId = mouldIds.length > 0 ? Number(mouldIds[0]) : null;

        const query = `
            UPDATE bill_of_materials SET
                material_id             = ?,
                product_insert          = ?,
                raw_material_id         = ?,
                product_counting_type   = ?,
                unit_weight_tolerance   = ?,
                mould_id                = ?,
                color                   = ?,
                process_id              = ?,
                product_weight          = ?,
                rm_formulation          = ?,
                price                   = ?,
                product_weight_for_sale = ?,
                packing_method          = ?,
                difference              = ?
            WHERE id = ?
        `;
        const [results] = await conn.execute(query, [
            data.materialId,
            data.productInsert          || null,
            data.rawMaterialId          || null,
            data.productCountingType    || null,
            data.unitWeightTolerance    !== '' && data.unitWeightTolerance !== undefined ? Number(data.unitWeightTolerance)    : null,
            firstMouldId,
            data.color                  || null,
            data.processId              || null,
            data.productWeight          !== '' && data.productWeight !== undefined          ? Number(data.productWeight)          : null,
            data.rmFormulation          || null,
            data.price                  !== '' && data.price !== undefined                  ? Number(data.price)                  : null,
            data.productWeightForSale   !== '' && data.productWeightForSale !== undefined   ? Number(data.productWeightForSale)   : null,
            data.packingMethod          || null,
            data.difference             !== '' && data.difference !== undefined             ? Number(data.difference)             : null,
            id,
        ]);

        await conn.execute(`DELETE FROM bom_moulds WHERE bom_id = ?`, [id]);

        if (mouldIds && mouldIds.length > 0) {
            for (const mId of mouldIds) {
                await conn.execute(
                    `INSERT INTO bom_moulds (bom_id, mould_id) VALUES (?, ?)`,
                    [id, Number(mId)]
                );
            }
        }

        await conn.commit();
        return results;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const deleteBOM = async (id) => {
    const [results] = await db.execute('DELETE FROM bill_of_materials WHERE id = ?', [id]);
    return results;
};

module.exports = {
    createBOMTable,
    ensureBOMColumns,
    getFinishedAndSemiFinishedMaterials,
    createBOM,
    getAllBOMs,
    getBOMById,
    updateBOM,
    deleteBOM,
};
