const db = require('../config/db');

const createDocumentMasterTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS document_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            document_type enum('personal', 'organization', 'both') NOT NULL,
            document_name VARCHAR(255) NOT NULL,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await db.query(query);

    console.log("Document master table ready");
};

const createDocumentMaster = async (documentType, documentName, addedBy, deviceId) => {
    const query = `
        INSERT INTO document_master (document_type, document_name, added_by, device_id)
        VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [documentType, documentName, addedBy, deviceId]);
    return result;
};

const getAllDocumentMasters = async () => {
    const query = `
        SELECT * FROM document_master
    `;
    const [results] = await db.query(query);
    return results;
};

const updateDocumentMaster = async (id, documentType, documentName) => {
    const query = `
        UPDATE document_master
        SET document_type = ?, document_name = ?
        WHERE id = ?
    `;
    const [result] = await db.query(query, [documentType, documentName, id]);
    return result;
};


const deleteDocumentMaster = async (id) => {
    const query = `
        DELETE FROM document_master
        WHERE id = ?
    `;
    const [result] = await db.query(query, [id]);
    return result;
};

const getDocumentMasterById = async (id) => {
    const query = `
        SELECT * FROM document_master
        WHERE id = ?
    `;
    const [results] = await db.query(query, [id]);
    return results[0];
};


module.exports = { createDocumentMasterTable, createDocumentMaster, getAllDocumentMasters, updateDocumentMaster, deleteDocumentMaster, getDocumentMasterById };