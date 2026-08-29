const db = require('../config/db.js');

const createReasonForDelayTypesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS reason_for_delay_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reason_type_name VARCHAR(100) NOT NULL UNIQUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Reason for delay types table ready");
};

const createReasonForDelayType = async (reasonTypeName, addedBy, deviceId) => {
    const query = `
        INSERT INTO reason_for_delay_types (reason_type_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;

    const [results] = await db.execute(query, [reasonTypeName, addedBy, deviceId]);
    return results;
};

const getAllReasonForDelayTypes = async () => {
    const query = `
        SELECT
            rdt.id,
            rdt.reason_type_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            rdt.device_id,
            rdt.created_at
        FROM reason_for_delay_types rdt
        LEFT JOIN users u ON rdt.added_by = u.id
        ORDER BY rdt.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const updateReasonForDelayType = async (id, reasonTypeName) => {
    const query = `
        UPDATE reason_for_delay_types
        SET reason_type_name = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [reasonTypeName, id]);
    return results;
};

const deleteReasonForDelayType = async (id) => {
    const query = `
        DELETE FROM reason_for_delay_types
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);
    return results;
};

const getReasonForDelayTypeById = async (id) => {
    const query = `SELECT * FROM reason_for_delay_types WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

module.exports = {
    createReasonForDelayTypesTable,
    createReasonForDelayType,
    getAllReasonForDelayTypes,
    updateReasonForDelayType,
    deleteReasonForDelayType,
    getReasonForDelayTypeById
};
