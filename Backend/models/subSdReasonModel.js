const db = require('../config/db.js');

const createSubSdReasonMasterTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS sub_sd_reason_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_sd_name VARCHAR(255) NOT NULL,
            reason_id INT NOT NULL,
            code VARCHAR(100) NOT NULL,
            mould_id INT NOT NULL,
            active BOOLEAN DEFAULT TRUE,
            added_by INT,
            device_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (reason_id) REFERENCES reason_master(id) ON DELETE RESTRICT,
            FOREIGN KEY (mould_id) REFERENCES moulds(id) ON DELETE RESTRICT,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `;
    await db.execute(query);
    console.log("Sub S/D Reason master table ready");
};

const createSubSdReason = async (sub_sd_name, reason_id, code, mould_id, added_by, device_id) => {
    const query = `
        INSERT INTO sub_sd_reason_master (sub_sd_name, reason_id, code, mould_id, added_by, device_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [results] = await db.execute(query, [sub_sd_name, reason_id, code, mould_id, added_by, device_id || null]);
    return results;
};

const getAllSubSdReasons = async (includeInactive = false) => {
    const whereClause = includeInactive ? '' : 'WHERE s.active = 1';
    const query = `
        SELECT 
            s.*,
            r.reason_type as reason_name_val,
            m.mould_name as mould_name_val
        FROM sub_sd_reason_master s
        LEFT JOIN reason_master r ON s.reason_id = r.id
        LEFT JOIN moulds m ON s.mould_id = m.id
        ${whereClause}
        ORDER BY s.created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getSubSdReasonById = async (id) => {
    const query = `SELECT * FROM sub_sd_reason_master WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateSubSdReason = async (id, sub_sd_name, reason_id, code, mould_id) => {
    const query = `
        UPDATE sub_sd_reason_master
        SET sub_sd_name = ?, reason_id = ?, code = ?, mould_id = ?
        WHERE id = ?
    `;
    const [results] = await db.execute(query, [sub_sd_name, reason_id, code, mould_id, id]);
    return results;
};

const toggleSubSdReasonActive = async (id, active) => {
    const query = `UPDATE sub_sd_reason_master SET active = ? WHERE id = ?`;
    const [results] = await db.execute(query, [active ? 1 : 0, id]);
    return results;
};

const deleteSubSdReason = async (id) => {
    const query = `DELETE FROM sub_sd_reason_master WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createSubSdReasonMasterTable,
    createSubSdReason,
    getAllSubSdReasons,
    getSubSdReasonById,
    updateSubSdReason,
    toggleSubSdReasonActive,
    deleteSubSdReason
};
