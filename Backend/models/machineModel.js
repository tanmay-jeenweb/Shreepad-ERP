const db = require("../config/db.js");

const createMachinesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS machines (
            id INT AUTO_INCREMENT PRIMARY KEY,
            machine_number VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(150) NOT NULL,
            machine_type_id INT DEFAULT NULL,
            capacity VARCHAR(100) DEFAULT NULL,
            location_id INT DEFAULT NULL,
            company_name VARCHAR(150) DEFAULT NULL,
            outgoing_job_work BOOLEAN DEFAULT FALSE,
            machine_shift VARCHAR(50) DEFAULT NULL,
            maintenance BOOLEAN DEFAULT FALSE,
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
        const [rows] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machines' AND COLUMN_NAME IN ('added_by','device_id','active', 'maintenance')");
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

        if (!existing.includes('maintenance')) {
            await db.execute("ALTER TABLE machines ADD COLUMN maintenance BOOLEAN DEFAULT FALSE");
            console.log('Added column maintenance to machines');
        }
    } catch (err) {
        console.error('Error ensuring machine columns:', err.message || err);
    }
};

const createMachine = async (
    machineNumber,
    name,
    machineTypeId = null,
    capacity = null,
    locationId = null,
    companyName = null,
    outgoingJobWork = false,
    machineShift = null,
    maintenance = false,
    addedBy,
    deviceId = null,
    active = true
) => {
    const query = `
        INSERT INTO machines
        (machine_number, name, machine_type_id, capacity, location_id, company_name, outgoing_job_work, machine_shift, maintenance, added_by, device_id, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
        machineNumber,
        name,
        machineTypeId,
        capacity,
        locationId,
        companyName,
        outgoingJobWork ? 1 : 0,
        machineShift,
        maintenance ? 1 : 0,
        addedBy,
        deviceId,
        active ? 1 : 0
    ]);

    return result;
};

const getAllMachines = async (includeInactive = false) => {
    const whereClause = includeInactive ? '' : 'WHERE m.active = TRUE';
    const query = `
        SELECT m.*, mt.machine_type_name AS machine_type_name, l.location_name AS location_name,
               COALESCE(u.name, 'Unknown') AS added_by_name, m.device_id, m.active
        FROM machines m
        LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
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
    machineTypeId = null,
    capacity = null,
    locationId = null,
    companyName = null,
    outgoingJobWork = false,
    machineShift = null,
    maintenance = false,
    active = true
) => {
    const query = `
        UPDATE machines SET
            machine_number = ?,
            name = ?,
            machine_type_id = ?,
            capacity = ?,
            location_id = ?,
            company_name = ?,
            outgoing_job_work = ?,
            machine_shift = ?,
            maintenance = ?,
            active = ?
        WHERE id = ?
    `;

    const [result] = await db.execute(query, [
        machineNumber,
        name,
        machineTypeId,
        capacity,
        locationId,
        companyName,
        outgoingJobWork ? 1 : 0,
        machineShift,
        maintenance ? 1 : 0,
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
