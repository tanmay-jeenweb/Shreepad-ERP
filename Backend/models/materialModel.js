const db = require('../config/db.js');

const createMaterialsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS materials (
            id INT AUTO_INCREMENT PRIMARY KEY,
            material_code VARCHAR(100) NOT NULL UNIQUE,
            prefix VARCHAR(10) DEFAULT NULL,
            material_name VARCHAR(255) NOT NULL,
            unit_id INT,
            pts_code VARCHAR(50),
            pst_code VARCHAR(50),
            hsn_code VARCHAR(50),
            material_group VARCHAR(100),
            material_type VARCHAR(100),
            gst_percent VARCHAR(50),
            self_val DECIMAL(15,2),
            purchase_val DECIMAL(15,2),
            unit_weight DECIMAL(15,4),
            details TEXT,
            remarks TEXT,
            active BOOLEAN DEFAULT TRUE,
            added_by INT NOT NULL,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log('Materials table ready');
};

const ensureMaterialColumns = async () => {
    const columnsToEnsure = [
        { name: 'active', query: 'ALTER TABLE materials ADD COLUMN active BOOLEAN DEFAULT TRUE' },
        { name: 'prefix', query: 'ALTER TABLE materials ADD COLUMN prefix VARCHAR(10) DEFAULT NULL' },
        { name: 'pts_code', query: 'ALTER TABLE materials ADD COLUMN pts_code VARCHAR(50) DEFAULT NULL' },
        { name: 'pst_code', query: 'ALTER TABLE materials ADD COLUMN pst_code VARCHAR(50) DEFAULT NULL' },
        { name: 'material_group', query: 'ALTER TABLE materials ADD COLUMN material_group VARCHAR(100) DEFAULT NULL' },
    ];

    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to materials`);
        }
    }

    // Cleanup dropped columns and foreign keys
    try {
        const [fkRows] = await db.execute(
            `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = 'material_group_id' AND REFERENCED_TABLE_NAME IS NOT NULL`
        );
        for (const row of fkRows) {
            await db.execute(`ALTER TABLE materials DROP FOREIGN KEY ${row.CONSTRAINT_NAME}`);
            console.log(`Dropped FK ${row.CONSTRAINT_NAME} from materials`);
        }

        const columnsToDrop = ['code', 'material_group_id'];
        for (const col of columnsToDrop) {
            const [cRows] = await db.execute(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = ?`,
                [col]
            );
            if (cRows.length > 0) {
                await db.execute(`ALTER TABLE materials DROP COLUMN ${col}`);
                console.log(`Dropped column ${col} from materials`);
            }
        }
    } catch (cleanupErr) {
        console.error('Error during materials column cleanup:', cleanupErr.message);
    }

    // Sync pts_code from pst_code or hsn_code
    try {
        await db.execute(`UPDATE materials SET pts_code = COALESCE(pst_code, hsn_code) WHERE (pts_code IS NULL OR pts_code = '') AND (pst_code IS NOT NULL OR hsn_code IS NOT NULL)`);
        await db.execute(`UPDATE materials SET pst_code = pts_code WHERE (pst_code IS NULL OR pst_code = '') AND pts_code IS NOT NULL`);
    } catch (ptsSyncErr) {
        console.error('Error syncing pts_code:', ptsSyncErr.message);
    }

    // Sync material_group from legacy material_type if material_group was empty
    try {
        await db.execute(`UPDATE materials SET material_group = material_type WHERE (material_group IS NULL OR material_group = '') AND material_type IS NOT NULL AND material_type != ''`);
        // Clear material_type if it still has legacy group names so it only stores values from the Material Type Master
        await db.execute(`UPDATE materials SET material_type = NULL WHERE material_type = material_group OR material_type IN ('Finished Goods', 'Semi Finished Goods', 'Raw Materials', 'Store Consumed', 'Packaging Material', 'Waste and scrap', 'Capital Equipment', 'Assembly Item', 'Uniform and other Item', 'Service', 'Other')`);
    } catch (groupSyncErr) {
        console.error('Error syncing material_group and cleaning material_type:', groupSyncErr.message);
    }

    try {
        await db.execute(`UPDATE materials SET prefix = 'FG' WHERE material_group = 'Finished Goods' AND (prefix IS NULL OR prefix = '')`);
        await db.execute(`UPDATE materials SET prefix = 'SFG' WHERE material_group = 'Semi Finished Goods' AND (prefix IS NULL OR prefix = '')`);
        await db.execute(`UPDATE materials SET prefix = 'RM' WHERE material_group = 'Raw Materials' AND (prefix IS NULL OR prefix = '')`);
    } catch (err) {
        console.error('Error populating default material prefixes:', err);
    }
};

