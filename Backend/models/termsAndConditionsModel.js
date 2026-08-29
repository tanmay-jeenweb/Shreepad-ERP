const db = require('../config/db.js');

const createTermsAndConditionsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS terms_and_conditions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            logs TEXT,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Terms and conditions table ready");
};

const createTermsAndConditions = async (name, description, logs, addedBy, deviceId) => {
    const query = `
        INSERT INTO terms_and_conditions (name, description, logs, added_by, device_id)
        VALUES (?, ?, ?, ?, ?)
    `;

    const [results] = await db.execute(query, [name, description || null, logs || null, addedBy, deviceId]);
    return results;
};

const getAllTermsAndConditions = async () => {
    const query = `
        SELECT
            tc.id,
            tc.name,
            tc.description,
            tc.logs,
            COALESCE(usr.name, 'Unknown') AS added_by_name,
            tc.device_id,
            tc.created_at
        FROM terms_and_conditions tc
        LEFT JOIN users usr ON tc.added_by = usr.id
        ORDER BY tc.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const getTermsAndConditionsById = async (id) => {
    const query = `SELECT * FROM terms_and_conditions WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateTermsAndConditions = async (id, name, description, logs) => {
    const query = `
        UPDATE terms_and_conditions
        SET name = ?, description = ?, logs = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [name, description || null, logs || null, id]);
    return results;
};

const deleteTermsAndConditions = async (id) => {
    const query = `
        DELETE FROM terms_and_conditions
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createTermsAndConditionsTable,
    createTermsAndConditions,
    getAllTermsAndConditions,
    getTermsAndConditionsById,
    updateTermsAndConditions,
    deleteTermsAndConditions
};
