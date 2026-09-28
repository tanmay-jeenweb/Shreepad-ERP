const db = require('../config/db.js');

const SYSTEM_MATERIAL_GROUPS = [
    'Finished Goods',
    'Semi Finished Goods',
    'Raw Materials',
];

const createMaterialGroupsTable = async () => {
    try {
        // Check if material_groups exists
        const [mgTable] = await db.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_groups'`
        );

        if (mgTable.length === 0) {
            // Check if legacy material_types table exists to migrate
            const [mtTable] = await db.execute(
                `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_types'`
            );

            if (mtTable.length > 0) {
                // Rename material_types to material_groups
                await db.execute(`RENAME TABLE material_types TO material_groups`);
                console.log('Migrated table material_types -> material_groups');
            }
        }

        // Create table if neither existed
        const query = `
            CREATE TABLE IF NOT EXISTS material_groups (
                id                  INT AUTO_INCREMENT PRIMARY KEY,
                material_group_name VARCHAR(100) NOT NULL UNIQUE,
                is_system           TINYINT(1) DEFAULT 0,
                added_by            INT NOT NULL,
                device_id           VARCHAR(255),
                created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        await db.execute(query);

        // Ensure column material_group_name exists if migrated from material_type_name
        const [oldCol] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_groups' AND COLUMN_NAME = 'material_type_name'`
        );
        if (oldCol.length > 0) {
            await db.execute(
                `ALTER TABLE material_groups CHANGE COLUMN material_type_name material_group_name VARCHAR(100) NOT NULL UNIQUE`
            );
            console.log('Renamed column material_type_name -> material_group_name in material_groups');
        }

        console.log('Material groups table ready');
    } catch (err) {
        console.error('Error in createMaterialGroupsTable:', err);
    }
};

const seedSystemMaterialGroups = async () => {
    try {
        const [users] = await db.execute('SELECT id FROM users ORDER BY id ASC LIMIT 1');
        if (users.length === 0) {
            console.log('No users found. Skipping system material groups seeding.');
            return;
        }
        const adminId = users[0].id;

        for (const groupName of SYSTEM_MATERIAL_GROUPS) {
            await db.execute(
                `INSERT IGNORE INTO material_groups (material_group_name, is_system, added_by) VALUES (?, 1, ?)`,
                [groupName, adminId]
            );
        }

        const placeholders = SYSTEM_MATERIAL_GROUPS.map(() => '?').join(', ');
        await db.execute(
            `DELETE FROM material_groups WHERE is_system = 1 AND material_group_name NOT IN (${placeholders})`,
            SYSTEM_MATERIAL_GROUPS
        );

        console.log('System material groups seeded and cleaned up successfully');
    } catch (error) {
        console.error('Error seeding system material groups:', error);
    }
};

const createMaterialGroup = async (materialGroupName, addedBy, deviceId) => {
    const query = `
        INSERT INTO material_groups (material_group_name, is_system, added_by, device_id)
        VALUES (?, 0, ?, ?)
    `;
    const [results] = await db.execute(query, [materialGroupName, addedBy, deviceId]);
    return results;
};

const getAllMaterialGroups = async () => {
    const query = `
        SELECT
            mg.id,
            mg.material_group_name,
            mg.material_group_name AS material_type_name,
            mg.is_system,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            mg.device_id,
            mg.created_at
        FROM material_groups mg
        LEFT JOIN users u ON mg.added_by = u.id
        ORDER BY mg.is_system DESC, mg.created_at ASC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getMaterialGroupById = async (id) => {
    const query = `
        SELECT
            mg.*,
            mg.material_group_name AS material_type_name
        FROM material_groups mg
        WHERE mg.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
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
    const query = `DELETE FROM material_groups WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    SYSTEM_MATERIAL_GROUPS,
    createMaterialGroupsTable,
    seedSystemMaterialGroups,
    createMaterialGroup,
    getAllMaterialGroups,
    getMaterialGroupById,
    updateMaterialGroup,
    deleteMaterialGroup,
    // Backwards-compatible aliases
    createMaterialTypesTable: createMaterialGroupsTable,
    seedSystemMaterialTypes: seedSystemMaterialGroups,
    createMaterialType: createMaterialGroup,
    getAllMaterialTypes: getAllMaterialGroups,
    getMaterialTypeById: getMaterialGroupById,
    updateMaterialType: updateMaterialGroup,
    deleteMaterialType: deleteMaterialGroup,
};
