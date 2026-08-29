const db = require('../config/db.js');

const createMachineTypesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS machine_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            machine_type_name VARCHAR(100) NOT NULL UNIQUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);

    console.log('Machine types table ready');
};

const createMachineType = async (machineTypeName, addedBy, deviceId) => {
    const query = `
        INSERT INTO machine_types (machine_type_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;

    const [results] = await db.execute(query, [machineTypeName, addedBy, deviceId]);
    return results;
};

const getAllMachineTypes = async () => {
    const query = `
        SELECT
            mt.id,
            mt.machine_type_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            mt.device_id,
            mt.created_at
        FROM machine_types mt
        LEFT JOIN users u ON mt.added_by = u.id
        ORDER BY mt.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const updateMachineType = async (id, machineTypeName) => {
    const query = `
        UPDATE machine_types
        SET machine_type_name = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [machineTypeName, id]);
    return results;
};

const deleteMachineType = async (id) => {
    const query = `
        DELETE FROM machine_types
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);
    return results;
};

const getMachineTypeById = async (id) => {
    const query = `SELECT * FROM machine_types WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

module.exports = {
    createMachineTypesTable,
    createMachineType,
    getAllMachineTypes,
    updateMachineType,
    deleteMachineType,
    getMachineTypeById
};
