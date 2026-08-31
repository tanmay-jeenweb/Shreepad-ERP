const db = require('../config/db.js');

const createBOMTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS bill_of_materials (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            material_id             INT NOT NULL,
            unit_weight_tolerance   DECIMAL(10,4),
            product_weight          DECIMAL(15,4),
            product_weight_for_sale DECIMAL(15,4),
            added_by                INT NOT NULL,
            device_id               VARCHAR(255),
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id)    REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (added_by)       REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log('Bill of Materials table ready');

    const queryMaterials = `
        CREATE TABLE IF NOT EXISTS bom_materials (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            bom_id                  INT NOT NULL,
            material_id             INT NOT NULL,
            quantity                DECIMAL(15,4) NOT NULL,
            FOREIGN KEY (bom_id)      REFERENCES bill_of_materials(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        )
    `;
    await db.execute(queryMaterials);
    console.log('BOM Materials table ready');

    await ensureBOMConstraints();
    await dropUnusedBOMColumns();
    await dropProcessIdColumn();
    await cleanupLegacyTables();

    const queryProcesses = `
        CREATE TABLE IF NOT EXISTS bom_processes (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            bom_id                  INT NOT NULL,
            process_id              INT NOT NULL,
            time                    DECIMAL(15,4) NOT NULL,
            unit_id                 INT NOT NULL,
            FOREIGN KEY (bom_id)      REFERENCES bill_of_materials(id) ON DELETE CASCADE,
            FOREIGN KEY (process_id)  REFERENCES process_masters(id) ON DELETE CASCADE,
            FOREIGN KEY (unit_id)     REFERENCES units(id) ON DELETE CASCADE
        )
    `;
    await db.execute(queryProcesses);
    console.log('BOM Processes table ready');
};

const dropUnusedBOMColumns = async () => {
    try {
        const columnsToDrop = [
            'product_insert',
            'product_counting_type',
            'color',
            'rm_formulation',
            'price',
            'packing_method',
            'difference'
        ];

        for (const col of columnsToDrop) {
            const [rows] = await db.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'bill_of_materials' 
                  AND COLUMN_NAME = ?
            `, [col]);

            if (rows.length > 0) {
                console.log(`Dropping unused column ${col} from bill_of_materials...`);
                await db.execute(`ALTER TABLE bill_of_materials DROP COLUMN ${col}`);
            }
        }
    } catch (error) {
        console.error('Error dropping unused columns from bill_of_materials:', error);
    }
};

const dropProcessIdColumn = async () => {
    try {
        // Find constraint name for process_id on bill_of_materials
        const [rows] = await db.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'bill_of_materials' 
              AND COLUMN_NAME = 'process_id' 
              AND REFERENCED_TABLE_NAME = 'process_masters'
        `);

        if (rows.length > 0) {
            const constraintName = rows[0].CONSTRAINT_NAME;
            console.log(`Dropping process_id foreign key constraint ${constraintName} from bill_of_materials...`);
            await db.execute(`ALTER TABLE bill_of_materials DROP FOREIGN KEY ${constraintName}`);
        }

        // Check if process_id column exists
        const [cols] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'bill_of_materials' 
              AND COLUMN_NAME = 'process_id'
        `);

        if (cols.length > 0) {
            console.log("Dropping process_id column from bill_of_materials...");
            await db.execute(`ALTER TABLE bill_of_materials DROP COLUMN process_id`);
        }
    } catch (error) {
        console.error('Error dropping process_id column from bill_of_materials:', error);
    }
};

const cleanupLegacyTables = async () => {
    try {
        // Check if legacy boms table exists
        const [rows] = await db.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'boms'
        `);

        if (rows.length > 0) {
            // First drop bom_processes if it references boms
            const [bpRows] = await db.execute(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'bom_processes'
            `);

            if (bpRows.length > 0) {
                const [refRows] = await db.execute(`
                    SELECT CONSTRAINT_NAME 
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'bom_processes' 
                      AND REFERENCED_TABLE_NAME = 'boms'
                `);
                
                if (refRows.length > 0) {
                    console.log('Dropping legacy bom_processes table...');
                    await db.execute('DROP TABLE IF EXISTS bom_processes');
                }
            }

            console.log('Dropping legacy boms table...');
            await db.execute('DROP TABLE IF EXISTS boms');
        }
    } catch (error) {
        console.error('Error cleaning up legacy tables:', error);
    }
};

const ensureBOMConstraints = async () => {
    try {
        const [rows] = await db.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'bom_materials' 
              AND COLUMN_NAME = 'bom_id' 
              AND REFERENCED_TABLE_NAME = 'boms'
        `);

        if (rows.length > 0) {
            const constraintName = rows[0].CONSTRAINT_NAME;
            console.log(`Migrating constraint ${constraintName} on bom_materials to point to bill_of_materials...`);
            await db.execute(`ALTER TABLE bom_materials DROP FOREIGN KEY ${constraintName}`);
            await db.execute(`
                ALTER TABLE bom_materials 
                ADD CONSTRAINT ${constraintName} 
                FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id) ON DELETE CASCADE
            `);
            console.log(`Successfully migrated constraint ${constraintName}`);
        }
    } catch (error) {
        console.error('Error migrating BOM constraints:', error);
    }
};



