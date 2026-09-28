const db = require('../config/db.js');

const createMaterialTypesTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS material_types (
                id                 INT AUTO_INCREMENT PRIMARY KEY,
                material_type_name VARCHAR(100) NOT NULL UNIQUE,
                added_by           INT NOT NULL,
                device_id          VARCHAR(255),
                created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        await db.execute(query);
        console.log('Material types table ready');
    } catch (err) {
        console.error('Error creating material_types table:', err);
    }
};

const createMaterialType = async (materialTypeName, addedBy, deviceId) => {
    const query = `
        INSERT INTO material_types (material_type_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;
    const [results] = await db.execute(query, [materialTypeName, addedBy, deviceId]);
    return results;
};

const getAllMaterialTypes = async () => {
    const query = `
        SELECT
            mt.id,
            mt.material_type_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            mt.device_id,
            mt.created_at,
            mt.updated_at
        FROM material_types mt
        LEFT JOIN users u ON mt.added_by = u.id
        ORDER BY mt.created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getMaterialTypeById = async (id) => {
    const query = `SELECT * FROM material_types WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateMaterialType = async (id, materialTypeName) => {
    const query = `
        UPDATE material_types
        SET material_type_name = ?
        WHERE id = ?
    `;
    const [results] = await db.execute(query, [materialTypeName, id]);
    return results;
};

const deleteMaterialType = async (id) => {
    const query = `DELETE FROM material_types WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createMaterialTypesTable,
    createMaterialType,
    getAllMaterialTypes,
    getMaterialTypeById,
    updateMaterialType,
    deleteMaterialType,
};
