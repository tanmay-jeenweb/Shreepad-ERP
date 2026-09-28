const db = require('../config/db.js');

const createClassesTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS classes (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                class_name VARCHAR(100) NOT NULL UNIQUE,
                added_by   INT NOT NULL,
                device_id  VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        await db.execute(query);
        console.log('Classes table ready');
    } catch (err) {
        console.error('Error creating classes table:', err);
    }
};

const createClass = async (className, addedBy, deviceId) => {
    const query = `
        INSERT INTO classes (class_name, added_by, device_id)
        VALUES (?, ?, ?)
    `;
    const [results] = await db.execute(query, [className, addedBy, deviceId]);
    return results;
};

const getAllClasses = async () => {
    const query = `
        SELECT
            c.id,
            c.class_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            c.device_id,
            c.created_at,
            c.updated_at
        FROM classes c
        LEFT JOIN users u ON c.added_by = u.id
        ORDER BY c.created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getClassById = async (id) => {
    const query = `SELECT * FROM classes WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateClass = async (id, className) => {
    const query = `
        UPDATE classes
        SET class_name = ?
        WHERE id = ?
    `;
    const [results] = await db.execute(query, [className, id]);
    return results;
};

const deleteClass = async (id) => {
    const query = `DELETE FROM classes WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createClassesTable,
    createClass,
    getAllClasses,
    getClassById,
    updateClass,
    deleteClass,
};
