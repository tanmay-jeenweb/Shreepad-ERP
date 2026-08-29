const db = require('../config/db.js');

const createReasonsForDelayTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS reasons_for_delay (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reason_name VARCHAR(255) NOT NULL,
            reason_type_id INT,
            remark TEXT,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (reason_type_id) REFERENCES reason_for_delay_types(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Reasons for delay table ready");
};

const createReasonForDelay = async (data, addedBy, deviceId) => {
    const { reasonName, reasonTypeId, remark } = data;

    const query = `
        INSERT INTO reasons_for_delay (reason_name, reason_type_id, remark, added_by, device_id)
        VALUES (?, ?, ?, ?, ?)
    `;

    const [results] = await db.execute(query, [
        reasonName,
        reasonTypeId || null,
        remark || null,
        addedBy,
        deviceId
    ]);

    return results;
};

const getAllReasonsForDelay = async () => {
    const query = `
        SELECT
            rd.id,
            rd.reason_name,
            rd.reason_type_id,
            rdt.reason_type_name,
            rd.remark,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            rd.device_id,
            rd.created_at
        FROM reasons_for_delay rd
        LEFT JOIN reason_for_delay_types rdt ON rd.reason_type_id = rdt.id
        LEFT JOIN users u ON rd.added_by = u.id
        ORDER BY rd.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const getReasonForDelayById = async (id) => {
    const query = `SELECT * FROM reasons_for_delay WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateReasonForDelay = async (id, data) => {
    const { reasonName, reasonTypeId, remark } = data;

    const query = `
        UPDATE reasons_for_delay
        SET
            reason_name = ?,
            reason_type_id = ?,
            remark = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [
        reasonName,
        reasonTypeId || null,
        remark || null,
        id
    ]);

    return results;
};

const deleteReasonForDelay = async (id) => {
    const query = `DELETE FROM reasons_for_delay WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createReasonsForDelayTable,
    createReasonForDelay,
    getAllReasonsForDelay,
    getReasonForDelayById,
    updateReasonForDelay,
    deleteReasonForDelay
};
