const db = require("../config/db.js");

const createMouldsTable = async () => {
    const mouldsQuery = `
        CREATE TABLE IF NOT EXISTS moulds (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mould_name VARCHAR(150) NOT NULL,
            cavity INT DEFAULT NULL,
            std_cycle_time DECIMAL(10,3) DEFAULT NULL,
            cycle_time_band_sec DECIMAL(8,2) DEFAULT NULL,
            std_production_per_hour DECIMAL(10,2) DEFAULT NULL,
            cycle_time_tolerance DECIMAL(8,2) DEFAULT NULL,
            file_data LONGBLOB DEFAULT NULL,
            file_name VARCHAR(255) DEFAULT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            maintenance BOOLEAN DEFAULT FALSE,
            added_by INT NOT NULL,
            device_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(mouldsQuery);

    const junctionQuery = `
        CREATE TABLE IF NOT EXISTS mould_machines (
            mould_id INT NOT NULL,
            machine_id INT NOT NULL,
            PRIMARY KEY (mould_id, machine_id),
            FOREIGN KEY (mould_id) REFERENCES moulds(id) ON DELETE CASCADE,
            FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
        )
    `;
    await db.execute(junctionQuery);
    console.log("Moulds and mould_machines tables ready");
};

const ensureMouldColumns = async () => {
    try {
        const [rows] = await db.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'moulds' AND COLUMN_NAME = 'maintenance'");
        if (rows.length === 0) {
            await db.execute("ALTER TABLE moulds ADD COLUMN maintenance BOOLEAN DEFAULT FALSE");
            console.log('Added column maintenance to moulds');
        }
    } catch (err) {
        console.error('Error ensuring mould columns:', err.message || err);
    }
};

const createMould = async (data, machineIds = [], fileBuffer = null, fileName = null, fileMime = null) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.execute(
            `INSERT INTO moulds
             (mould_name, cavity, std_cycle_time, cycle_time_band_sec, std_production_per_hour,
              cycle_time_tolerance, file_data, file_name, file_mime, is_active, maintenance, added_by, device_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.mouldName,
                data.cavity || null,
                data.stdCycleTime || null,
                data.cycleTimeBandSec || null,
                data.stdProductionPerHour || null,
                data.cycleTimeTolerance || null,
                fileBuffer || null,
                fileName || null,
                fileMime || null,
                data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
                data.maintenance ? 1 : 0,
                data.addedBy,
                data.deviceId || null
            ]
        );

        const mouldId = result.insertId;

        if (machineIds && machineIds.length > 0) {
            for (const machineId of machineIds) {
                await conn.execute(
                    `INSERT INTO mould_machines (mould_id, machine_id) VALUES (?, ?)`,
                    [mouldId, machineId]
                );
            }
        }

        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const getAllMoulds = async (includeInactive = false) => {
    const whereClause = includeInactive ? '' : 'WHERE m.is_active = TRUE';
    const query = `
        SELECT m.id, m.mould_name, m.cavity, m.std_cycle_time, m.cycle_time_band_sec,
               m.std_production_per_hour, m.cycle_time_tolerance, m.file_name, m.file_mime,
               m.is_active, m.maintenance, m.created_at, m.updated_at,
               COALESCE(u.name, 'Unknown') AS added_by_name,
               GROUP_CONCAT(mc.id ORDER BY mc.id SEPARATOR ',') AS machine_ids,
               GROUP_CONCAT(mc.name ORDER BY mc.id SEPARATOR ', ') AS machine_names
        FROM moulds m
        LEFT JOIN mould_machines mm ON m.id = mm.mould_id
        LEFT JOIN machines mc ON mm.machine_id = mc.id
        LEFT JOIN users u ON m.added_by = u.id
        ${whereClause}
        GROUP BY m.id
        ORDER BY m.id DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getMouldById = async (id) => {
    const [rows] = await db.execute(
        `SELECT m.id, m.mould_name, m.cavity, m.std_cycle_time, m.cycle_time_band_sec,
                m.std_production_per_hour, m.cycle_time_tolerance, m.file_name, m.file_mime,
                m.is_active, m.maintenance, m.added_by, m.device_id, m.created_at, m.updated_at,
                GROUP_CONCAT(mm.machine_id ORDER BY mm.machine_id SEPARATOR ',') AS machine_ids
         FROM moulds m
         LEFT JOIN mould_machines mm ON m.id = mm.mould_id
         WHERE m.id = ?
         GROUP BY m.id`,
        [id]
    );
    return rows[0];
};

const getMouldFile = async (id) => {
    const [rows] = await db.execute(
        `SELECT file_data, file_name, file_mime FROM moulds WHERE id = ?`,
        [id]
    );
    return rows[0];
};

const updateMould = async (id, data, machineIds = [], fileBuffer = null, fileName = null, fileMime = null) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        if (fileBuffer !== null) {
            await conn.execute(
                `UPDATE moulds SET
                    mould_name = ?, cavity = ?, std_cycle_time = ?, cycle_time_band_sec = ?,
                    std_production_per_hour = ?, cycle_time_tolerance = ?,
                    file_data = ?, file_name = ?, file_mime = ?, is_active = ?, maintenance = ?
                 WHERE id = ?`,
                [
                    data.mouldName, data.cavity || null, data.stdCycleTime || null,
                    data.cycleTimeBandSec || null, data.stdProductionPerHour || null,
                    data.cycleTimeTolerance || null,
                    fileBuffer, fileName, fileMime,
                    data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
                    data.maintenance ? 1 : 0,
                    id
                ]
            );
        } else {
            await conn.execute(
                `UPDATE moulds SET
                    mould_name = ?, cavity = ?, std_cycle_time = ?, cycle_time_band_sec = ?,
                    std_production_per_hour = ?, cycle_time_tolerance = ?, is_active = ?, maintenance = ?
                 WHERE id = ?`,
                [
                    data.mouldName, data.cavity || null, data.stdCycleTime || null,
                    data.cycleTimeBandSec || null, data.stdProductionPerHour || null,
                    data.cycleTimeTolerance || null,
                    data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
                    data.maintenance ? 1 : 0,
                    id
                ]
            );
        }

        // Replace junction rows
        await conn.execute(`DELETE FROM mould_machines WHERE mould_id = ?`, [id]);
        if (machineIds && machineIds.length > 0) {
            for (const machineId of machineIds) {
                await conn.execute(
                    `INSERT INTO mould_machines (mould_id, machine_id) VALUES (?, ?)`,
                    [id, machineId]
                );
            }
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const toggleMouldActive = async (id, isActive) => {
    const [result] = await db.execute(
        `UPDATE moulds SET is_active = ? WHERE id = ?`,
        [isActive ? 1 : 0, id]
    );
    return result;
};

const deleteMould = async (id) => {
    const [result] = await db.execute(`DELETE FROM moulds WHERE id = ?`, [id]);
    return result;
};

module.exports = {
    createMouldsTable,
    createMould,
    getAllMoulds,
    getMouldById,
    getMouldFile,
    updateMould,
    toggleMouldActive,
    deleteMould,
    ensureMouldColumns
};
