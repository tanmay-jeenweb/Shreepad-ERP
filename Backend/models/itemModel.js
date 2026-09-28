const db = require('../config/db.js');

const createItemsTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS items (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                item_name  VARCHAR(100) NOT NULL UNIQUE,
                added_by   INT NOT NULL,
                device_id  VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        await db.execute(query);
        console.log('Items table ready');
    } catch (err) {
        console.error('Error creating items table:', err);
    }
};

const createItem = async (itemName, addedBy, deviceId) => {
    const query = `
        INSERT INTO items (item_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;
    const [results] = await db.execute(query, [itemName, addedBy, deviceId]);
    return results;
};

const getAllItems = async () => {
    const query = `
        SELECT
            i.id,
            i.item_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            i.device_id,
            i.created_at,
            i.updated_at
        FROM items i
        LEFT JOIN users u ON i.added_by = u.id
        ORDER BY i.created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getItemById = async (id) => {
    const query = `SELECT * FROM items WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateItem = async (id, itemName) => {
    const query = `
        UPDATE items
        SET item_name = ?
        WHERE id = ?
    `;
    const [results] = await db.execute(query, [itemName, id]);
    return results;
};

const deleteItem = async (id) => {
    const query = `DELETE FROM items WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createItemsTable,
    createItem,
    getAllItems,
    getItemById,
    updateItem,
    deleteItem,
};
