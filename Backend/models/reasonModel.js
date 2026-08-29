const db = require('../config/db.js');

const createReasonMasterTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS reason_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reason_type VARCHAR(150) NOT NULL,
            count_in_product_eff BOOLEAN DEFAULT FALSE,
            active BOOLEAN DEFAULT TRUE,
            added_by INT,
            device_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `;
    await db.execute(query);
    console.log("Reason master table ready");
};

const createReason = async (reason_type, count_in_product_eff, added_by, device_id) => {
    const query = `
        INSERT INTO reason_master (reason_type, count_in_product_eff, added_by, device_id)
        VALUES (?, ?, ?, ?)
    `;
    const [results] = await db.execute(query, [
        reason_type, 
        count_in_product_eff ? 1 : 0,
        added_by,
        device_id || null
    ]);
    return results;
};

const getAllReasons = async (includeInactive = false) => {
    const whereClause = includeInactive ? '' : 'WHERE active = 1';
    const query = `
        SELECT *
        FROM reason_master
        ${whereClause}
        ORDER BY created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getReasonById = async (id) => {
    const query = `SELECT * FROM reason_master WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateReason = async (id, reason_type, count_in_product_eff) => {
    const query = `
        UPDATE reason_master
        SET reason_type = ?, count_in_product_eff = ?
        WHERE id = ?
    `;
    const [results] = await db.execute(query, [
        reason_type, 
        count_in_product_eff ? 1 : 0, 
        id
    ]);
    return results;
};

const toggleReasonActive = async (id, active) => {
    const query = `UPDATE reason_master SET active = ? WHERE id = ?`;
    const [results] = await db.execute(query, [active ? 1 : 0, id]);
    return results;
};

const deleteReason = async (id) => {
    const query = `DELETE FROM reason_master WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createReasonMasterTable,
    createReason,
    getAllReasons,
    getReasonById,
    updateReason,
    toggleReasonActive,
    deleteReason
};
