const db = require('../config/db.js');

const createProcessMastersTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS process_masters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            process_name VARCHAR(100) NOT NULL UNIQUE,
            logs TEXT,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);

    console.log("Process masters table ready");
};

const createProcess = async (processName, logs, addedBy, deviceId) => {
    const query = `
        INSERT INTO process_masters (process_name, logs, added_by, device_id)
        VALUES (?, ?, ?, ?)
    `;

    const [results] = await db.execute(query, [processName, logs || null, addedBy, deviceId]);
    return results;
};

const getAllProcesses = async () => {
    const query = `
        SELECT
            p.id,
            p.process_name,
            p.logs,
            COALESCE(usr.name, 'Unknown') AS added_by_name,
            p.device_id,
            p.created_at
        FROM process_masters p
        LEFT JOIN users usr ON p.added_by = usr.id
        ORDER BY p.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const updateProcess = async (id, processName, logs) => {
    const query = `
        UPDATE process_masters
        SET process_name = ?, logs = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [processName, logs || null, id]);
    return results;
};

const deleteProcess = async (id) => {
    const query = `
        DELETE FROM process_masters
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);
    return results;
};

const getProcessById = async (id) => {
    const query = `SELECT * FROM process_masters WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

module.exports = {
    createProcessMastersTable,
    createProcess,
    getAllProcesses,
    updateProcess,
    deleteProcess,
    getProcessById
};
