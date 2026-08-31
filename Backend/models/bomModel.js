const db = require('../config/db.js');

const createBOMTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS bill_of_materials (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            material_id             INT NOT NULL,
            unit_weight_tolerance   DECIMAL(10,4),
            process_id              INT,
            product_weight          DECIMAL(15,4),
            product_weight_for_sale DECIMAL(15,4),
            added_by                INT NOT NULL,
            device_id               VARCHAR(255),
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id)    REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (process_id)     REFERENCES process_masters(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by)       REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log('Bill of Materials table ready');

    const queryMaterials = `
        CREATE TABLE IF NOT EXISTS bom_materials (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            bom_id                  INT NOT NULL,
            material_id             INT NOT NULL,
            quantity                DECIMAL(15,4) NOT NULL,
            FOREIGN KEY (bom_id)      REFERENCES bill_of_materials(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        )
    `;
    await db.execute(queryMaterials);
    console.log('BOM Materials table ready');
};



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

const createBOM = async (data, addedBy, deviceId) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const query = `
            INSERT INTO bill_of_materials
                (material_id, unit_weight_tolerance, process_id, product_weight,
                 product_weight_for_sale, added_by, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [results] = await connection.execute(query, [
            data.materialId,
            data.unitWeightTolerance    !== '' && data.unitWeightTolerance !== undefined ? Number(data.unitWeightTolerance)    : null,
            data.processId              || null,
            data.productWeight          !== '' && data.productWeight !== undefined          ? Number(data.productWeight)          : null,
            data.productWeightForSale   !== '' && data.productWeightForSale !== undefined   ? Number(data.productWeightForSale)   : null,
            addedBy,
            deviceId,
        ]);

        const bomId = results.insertId;

        if (data.bomMaterials && Array.isArray(data.bomMaterials)) {
            for (const item of data.bomMaterials) {
                if (item.materialId && item.quantity) {
                    await connection.execute(
                        `INSERT INTO bom_materials (bom_id, material_id, quantity) VALUES (?, ?, ?)`,
                        [bomId, item.materialId, Number(item.quantity)]
                    );
                }
            }
        }

        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
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
            bom.unit_weight_tolerance,
            bom.process_id,
            pm.process_name,
            bom.product_weight,
            bom.product_weight_for_sale,
            bom.added_by,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            bom.device_id,
            bom.created_at,
            GROUP_CONCAT(CONCAT(rm.material_name, ' (', bm.quantity, ' ', rmu.unit_name, ')') SEPARATOR ', ') AS raw_material_label
        FROM materials m
        LEFT JOIN bill_of_materials bom ON m.id = bom.material_id
        LEFT JOIN process_masters pm ON bom.process_id      = pm.id
        LEFT JOIN users u            ON bom.added_by        = u.id
        LEFT JOIN bom_materials bm   ON bom.id              = bm.bom_id
        LEFT JOIN materials rm       ON bm.material_id      = rm.id
        LEFT JOIN units rmu          ON rm.unit_id          = rmu.id
        WHERE m.material_type IN ('Finished Goods', 'Semi Finished Goods')
          AND m.active = 1
        GROUP BY m.id, bom.id, pm.process_name, u.name
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
            pm.process_name,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM bill_of_materials bom
        LEFT JOIN materials m        ON bom.material_id     = m.id
        LEFT JOIN process_masters pm ON bom.process_id      = pm.id
        LEFT JOIN users u            ON bom.added_by        = u.id
        WHERE bom.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    const bom = rows[0];
    if (bom) {
        const [materials] = await db.execute(`
            SELECT 
                bm.id,
                bm.material_id AS materialId,
                bm.quantity,
                m.material_name AS materialName,
                m.material_code AS materialCode,
                u.unit_name AS unitName
            FROM bom_materials bm
            JOIN materials m ON bm.material_id = m.id
            LEFT JOIN units u ON m.unit_id = u.id
            WHERE bm.bom_id = ?
        `, [id]);
        bom.bomMaterials = materials;
    }
    return bom;
};

const updateBOM = async (id, data) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const query = `
            UPDATE bill_of_materials SET
                material_id             = ?,
                unit_weight_tolerance   = ?,
                process_id              = ?,
                product_weight          = ?,
                product_weight_for_sale = ?
            WHERE id = ?
        `;
        const [results] = await connection.execute(query, [
            data.materialId,
            data.unitWeightTolerance    !== '' && data.unitWeightTolerance !== undefined ? Number(data.unitWeightTolerance)    : null,
            data.processId              || null,
            data.productWeight          !== '' && data.productWeight !== undefined          ? Number(data.productWeight)          : null,
            data.productWeightForSale   !== '' && data.productWeightForSale !== undefined   ? Number(data.productWeightForSale)   : null,
            id,
        ]);

        await connection.execute(`DELETE FROM bom_materials WHERE bom_id = ?`, [id]);

        if (data.bomMaterials && Array.isArray(data.bomMaterials)) {
            for (const item of data.bomMaterials) {
                if (item.materialId && item.quantity) {
                    await connection.execute(
                        `INSERT INTO bom_materials (bom_id, material_id, quantity) VALUES (?, ?, ?)`,
                        [id, item.materialId, Number(item.quantity)]
                    );
                }
            }
        }

        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const deleteBOM = async (id) => {
    const [results] = await db.execute('DELETE FROM bill_of_materials WHERE id = ?', [id]);
    return results;
};

const getBOMByMaterialId = async (materialId) => {
    const query = `
        SELECT
            bom.id AS id,
            bom.material_id,
            bom.unit_weight_tolerance,
            bom.process_id,
            bom.product_weight,
            bom.product_weight_for_sale,
            bom.added_by,
            bom.device_id,
            bom.created_at,
            m.material_name,
            m.material_code,
            m.material_type,
            pm.process_name,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM bill_of_materials bom
        LEFT JOIN materials m        ON bom.material_id     = m.id
        LEFT JOIN process_masters pm ON bom.process_id      = pm.id
        LEFT JOIN users u            ON bom.added_by        = u.id
        WHERE bom.material_id = ?
    `;
    const [rows] = await db.execute(query, [materialId]);
    let bom = rows[0];

    if (bom && bom.id) {
        const [materials] = await db.execute(`
            SELECT 
                bm.id,
                bm.material_id AS materialId,
                bm.quantity,
                m.material_name AS materialName,
                m.material_code AS materialCode,
                u.unit_name AS unitName
            FROM bom_materials bm
            JOIN materials m ON bm.material_id = m.id
            LEFT JOIN units u ON m.unit_id = u.id
            WHERE bm.bom_id = ?
        `, [bom.id]);
        bom.bomMaterials = materials;
    } else {
        const [mRows] = await db.execute(`
            SELECT 
                NULL AS id,
                id AS material_id,
                material_name,
                material_code,
                material_type
            FROM materials
            WHERE id = ? AND active = 1
        `, [materialId]);
        
        if (mRows.length > 0) {
            bom = {
                id: null,
                material_id: mRows[0].material_id,
                material_name: mRows[0].material_name,
                material_code: mRows[0].material_code,
                material_type: mRows[0].material_type,
                bomMaterials: [{ materialId: "", quantity: "", unitName: "" }]
            };
        }
    }
    return bom;
};

module.exports = {
    createBOMTable,
    getFinishedAndSemiFinishedMaterials,
    createBOM,
    getAllBOMs,
    getBOMById,
    getBOMByMaterialId,
    updateBOM,
    deleteBOM,
};
