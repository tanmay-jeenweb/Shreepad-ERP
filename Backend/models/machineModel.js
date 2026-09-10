const db = require("../config/db.js");

const createMachinesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS machines (
            id INT AUTO_INCREMENT PRIMARY KEY,
            machine_number VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(150) NOT NULL,
            capacity VARCHAR(100) DEFAULT NULL,
            location_id INT DEFAULT NULL,
            outgoing_job_work BOOLEAN DEFAULT FALSE,
            added_by INT NOT NULL,
            device_id VARCHAR(255) DEFAULT NULL,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Machines table ready");
};

const ensureMachineColumns = async () => {
    try {
        const [rows] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machines'");
        const existing = rows.map(r => r.COLUMN_NAME);

        if (!existing.includes('added_by')) {
            await db.execute("ALTER TABLE machines ADD COLUMN added_by INT DEFAULT NULL");
            console.log('Added column added_by to machines');
        }

        if (!existing.includes('device_id')) {
            await db.execute("ALTER TABLE machines ADD COLUMN device_id VARCHAR(255) DEFAULT NULL");
            console.log('Added column device_id to machines');
        }

        if (!existing.includes('active')) {
            await db.execute("ALTER TABLE machines ADD COLUMN active BOOLEAN DEFAULT TRUE");
            console.log('Added column active to machines');
        }

        // Clean up removed columns if they exist
        const columnsToDrop = ['company_name', 'machine_shift', 'maintenance'];
        for (const col of columnsToDrop) {
            if (existing.includes(col)) {
                await db.execute(`ALTER TABLE machines DROP COLUMN ${col}`);
                console.log(`Dropped column ${col} from machines`);
            }
        }
    } catch (err) {
        console.error('Error ensuring machine columns:', err.message || err);
    }
};

const createMachine = async (
    machineNumber,
    name,
    capacity = null,
    locationId = null,
    outgoingJobWork = false,
    addedBy,
    deviceId = null,
    active = true
) => {
    const query = `
        INSERT INTO machines
        (machine_number, name, capacity, location_id, outgoing_job_work, added_by, device_id, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
        machineNumber,
        name,
        capacity,
        locationId,
        outgoingJobWork ? 1 : 0,
        addedBy,
        deviceId,
        active ? 1 : 0
    ]);

    return result;
};

const getAllMachines = async (includeInactive = false) => {
    const whereClause = includeInactive ? '' : 'WHERE m.active = TRUE';
    const query = `
        SELECT m.*, l.location_name AS location_name,
               COALESCE(u.name, 'Unknown') AS added_by_name, m.device_id, m.active
        FROM machines m
        LEFT JOIN locations l ON m.location_id = l.id
        LEFT JOIN users u ON m.added_by = u.id
        ${whereClause}
        ORDER BY m.id DESC
    `;

    const [rows] = await db.execute(query);
    return rows;
};

const getMachineById = async (id) => {
    const query = `SELECT * FROM machines WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateMachine = async (
    id,
    machineNumber,
    name,
    capacity = null,
    locationId = null,
    outgoingJobWork = false,
    active = true
) => {
    const query = `
        UPDATE machines SET
            machine_number = ?,
            name = ?,
            capacity = ?,
            location_id = ?,
            outgoing_job_work = ?,
            active = ?
        WHERE id = ?
    `;

    const [result] = await db.execute(query, [
        machineNumber,
        name,
        capacity,
        locationId,
        outgoingJobWork ? 1 : 0,
        active ? 1 : 0,
        id
    ]);

    return result;
};

const toggleMachineActive = async (id, active) => {
    const query = `UPDATE machines SET active = ? WHERE id = ?`;
    const [result] = await db.execute(query, [active ? 1 : 0, id]);
    return result;
};

const deleteMachine = async (id) => {
    const query = `DELETE FROM machines WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result;
};

module.exports = {
    createMachinesTable,
    ensureMachineColumns,
    createMachine,
    getAllMachines,
    getMachineById,
    updateMachine,
    toggleMachineActive,
    deleteMachine
};
