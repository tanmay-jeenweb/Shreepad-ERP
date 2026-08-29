const db = require('../config/db.js');

const createMaterialsTable = async () => {

    const query = `
        CREATE TABLE IF NOT EXISTS materials (
            id INT AUTO_INCREMENT PRIMARY KEY,
            material_code VARCHAR(100) NOT NULL UNIQUE,
            code VARCHAR(3) DEFAULT NULL UNIQUE,
            material_name VARCHAR(255) NOT NULL,
            unit_id INT,
            hsn_code VARCHAR(50),
            material_group_id INT,
            material_type VARCHAR(100),
            gst_percent VARCHAR(50),
            self_val DECIMAL(15,2),
            purchase_val DECIMAL(15,2),
            unit_weight DECIMAL(15,4),
            details TEXT,
            remarks TEXT,
            active BOOLEAN DEFAULT TRUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
            FOREIGN KEY (material_group_id) REFERENCES material_groups(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    const materialMouldsQuery = `
        CREATE TABLE IF NOT EXISTS material_moulds (
            material_id INT NOT NULL,
            mould_id INT NOT NULL,
            PRIMARY KEY (material_id, mould_id),
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (mould_id) REFERENCES moulds(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    await db.execute(materialMouldsQuery);
    console.log('Materials and material_moulds tables ready');
};

const ensureMaterialColumns = async () => {
    const columnsToEnsure = [
        { name: 'active', query: 'ALTER TABLE materials ADD COLUMN active BOOLEAN DEFAULT TRUE' },
        { name: 'code', query: 'ALTER TABLE materials ADD COLUMN code VARCHAR(3) DEFAULT NULL UNIQUE' }
    ];

    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to materials`);
        }
    }

    // Ensure material_type is VARCHAR(100) instead of ENUM to support custom inputs
    try {
        await db.execute('ALTER TABLE materials MODIFY COLUMN material_type VARCHAR(100)');
        console.log('Modified material_type column to VARCHAR(100)');
    } catch (err) {
        console.error('Error modifying material_type column:', err);
    }
};

const createMaterial = async (data, mouldIds = [], addedBy, deviceId) => {
    const {
        materialCode,
        code,
        materialName,
        unitId,
        hsnCode,
        materialGroupId,
        materialType,
        gstPercent,
        selfVal,
        purchaseVal,
        unitWeight,
        details,
        remarks
    } = data;

    const query = `
        INSERT INTO materials
            (material_code, code, material_name, unit_id, hsn_code, material_group_id, material_type, gst_percent, self_val, purchase_val, unit_weight, details, remarks, added_by, device_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [results] = await connection.execute(query, [
        materialCode,
        code || null,
        materialName,
        unitId || null,
        hsnCode || null,
        materialGroupId || null,
        materialType || null,
        gstPercent || null,
        selfVal || null,
        purchaseVal || null,
        unitWeight || null,
        details || null,
        remarks || null,
        addedBy,
        deviceId
    ]);

    const materialId = results.insertId;

    if (mouldIds && mouldIds.length > 0) {
        for (const mouldId of mouldIds) {
            await connection.execute(
                `INSERT INTO material_moulds (material_id, mould_id) VALUES (?, ?)`,
                [materialId, mouldId]
            );
        }
    }

    await connection.commit();
    return results;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const getAllMaterials = async (includeInactive = false) => {
    const whereClause = includeInactive ? '' : 'WHERE m.active = 1 OR m.active IS NULL';
    const query = `
        SELECT
            m.id,
            m.material_code,
            m.code,
            m.material_name,
            m.unit_id,
            u.unit_name,
            m.hsn_code,
            m.material_group_id,
            mg.material_group_name,
            m.material_type,
            m.gst_percent,
            m.self_val,
            m.purchase_val,
            m.unit_weight,
            m.details,
            m.remarks,
            m.active,
            COALESCE(usr.name, 'Unknown') AS added_by_name,
            m.device_id,
            m.created_at,
            GROUP_CONCAT(mm.mould_id) AS mould_ids
        FROM materials m
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN material_groups mg ON m.material_group_id = mg.id
        LEFT JOIN users usr ON m.added_by = usr.id
        LEFT JOIN material_moulds mm ON m.id = mm.material_id
        ${whereClause}
        GROUP BY m.id
        ORDER BY m.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const getMaterialById = async (id) => {
    const query = `
        SELECT m.*, GROUP_CONCAT(mm.mould_id) AS mould_ids
        FROM materials m
        LEFT JOIN material_moulds mm ON m.id = mm.material_id
        WHERE m.id = ?
        GROUP BY m.id
    `;
    const [rows] = await db.execute(query, [id]);
    const material = rows[0];
    if (material && material.mould_ids) {
        material.mould_ids = material.mould_ids.split(',').map(Number);
    } else if (material) {
        material.mould_ids = [];
    }
    return material;
};

const updateMaterial = async (id, data, mouldIds = []) => {
    const {
        materialCode,
        code,
        materialName,
        unitId,
        hsnCode,
        materialGroupId,
        materialType,
        gstPercent,
        selfVal,
        purchaseVal,
        unitWeight,
        details,
        remarks
    } = data;

    const query = `
        UPDATE materials
        SET
            material_code = ?,
            code = ?,
            material_name = ?,
            unit_id = ?,
            hsn_code = ?,
            material_group_id = ?,
            material_type = ?,
            gst_percent = ?,
            self_val = ?,
            purchase_val = ?,
            unit_weight = ?,
            details = ?,
            remarks = ?
        WHERE id = ?
    `;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [results] = await connection.execute(query, [
        materialCode,
        code || null,
        materialName,
        unitId || null,
        hsnCode || null,
        materialGroupId || null,
        materialType || null,
        gstPercent || null,
        selfVal || null,
        purchaseVal || null,
        unitWeight || null,
        details || null,
        remarks || null,
        id
    ]);

    await connection.execute(`DELETE FROM material_moulds WHERE material_id = ?`, [id]);
    
    if (mouldIds && mouldIds.length > 0) {
        for (const mouldId of mouldIds) {
            await connection.execute(
                `INSERT INTO material_moulds (material_id, mould_id) VALUES (?, ?)`,
                [id, mouldId]
            );
        }
    }

    await connection.commit();
    return results;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const toggleMaterialActive = async (id, active) => {
    const query = `UPDATE materials SET active = ? WHERE id = ?`;
    const [result] = await db.execute(query, [active ? 1 : 0, id]);
    return result;
};

const deleteMaterial = async (id) => {
    const query = `DELETE FROM materials WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createMaterialsTable,
    ensureMaterialColumns,
    createMaterial,
    getAllMaterials,
    getMaterialById,
    updateMaterial,
    toggleMaterialActive,
    deleteMaterial
};
