const db = require('../config/db.js');

const createBatchSequenceTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS batch_number_sequences (
            id INT AUTO_INCREMENT PRIMARY KEY,
            material_code VARCHAR(3) NOT NULL,
            batch_year VARCHAR(2) NOT NULL,
            last_sequence INT DEFAULT 0,
            UNIQUE KEY unique_batch (material_code, batch_year)
        )
    `;

    await db.execute(query);
    console.log('Batch sequence table ready');
};

const getNextSequence = async (connection, materialCode, batchYear) => {
    // Atomically increment or insert sequence
    const insertQuery = `
        INSERT INTO batch_number_sequences (material_code, batch_year, last_sequence)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE last_sequence = last_sequence + 1
    `;
    await connection.execute(insertQuery, [materialCode, batchYear]);

    // Retrieve the newly incremented value
    const selectQuery = `
        SELECT last_sequence 
        FROM batch_number_sequences 
        WHERE material_code = ? AND batch_year = ?
    `;
    const [rows] = await connection.execute(selectQuery, [materialCode, batchYear]);
    
    return rows[0].last_sequence;
};

module.exports = {
    createBatchSequenceTable,
    getNextSequence
};
