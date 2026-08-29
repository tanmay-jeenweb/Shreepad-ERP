const db = require("../config/db.js");

const createWorkingHoursTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS working_hours (
            id INT AUTO_INCREMENT PRIMARY KEY,
            machine_id INT NOT NULL,
            from_date DATE NOT NULL,
            to_date DATE NOT NULL,
            working_hour DECIMAL(10, 2) NOT NULL,
            no_work BOOLEAN DEFAULT FALSE,
            added_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Working hours table ready");
};

const createWorkingHoursLog = async (machineIds, fromDate, toDate, workingHour, noWork, addedBy) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const insertQuery = `
            INSERT INTO working_hours (machine_id, from_date, to_date, working_hour, no_work, added_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        for (const machineId of machineIds) {
            await connection.execute(insertQuery, [
                machineId,
                fromDate,
                toDate,
                workingHour,
                noWork ? 1 : 0,
                addedBy
            ]);
        }
        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getAllWorkingHours = async () => {
    const query = `
        SELECT wh.*, m.name AS machine_name, m.machine_number AS machine_number,
               COALESCE(u.name, 'Unknown') AS added_by_name
        FROM working_hours wh
        LEFT JOIN machines m ON wh.machine_id = m.id
        LEFT JOIN users u ON wh.added_by = u.id
        ORDER BY wh.id DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getWorkingHourById = async (id) => {
    const query = `
        SELECT wh.*, m.name AS machine_name, m.machine_number AS machine_number
        FROM working_hours wh
        LEFT JOIN machines m ON wh.machine_id = m.id
        WHERE wh.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows.length > 0 ? rows[0] : null;
};

const updateWorkingHour = async (id, { fromDate, toDate, workingHour, noWork }) => {
    const query = `
        UPDATE working_hours
        SET from_date = ?, to_date = ?, working_hour = ?, no_work = ?
        WHERE id = ?
    `;
    const [result] = await db.execute(query, [
        fromDate,
        toDate,
        workingHour,
        noWork ? 1 : 0,
        id
    ]);
    return result.affectedRows > 0;
};

module.exports = {
    createWorkingHoursTable,
    createWorkingHoursLog,
    getAllWorkingHours,
    getWorkingHourById,
    updateWorkingHour
};

