const db = require('../config/db.js');

const createJobPartiesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS job_parties (
            id INT AUTO_INCREMENT PRIMARY KEY,
            party_name VARCHAR(150) NOT NULL UNIQUE,
            remark TEXT,
            job_party_type_id INT,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (job_party_type_id) REFERENCES job_party_types(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Job parties table ready");
};

const createJobParty = async (data, addedBy, deviceId) => {
    const {
        partyName,
        remark,
        jobPartyTypeId
    } = data;

    const query = `
        INSERT INTO job_parties (party_name, remark, job_party_type_id, added_by, device_id)
        VALUES (?, ?, ?, ?, ?)
    `;

    const [results] = await db.execute(query, [
        partyName,
        remark || null,
        jobPartyTypeId || null,
        addedBy,
        deviceId
    ]);

    return results;
};

const getAllJobParties = async () => {
    const query = `
        SELECT
            jp.id,
            jp.party_name,
            jp.remark,
            jp.job_party_type_id,
            jpt.job_party_type_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            jp.device_id,
            jp.created_at
        FROM job_parties jp
        LEFT JOIN job_party_types jpt ON jp.job_party_type_id = jpt.id
        LEFT JOIN users u ON jp.added_by = u.id
        ORDER BY jp.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const getJobPartyById = async (id) => {
    const query = `SELECT * FROM job_parties WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateJobParty = async (id, data) => {
    const {
        partyName,
        remark,
        jobPartyTypeId
    } = data;

    const query = `
        UPDATE job_parties
        SET
            party_name = ?,
            remark = ?,
            job_party_type_id = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [
        partyName,
        remark || null,
        jobPartyTypeId || null,
        id
    ]);

    return results;
};

const deleteJobParty = async (id) => {
    const query = `DELETE FROM job_parties WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createJobPartiesTable,
    createJobParty,
    getAllJobParties,
    getJobPartyById,
    updateJobParty,
    deleteJobParty
};
