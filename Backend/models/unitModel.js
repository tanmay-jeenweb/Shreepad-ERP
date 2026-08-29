const db = require('../config/db.js');

const createUnitsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS units (
            id INT AUTO_INCREMENT PRIMARY KEY,
            unit_name VARCHAR(100) NOT NULL UNIQUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);

    console.log("Units table ready");
};

const createUnit = async (unitName, addedBy, deviceId) => {
    const query = `
        INSERT INTO units (unit_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;

    const [results] = await db.execute(query, [unitName, addedBy, deviceId]);
    return results;
};

const getAllUnits = async () => {
    const query = `
        SELECT
            u.id,
            u.unit_name,
            COALESCE(usr.name, 'Unknown') AS added_by_name,
            u.device_id,
            u.created_at
        FROM units u
        LEFT JOIN users usr ON u.added_by = usr.id
        ORDER BY u.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const updateUnit = async (id, unitName) => {
    const query = `
        UPDATE units
        SET unit_name = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [unitName, id]);
    return results;
};

const deleteUnit = async (id) => {
    const query = `
        DELETE FROM units
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);
    return results;
};

const getUnitById = async (id) => {
    const query = `SELECT * FROM units WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

module.exports = {
    createUnitsTable,
    createUnit,
    getAllUnits,
    updateUnit,
    deleteUnit,
    getUnitById
};
