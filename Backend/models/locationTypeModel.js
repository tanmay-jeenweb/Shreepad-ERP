const db = require('../config/db.js');

const createLocationTypesTable = async () => {

    const query = `
        CREATE TABLE IF NOT EXISTS location_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            location_type_name VARCHAR(100) NOT NULL UNIQUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);

    console.log("Location types table ready");
};

const createLocationType = async (locationTypeName, addedBy, deviceId) => {

    const query = `
        INSERT INTO location_types (location_type_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;

    const [results] = await db.execute(query, [locationTypeName, addedBy, deviceId]);

    return results;
};

const getAllLocationTypes = async () => {

    const query = `
        SELECT
            lt.id,
            lt.location_type_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            lt.device_id,
            lt.created_at
        FROM location_types lt
        LEFT JOIN users u ON lt.added_by = u.id
        ORDER BY lt.created_at DESC
    `;

    const [results] = await db.execute(query);

    return results;
};

const updateLocationType = async (id, locationTypeName) => {

    const query = `
        UPDATE location_types
        SET location_type_name = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [locationTypeName, id]);

    return results;
};

const deleteLocationType = async (id) => {

    const query = `
        DELETE FROM location_types
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);

    return results;
};

const getLocationTypeById = async (id) => {
    const query = `SELECT * FROM location_types WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

module.exports = {
    createLocationTypesTable,
    createLocationType,
    getAllLocationTypes,
    updateLocationType,
    deleteLocationType,
    getLocationTypeById
};