const getFinishedAndSemiFinishedMaterials = async () => {
    const query = `
        SELECT id, material_code, material_name, material_type
        FROM materials
        WHERE material_type IN ('Finished Goods', 'Semi Finished Goods')
          AND active = 1
        ORDER BY material_name ASC
    `;
    const [results] = await db.execute(query);
    return results;
};

const createBOM = async (data, addedBy, deviceId) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const query = `
            INSERT INTO bill_of_materials
                (material_id, unit_weight_tolerance, product_weight,
                 product_weight_for_sale, added_by, device_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [results] = await connection.execute(query, [
            data.materialId,
            data.unitWeightTolerance    !== '' && data.unitWeightTolerance !== undefined ? Number(data.unitWeightTolerance)    : null,
            data.productWeight          !== '' && data.productWeight !== undefined          ? Number(data.productWeight)          : null,
            data.productWeightForSale   !== '' && data.productWeightForSale !== undefined   ? Number(data.productWeightForSale)   : null,
            addedBy,
            deviceId,
        ]);

        const bomId = results.insertId;

        if (data.bomMaterials && Array.isArray(data.bomMaterials)) {
            for (const item of data.bomMaterials) {
                if (item.materialId && item.quantity) {
                    await connection.execute(
                        `INSERT INTO bom_materials (bom_id, material_id, quantity) VALUES (?, ?, ?)`,
                        [bomId, item.materialId, Number(item.quantity)]
                    );
                }
            }
        }

        if (data.bomProcesses && Array.isArray(data.bomProcesses)) {
            for (const item of data.bomProcesses) {
                if (item.processId && item.time && item.unitId) {
                    await connection.execute(
                        `INSERT INTO bom_processes (bom_id, process_id, time, unit_id) VALUES (?, ?, ?, ?)`,
                        [bomId, item.processId, Number(item.time), item.unitId]
                    );
                }
            }
        }

        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getAllBOMs = async () => {
    const query = `
        SELECT
            bom.id AS id,
            m.id AS material_id,
            m.material_name,
            m.material_code,
            m.material_type,
            bom.unit_weight_tolerance,
            bom.product_weight,
            bom.product_weight_for_sale,
            bom.added_by,
            COALESCE(u.name, 'Unknown') AS added_by_name,
            bom.device_id,
            bom.created_at,
            GROUP_CONCAT(DISTINCT CONCAT(rm.material_name, ' (', bm.quantity, ' ', rmu.unit_name, ')') SEPARATOR ', ') AS raw_material_label,
            GROUP_CONCAT(DISTINCT CONCAT(pm.process_name, ' (', bp.time, ' ', pu.unit_name, ')') SEPARATOR ', ') AS process_label
        FROM materials m
        LEFT JOIN bill_of_materials bom ON m.id = bom.material_id
        LEFT JOIN users u            ON bom.added_by        = u.id
        LEFT JOIN bom_materials bm   ON bom.id              = bm.bom_id
        LEFT JOIN materials rm       ON bm.material_id      = rm.id
        LEFT JOIN units rmu          ON rm.unit_id          = rmu.id
        LEFT JOIN bom_processes bp   ON bom.id              = bp.bom_id
        LEFT JOIN process_masters pm ON bp.process_id       = pm.id
        LEFT JOIN units pu           ON bp.unit_id          = pu.id
        WHERE m.material_type IN ('Finished Goods', 'Semi Finished Goods')
          AND m.active = 1
        GROUP BY m.id, bom.id, u.name
        ORDER BY m.created_at DESC
    `;
    const [results] = await db.execute(query);
    return results;
};

const getBOMById = async (id) => {
    const query = `
        SELECT
            bom.*,
            m.material_name,
            m.material_code,
            m.material_type,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM bill_of_materials bom
        LEFT JOIN materials m        ON bom.material_id     = m.id
        LEFT JOIN users u            ON bom.added_by        = u.id
        WHERE bom.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    const bom = rows[0];
    if (bom) {
        const [materials] = await db.execute(`
            SELECT 
                bm.id,
                bm.material_id AS materialId,
                bm.quantity,
                m.material_name AS materialName,
                m.material_code AS materialCode,
                u.unit_name AS unitName
            FROM bom_materials bm
            JOIN materials m ON bm.material_id = m.id
            LEFT JOIN units u ON m.unit_id = u.id
            WHERE bm.bom_id = ?
        `, [id]);
        bom.bomMaterials = materials;

        const [processes] = await db.execute(`
            SELECT 
                bp.id,
                bp.process_id AS processId,
                bp.time,
                bp.unit_id AS unitId,
                pm.process_name AS processName,
                u.unit_name AS unitName
            FROM bom_processes bp
            JOIN process_masters pm ON bp.process_id = pm.id
            JOIN units u ON bp.unit_id = u.id
            WHERE bp.bom_id = ?
        `, [id]);
        bom.bomProcesses = processes;
    }
    return bom;
};

