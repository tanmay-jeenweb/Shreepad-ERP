const db = require('../config/db.js');

const createInspectionTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS inspection_masters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Inspection masters table ready");
};

const createInspection = async (name, addedBy, deviceId) => {
    const query = `
        INSERT INTO inspection_masters (name, added_by, device_id)
        VALUES (?, ?, ?)
    `;

    const [results] = await db.execute(query, [name, addedBy, deviceId || null]);
    return results;
};

const getAllInspections = async () => {
    const query = `
        SELECT
            i.id,
            i.name,
            i.added_by,
            COALESCE(usr.name, 'Unknown') AS added_by_name,
            i.device_id,
            i.created_at,
            i.updated_at
        FROM inspection_masters i
        LEFT JOIN users usr ON i.added_by = usr.id
        ORDER BY i.name ASC
    `;

    const [results] = await db.execute(query);
    return results;
};

const getInspectionById = async (id) => {
    const query = `
        SELECT
            i.id,
            i.name,
            i.added_by,
            COALESCE(usr.name, 'Unknown') AS added_by_name,
            i.device_id,
            i.created_at,
            i.updated_at
        FROM inspection_masters i
        LEFT JOIN users usr ON i.added_by = usr.id
        WHERE i.id = ?
    `;

    const [rows] = await db.execute(query, [id]);
    return rows[0] || null;
};

const updateInspection = async (id, name) => {
    const query = `
        UPDATE inspection_masters
        SET name = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [name, id]);
    return results;
};

const deleteInspection = async (id) => {
    const query = `
        DELETE FROM inspection_masters
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createInspectionTable,
    createInspection,
    getAllInspections,
    getInspectionById,
    updateInspection,
    deleteInspection
};
