const db = require('../config/db.js');

const createOperatorsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS operators (
            id INT AUTO_INCREMENT PRIMARY KEY,
            operator_code VARCHAR(100) NOT NULL UNIQUE,
            operator_name VARCHAR(255) NOT NULL,
            date_of_joining DATE,
            information TEXT,
            operator_type_id INT,
            active BOOLEAN DEFAULT TRUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (operator_type_id) REFERENCES operator_types(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Operators table ready");
};

const ensureOperatorColumns = async () => {
    const columnsToEnsure = [
        { name: 'active', query: 'ALTER TABLE operators ADD COLUMN active BOOLEAN DEFAULT TRUE' }
    ];

    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operators' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to operators`);
        }
    }
};

const createOperator = async (data, addedBy, deviceId) => {
    const {
        operatorCode,
        operatorName,
        dateOfJoining,
        information,
        operatorTypeId
    } = data;

    const query = `
        INSERT INTO operators (operator_code, operator_name, date_of_joining, information, operator_type_id, added_by, device_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [results] = await db.execute(query, [
        operatorCode,
        operatorName,
        dateOfJoining || null,
        information || null,
        operatorTypeId || null,
        addedBy,
        deviceId
    ]);

    return results;
};

const getAllOperators = async (includeInactive = false) => {
    const whereClause = includeInactive ? '' : 'WHERE o.active = 1 OR o.active IS NULL';
    const query = `
        SELECT
            o.id,
            o.operator_code,
            o.operator_name,
            o.date_of_joining,
            o.information,
            o.operator_type_id,
            o.active,
            ot.operator_type_name,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            o.device_id,
            o.created_at
        FROM operators o
        LEFT JOIN operator_types ot ON o.operator_type_id = ot.id
        LEFT JOIN users u ON o.added_by = u.id
        ${whereClause}
        ORDER BY o.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const getOperatorById = async (id) => {
    const query = `SELECT * FROM operators WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateOperator = async (id, data) => {
    const {
        operatorCode,
        operatorName,
        dateOfJoining,
        information,
        operatorTypeId
    } = data;

    const query = `
        UPDATE operators
        SET
            operator_code = ?,
            operator_name = ?,
            date_of_joining = ?,
            information = ?,
            operator_type_id = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [
        operatorCode,
        operatorName,
        dateOfJoining || null,
        information || null,
        operatorTypeId || null,
        id
    ]);

    return results;
};

const toggleOperatorActive = async (id, active) => {
    const query = `UPDATE operators SET active = ? WHERE id = ?`;
    const [result] = await db.execute(query, [active ? 1 : 0, id]);
    return result;
};

const deleteOperator = async (id) => {
    const query = `DELETE FROM operators WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createOperatorsTable,
    ensureOperatorColumns,
    createOperator,
    getAllOperators,
    getOperatorById,
    updateOperator,
    toggleOperatorActive,
    deleteOperator
};