const updateBOM = async (id, data) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const query = `
            UPDATE bill_of_materials SET
                material_id             = ?,
                unit_weight_tolerance   = ?,
                product_weight          = ?,
                product_weight_for_sale = ?
            WHERE id = ?
        `;
        const [results] = await connection.execute(query, [
            data.materialId,
            data.unitWeightTolerance    !== '' && data.unitWeightTolerance !== undefined ? Number(data.unitWeightTolerance)    : null,
            data.productWeight          !== '' && data.productWeight !== undefined          ? Number(data.productWeight)          : null,
            data.productWeightForSale   !== '' && data.productWeightForSale !== undefined   ? Number(data.productWeightForSale)   : null,
            id,
        ]);

        await connection.execute(`DELETE FROM bom_materials WHERE bom_id = ?`, [id]);

        if (data.bomMaterials && Array.isArray(data.bomMaterials)) {
            for (const item of data.bomMaterials) {
                if (item.materialId && item.quantity) {
                    await connection.execute(
                        `INSERT INTO bom_materials (bom_id, material_id, quantity) VALUES (?, ?, ?)`,
                        [id, item.materialId, Number(item.quantity)]
                    );
                }
            }
        }

        await connection.execute(`DELETE FROM bom_processes WHERE bom_id = ?`, [id]);

        if (data.bomProcesses && Array.isArray(data.bomProcesses)) {
            for (const item of data.bomProcesses) {
                if (item.processId && item.time && item.unitId) {
                    await connection.execute(
                        `INSERT INTO bom_processes (bom_id, process_id, time, unit_id) VALUES (?, ?, ?, ?)`,
                        [id, item.processId, Number(item.time), item.unitId]
                    );
                }
            }
        }

        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const deleteBOM = async (id) => {
    const [results] = await db.execute('DELETE FROM bill_of_materials WHERE id = ?', [id]);
    return results;
};

const getBOMByMaterialId = async (materialId) => {
    const query = `
        SELECT
            bom.id AS id,
            bom.material_id,
            bom.unit_weight_tolerance,
            bom.product_weight,
            bom.product_weight_for_sale,
            bom.added_by,
            bom.device_id,
            bom.created_at,
            m.material_name,
            m.material_code,
            m.material_type,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM bill_of_materials bom
        LEFT JOIN materials m        ON bom.material_id     = m.id
        LEFT JOIN users u            ON bom.added_by        = u.id
        WHERE bom.material_id = ?
    `;
    const [rows] = await db.execute(query, [materialId]);
    let bom = rows[0];

    if (bom && bom.id) {
        const [materials] = await db.execute(`
            SELECT 
                bm.id,
                bm.material_id AS materialId,
                bm.quantity,
                m.material_name AS materialName,
                m.material_code AS materialCode,
                u.unit_name AS unitName
            FROM bom_materials bm
            JOIN materials m ON bm.material_id = m.id
            LEFT JOIN units u ON m.unit_id = u.id
            WHERE bm.bom_id = ?
        `, [bom.id]);
        bom.bomMaterials = materials;

        const [processes] = await db.execute(`
            SELECT 
                bp.id,
                bp.process_id AS processId,
                bp.time,
                bp.unit_id AS unitId,
                pm.process_name AS processName,
                u.unit_name AS unitName
            FROM bom_processes bp
            JOIN process_masters pm ON bp.process_id = pm.id
            JOIN units u ON bp.unit_id = u.id
            WHERE bp.bom_id = ?
        `, [bom.id]);
        bom.bomProcesses = processes;
    } else {
        const [mRows] = await db.execute(`
            SELECT 
                NULL AS id,
                id AS material_id,
                material_name,
                material_code,
                material_type
            FROM materials
            WHERE id = ? AND active = 1
        `, [materialId]);
        
        if (mRows.length > 0) {
            bom = {
                id: null,
                material_id: mRows[0].material_id,
                material_name: mRows[0].material_name,
                material_code: mRows[0].material_code,
                material_type: mRows[0].material_type,
                bomMaterials: [{ materialId: "", quantity: "", unitName: "" }],
                bomProcesses: [{ processId: "", time: "", unitId: "" }]
            };
        }
    }
    return bom;
};

module.exports = {
    createBOMTable,
    getFinishedAndSemiFinishedMaterials,
    createBOM,
    getAllBOMs,
    getBOMById,
    getBOMByMaterialId,
    updateBOM,
    deleteBOM,
};
