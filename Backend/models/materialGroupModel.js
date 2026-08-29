const db = require('../config/db.js');

const createMaterialGroupsTable = async () => {

    const query = `
        CREATE TABLE IF NOT EXISTS material_groups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            material_group_name VARCHAR(100) NOT NULL UNIQUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Material groups table ready");
};

const createMaterialGroup = async (materialGroupName, addedBy, deviceId) => {
    const query = `
        INSERT INTO material_groups (material_group_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;

    const [results] = await db.execute(query, [materialGroupName, addedBy, deviceId]);
    return results;
};

const getAllMaterialGroups = async () => {
    const query = `
        SELECT
            mg.id,
            mg.material_group_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            mg.device_id,
            mg.created_at
        FROM material_groups mg
        LEFT JOIN users u ON mg.added_by = u.id
        ORDER BY mg.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const updateMaterialGroup = async (id, materialGroupName) => {
    const query = `
        UPDATE material_groups
        SET material_group_name = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [materialGroupName, id]);
    return results;
};

const deleteMaterialGroup = async (id) => {
    const query = `
        DELETE FROM material_groups
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);
    return results;
};

const getMaterialGroupById = async (id) => {
    const query = `SELECT * FROM material_groups WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

module.exports = {
    createMaterialGroupsTable,
    createMaterialGroup,
    getAllMaterialGroups,
    updateMaterialGroup,
    deleteMaterialGroup,
    getMaterialGroupById
};
