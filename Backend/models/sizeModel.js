const db = require('../config/db.js');

const createSizesTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS sizes (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                size_name  VARCHAR(100) NOT NULL UNIQUE,
                added_by   INT NOT NULL,
                device_id  VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        await db.execute(query);
        console.log('Sizes table ready');
    } catch (err) {
        console.error('Error creating sizes table:', err);
    }
};

const createSize = async (sizeName, addedBy, deviceId) => {
    const query = `
        INSERT INTO sizes (size_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;
    const [results] = await db.execute(query, [sizeName, addedBy, deviceId]);
    return results;
};

const getAllSizes = async () => {
    const query = `
        SELECT
            s.id,
            s.size_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            s.device_id,
            s.created_at,
            s.updated_at
        FROM sizes s
        LEFT JOIN users u ON s.added_by = u.id
        ORDER BY s.created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getSizeById = async (id) => {
    const query = `SELECT * FROM sizes WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateSize = async (id, sizeName) => {
    const query = `
        UPDATE sizes
        SET size_name = ?
        WHERE id = ?
    `;
    const [results] = await db.execute(query, [sizeName, id]);
    return results;
};

const deleteSize = async (id) => {
    const query = `DELETE FROM sizes WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createSizesTable,
    createSize,
    getAllSizes,
    getSizeById,
    updateSize,
    deleteSize,
};
