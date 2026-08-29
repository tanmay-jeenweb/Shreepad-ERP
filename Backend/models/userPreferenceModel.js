const db = require("../config/db.js");

const createUserPreferencesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS user_table_preferences (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            table_id VARCHAR(100) NOT NULL,
            column_order JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY user_table_unique (user_id, table_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log("user_table_preferences table ready");
};

const getPreference = async (userId, tableId) => {
    const query = `SELECT column_order FROM user_table_preferences WHERE user_id = ? AND table_id = ?`;
    const [rows] = await db.execute(query, [userId, tableId]);
    return rows[0];
};

const savePreference = async (userId, tableId, columnOrder) => {
    const query = `
        INSERT INTO user_table_preferences (user_id, table_id, column_order)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE column_order = VALUES(column_order)
    `;
    const [result] = await db.execute(query, [userId, tableId, JSON.stringify(columnOrder)]);
    return result;
};

module.exports = {
    createUserPreferencesTable,
    getPreference,
    savePreference
};
