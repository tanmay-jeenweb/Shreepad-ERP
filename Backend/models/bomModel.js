const db = require('../config/db.js');

const createBOMTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS bill_of_materials (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            material_id             INT NOT NULL,
            product_insert          VARCHAR(255),
            product_counting_type   VARCHAR(100),
            unit_weight_tolerance   DECIMAL(10,4),
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
            FOREIGN KEY (process_id)     REFERENCES process_masters(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by)       REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log('Bill of Materials table ready');
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
    const query = `
        INSERT INTO bill_of_materials
            (material_id, product_insert, product_counting_type,
             unit_weight_tolerance, color, process_id, product_weight,
             rm_formulation, price, product_weight_for_sale, packing_method,
             difference, added_by, device_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [results] = await db.execute(query, [
        data.materialId,
        data.productInsert          || null,
        data.productCountingType    || null,
        data.unitWeightTolerance    !== '' && data.unitWeightTolerance !== undefined ? Number(data.unitWeightTolerance)    : null,
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
    return results;
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
            bom.product_counting_type,
            bom.unit_weight_tolerance,
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
        LEFT JOIN process_masters pm ON bom.process_id      = pm.id
        LEFT JOIN users u            ON bom.added_by        = u.id
        WHERE m.material_type IN ('Finished Goods', 'Semi Finished Goods')
          AND m.active = 1
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
    return rows[0];
};

const updateBOM = async (id, data) => {
    const query = `
        UPDATE bill_of_materials SET
            material_id             = ?,
            product_insert          = ?,
            product_counting_type   = ?,
            unit_weight_tolerance   = ?,
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
    const [results] = await db.execute(query, [
        data.materialId,
        data.productInsert          || null,
        data.productCountingType    || null,
        data.unitWeightTolerance    !== '' && data.unitWeightTolerance !== undefined ? Number(data.unitWeightTolerance)    : null,
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
    return results;
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
