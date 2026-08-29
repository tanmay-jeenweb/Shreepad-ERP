const db = require('../config/db.js');

const createJobPartyTypesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS job_party_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_party_type_name VARCHAR(100) NOT NULL UNIQUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Job party types table ready");
};

const createJobPartyType = async (jobPartyTypeName, addedBy, deviceId) => {
    const query = `
        INSERT INTO job_party_types (job_party_type_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;

    const [results] = await db.execute(query, [jobPartyTypeName, addedBy, deviceId]);
    return results;
};

const getAllJobPartyTypes = async () => {
    const query = `
        SELECT
            jpt.id,
            jpt.job_party_type_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            jpt.device_id,
            jpt.created_at
        FROM job_party_types jpt
        LEFT JOIN users u ON jpt.added_by = u.id
        ORDER BY jpt.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const updateJobPartyType = async (id, jobPartyTypeName) => {
    const query = `
        UPDATE job_party_types
        SET job_party_type_name = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [jobPartyTypeName, id]);
    return results;
};

const deleteJobPartyType = async (id) => {
    const query = `
        DELETE FROM job_party_types
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [id]);
    return results;
};

const getJobPartyTypeById = async (id) => {
    const query = `SELECT * FROM job_party_types WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

module.exports = {
    createJobPartyTypesTable,
    createJobPartyType,
    getAllJobPartyTypes,
    updateJobPartyType,
    deleteJobPartyType,
    getJobPartyTypeById
};
