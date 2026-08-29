const db = require('../config/db.js');

const createOperatorTypesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS operator_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            operator_type_name VARCHAR(100) NOT NULL UNIQUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Operator types table ready");
};

const createOperatorType = async (operatorTypeName, addedBy, deviceId) => {
    const query = `
        INSERT INTO operator_types (operator_type_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;

    const [results] = await db.execute(query, [operatorTypeName, addedBy, deviceId]);
    return results;
};

const getAllOperatorTypes = async () => {
    const query = `
        SELECT
            ot.id,
            ot.operator_type_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            ot.device_id,
            ot.created_at
        FROM operator_types ot
        LEFT JOIN users u ON ot.added_by = u.id
        ORDER BY ot.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const updateOperatorType = async (id, operatorTypeName) => {
    const query = `
        UPDATE operator_types
        SET operator_type_name = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [operatorTypeName, id]);
    return results;
};

const deleteOperatorType = async (id) => {
    const query = `
        DELETE FROM operator_types
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);
    return results;
};

const getOperatorTypeById = async (id) => {
    const query = `SELECT * FROM operator_types WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

module.exports = {
    createOperatorTypesTable,
    createOperatorType,
    getAllOperatorTypes,
    updateOperatorType,
    deleteOperatorType,
    getOperatorTypeById
};
