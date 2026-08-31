const db = require('../config/db.js');

const SYSTEM_MATERIAL_TYPES = [
    'Finished Goods',
    'Semi Finished Goods',
    'Raw Materials',
];

const createMaterialTypesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS material_types (
            id                 INT AUTO_INCREMENT PRIMARY KEY,
            material_type_name VARCHAR(100) NOT NULL UNIQUE,
            is_system          TINYINT(1) DEFAULT 0,
            added_by           INT NOT NULL,
            device_id          VARCHAR(255),
            created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log('Material types table ready');
};

const seedSystemMaterialTypes = async () => {
    try {
        const [users] = await db.execute('SELECT id FROM users ORDER BY id ASC LIMIT 1');
        if (users.length === 0) {
            console.log('No users found. Skipping system material types seeding.');
            return;
        }
        const adminId = users[0].id;

        for (const typeName of SYSTEM_MATERIAL_TYPES) {
            await db.execute(
                `INSERT IGNORE INTO material_types (material_type_name, is_system, added_by) VALUES (?, 1, ?)`,
                [typeName, adminId]
            );
        }

        const placeholders = SYSTEM_MATERIAL_TYPES.map(() => '?').join(', ');
        await db.execute(
            `DELETE FROM material_types WHERE is_system = 1 AND material_type_name NOT IN (${placeholders})`,
            SYSTEM_MATERIAL_TYPES
        );

        console.log('System material types seeded and cleaned up successfully');
    } catch (error) {
        console.error('Error seeding system material types:', error);
    }
};

const createMaterialType = async (materialTypeName, addedBy, deviceId) => {
    const query = `
        INSERT INTO material_types (material_type_name, is_system, added_by, device_id)
        VALUES (?, 0, ?, ?)
    `;
    const [results] = await db.execute(query, [materialTypeName, addedBy, deviceId]);
    return results;
};

const getAllMaterialTypes = async () => {
    const query = `
        SELECT
            mt.id,
            mt.material_type_name,
            mt.is_system,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            mt.device_id,
            mt.created_at
        FROM material_types mt
        LEFT JOIN users u ON mt.added_by = u.id
        ORDER BY mt.is_system DESC, mt.created_at ASC
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
    seedSystemMaterialTypes,
    createMaterialType,
    getAllMaterialTypes,
    getMaterialTypeById,
    updateMaterialType,
    deleteMaterialType,
};