const createMaterial = async (data, addedBy, deviceId) => {
    const {
        materialCode,
        prefix,
        materialName,
        unitId,
        ptsCode,
        pstCode,
        hsnCode,
        materialGroup,
        materialType,
        gstPercent,
        selfVal,
        purchaseVal,
        unitWeight,
        details,
        remarks
    } = data;

    const resolvedPtsCode = (ptsCode !== undefined && ptsCode !== null)
        ? ptsCode
        : ((pstCode !== undefined && pstCode !== null) ? pstCode : (hsnCode || null));

    const resolvedMaterialGroup = materialGroup || null;
    const resolvedMaterialType = materialType || null;

    const query = `
        INSERT INTO materials (
            material_code,
            prefix,
            material_name,
            unit_id,
            pts_code,
            pst_code,
            hsn_code,
            material_group,
            material_type,
            gst_percent,
            self_val,
            purchase_val,
            unit_weight,
            details,
            remarks,
            added_by,
            device_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [results] = await db.execute(query, [
        materialCode,
        prefix || null,
        materialName,
        unitId || null,
        resolvedPtsCode || null,
        resolvedPtsCode || null,
        resolvedPtsCode || null,
        resolvedMaterialGroup,
        resolvedMaterialType,
        gstPercent || null,
        selfVal !== undefined && selfVal !== null && selfVal !== '' ? Number(selfVal) : null,
        purchaseVal !== undefined && purchaseVal !== null && purchaseVal !== '' ? Number(purchaseVal) : null,
        unitWeight !== undefined && unitWeight !== null && unitWeight !== '' ? Number(unitWeight) : null,
        details || null,
        remarks || null,
        addedBy,
        deviceId
    ]);

    return results;
};

const getAllMaterials = async (includeInactive = false) => {
    const whereClause = includeInactive ? '' : 'WHERE m.active = 1 OR m.active IS NULL';
    const query = `
        SELECT
            m.id,
            m.material_code,
            m.prefix,
            m.material_name,
            m.unit_id,
            u.unit_name,
            COALESCE(m.pts_code, m.pst_code, m.hsn_code) AS pts_code,
            COALESCE(m.pts_code, m.pst_code, m.hsn_code) AS pst_code,
            COALESCE(m.pts_code, m.pst_code, m.hsn_code) AS hsn_code,
            m.material_group,
            m.material_type,
            m.gst_percent,
            m.self_val,
            m.purchase_val,
            m.unit_weight,
            m.details,
            m.remarks,
            m.active,
            COALESCE(usr.name, 'Unknown') AS added_by_name,
            m.device_id,
            m.created_at
        FROM materials m
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN users usr ON m.added_by = usr.id
        ${whereClause}
        ORDER BY m.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const getMaterialById = async (id) => {
    const query = `
        SELECT
            m.*,
            COALESCE(m.pts_code, m.pst_code, m.hsn_code) AS pts_code,
            COALESCE(m.pts_code, m.pst_code, m.hsn_code) AS pst_code,
            m.material_group,
            m.material_type
        FROM materials m
        WHERE m.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
};

const updateMaterial = async (id, data) => {
    const {
        materialCode,
        prefix,
        materialName,
        unitId,
        ptsCode,
        pstCode,
        hsnCode,
        materialGroup,
        materialType,
        gstPercent,
        selfVal,
        purchaseVal,
        unitWeight,
        details,
        remarks
    } = data;

    const resolvedPtsCode = (ptsCode !== undefined && ptsCode !== null)
        ? ptsCode
        : ((pstCode !== undefined && pstCode !== null) ? pstCode : (hsnCode || null));

    const resolvedMaterialGroup = materialGroup !== undefined ? (materialGroup || null) : null;
    const resolvedMaterialType = materialType !== undefined ? (materialType || null) : null;

    const query = `
        UPDATE materials
        SET
            material_code = ?,
            prefix = ?,
            material_name = ?,
            unit_id = ?,
            pts_code = ?,
            pst_code = ?,
            hsn_code = ?,
            material_group = ?,
            material_type = ?,
            gst_percent = ?,
            self_val = ?,
            purchase_val = ?,
            unit_weight = ?,
            details = ?,
            remarks = ?
        WHERE id = ?
    `;

    const [results] = await db.execute(query, [
        materialCode,
        prefix || null,
        materialName,
        unitId || null,
        resolvedPtsCode || null,
        resolvedPtsCode || null,
        resolvedPtsCode || null,
        resolvedMaterialGroup,
        resolvedMaterialType,
        gstPercent || null,
        selfVal !== undefined && selfVal !== null && selfVal !== '' ? Number(selfVal) : null,
        purchaseVal !== undefined && purchaseVal !== null && purchaseVal !== '' ? Number(purchaseVal) : null,
        unitWeight !== undefined && unitWeight !== null && unitWeight !== '' ? Number(unitWeight) : null,
        details || null,
        remarks || null,
        id
    ]);

    return results;
};

const toggleMaterialActive = async (id, active) => {
    const query = `UPDATE materials SET active = ? WHERE id = ?`;
    const [result] = await db.execute(query, [active ? 1 : 0, id]);
    return result;
};

const deleteMaterial = async (id) => {
    const query = `DELETE FROM materials WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createMaterialsTable,
    ensureMaterialColumns,
    createMaterial,
    getAllMaterials,
    getMaterialById,
    updateMaterial,
    toggleMaterialActive,
    deleteMaterial
};
