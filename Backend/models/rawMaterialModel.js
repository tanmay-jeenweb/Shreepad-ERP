const db = require('../config/db.js');

const createRawMaterialsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS raw_materials (
            id INT AUTO_INCREMENT PRIMARY KEY,
            material_id INT,
            grade VARCHAR(100) NOT NULL,
            minimum_balance DECIMAL(15,2) DEFAULT 0.00,
            remark TEXT,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_material_grade (material_id, grade),
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Raw materials table ready");
};

const ensureRawMaterialColumns = async () => {
    // Check if material_id exists
    const [cols] = await db.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'raw_materials' AND COLUMN_NAME = 'material_id'`
    );
    if (cols.length === 0) {
        console.log("Migrating raw_materials table schema...");
        
        // Find and drop foreign keys referencing raw_material_types or raw_material_type_id
        const [fks] = await db.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'raw_materials' 
              AND COLUMN_NAME = 'raw_material_type_id'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        for (const fk of fks) {
            try {
                await db.execute(`ALTER TABLE raw_materials DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                console.log(`Dropped foreign key constraint ${fk.CONSTRAINT_NAME}`);
            } catch (err) {
                console.error(`Error dropping foreign key ${fk.CONSTRAINT_NAME}:`, err.message);
            }
        }

        // Drop UNIQUE KEY if exists (uq_type_grade)
        try {
            await db.execute(`ALTER TABLE raw_materials DROP INDEX uq_type_grade`);
            console.log(`Dropped index uq_type_grade`);
        } catch (err) {
            console.log(`Note: could not drop index uq_type_grade: ${err.message}`);
        }

        // Drop the raw_material_type_id column if it exists
        const [rmtCol] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'raw_materials' AND COLUMN_NAME = 'raw_material_type_id'`
        );
        if (rmtCol.length > 0) {
            await db.execute(`ALTER TABLE raw_materials DROP COLUMN raw_material_type_id`);
            console.log("Dropped column raw_material_type_id from raw_materials");
        }

        // Add material_id column
        await db.execute(`ALTER TABLE raw_materials ADD COLUMN material_id INT NULL`);
        console.log("Added column material_id to raw_materials");

        // Add foreign key constraint
        await db.execute(`ALTER TABLE raw_materials ADD CONSTRAINT fk_raw_materials_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL`);
        console.log("Added foreign key constraint fk_raw_materials_material");

        // Add unique key uq_material_grade
        await db.execute(`ALTER TABLE raw_materials ADD UNIQUE KEY uq_material_grade (material_id, grade)`);
        console.log("Added unique key uq_material_grade to raw_materials");
    }
};

const createRawMaterial = async (data, addedBy, deviceId) => {
    const {
        materialId,
        grade,
        minimumBalance,
        remark
    } = data;

    const query = `
        INSERT INTO raw_materials (material_id, grade, minimum_balance, remark, added_by, device_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [results] = await db.execute(query, [
        materialId || null,
        grade,
        minimumBalance !== undefined && minimumBalance !== null && minimumBalance !== '' ? Number(minimumBalance) : 0.00,
        remark || null,
        addedBy,
        deviceId
    ]);

    return results;
};

const getAllRawMaterials = async () => {
    const query = `
        SELECT
            rm.id,
            rm.material_id,
            m.material_name,
            m.material_code,
            rm.grade,
            rm.minimum_balance,
            rm.remark,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            rm.device_id,
            rm.created_at
        FROM raw_materials rm
        LEFT JOIN materials m ON rm.material_id = m.id
        LEFT JOIN users u ON rm.added_by = u.id
        ORDER BY rm.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const getRawMaterialById = async (id) => {
    const query = `SELECT * FROM raw_materials WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateRawMaterial = async (id, data) => {
    const {
        materialId,
        grade,
        minimumBalance,
        remark
    } = data;

    const query = `
        UPDATE raw_materials
        SET
            material_id = ?,
            grade = ?,
            minimum_balance = ?,
            remark = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [
        materialId || null,
        grade,
        minimumBalance !== undefined && minimumBalance !== null && minimumBalance !== '' ? Number(minimumBalance) : 0.00,
        remark || null,
        id
    ]);

    return results;
};

const deleteRawMaterial = async (id) => {
    const query = `DELETE FROM raw_materials WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createRawMaterialsTable,
    ensureRawMaterialColumns,
    createRawMaterial,
    getAllRawMaterials,
    getRawMaterialById,
    updateRawMaterial,
    deleteRawMaterial
};
