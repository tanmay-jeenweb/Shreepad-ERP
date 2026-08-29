const db = require('../config/db.js');
const { getSettings } = require('./settingMasterModel.js');
const { getNextSequence } = require('./batchSequenceModel.js');

const createRmReturnsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS rm_returns (
            id INT AUTO_INCREMENT PRIMARY KEY,
            return_no VARCHAR(50) NOT NULL UNIQUE,
            return_date DATE NOT NULL,
            material_id INT NOT NULL,
            material_name VARCHAR(255) NOT NULL,
            grade VARCHAR(100) DEFAULT NULL,
            location_id INT NOT NULL,
            location_name VARCHAR(255) NOT NULL,
            quantity DECIMAL(15,4) NOT NULL,
            internal_batch_number VARCHAR(100) NOT NULL UNIQUE,
            added_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
            FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log("RM Returns table ready");

    // Add pmemo_id if it doesn't exist
    try {
        const [rows] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'rm_returns' 
              AND COLUMN_NAME = 'pmemo_id'
        `);
        if (rows.length === 0) {
            await db.execute(`ALTER TABLE rm_returns ADD COLUMN pmemo_id INT NULL`);
            console.log("Added column pmemo_id to rm_returns");
        }
    } catch (err) {
        console.error("Error adding pmemo_id column to rm_returns:", err.message);
    }
};

const generateReturnNo = async () => {
    const year = new Date().getFullYear();
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS cnt FROM rm_returns WHERE return_no LIKE ?`,
        [`RTR-${year}-%`]
    );
    const seq = (rows[0].cnt || 0) + 1;
    return `RTR-${year}-${String(seq).padStart(4, '0')}`;
};

const mapMaterialTypeToPrefixKey = (type) => {
    switch (type) {
        case 'Finished Goods': return 'prefix_finished_goods';
        case 'Semi Finished Goods': return 'prefix_semi_finished_goods';
        case 'Raw Materials': return 'prefix_raw_materials';
        case 'Store Consumed': return 'prefix_store_consumed';
        case 'Packaging Material': return 'prefix_packaging_material';
        case 'Waste and scrap': return 'prefix_waste_and_scrap';
        case 'Capital Equipment': return 'prefix_capital_equipment';
        case 'Assembly Item': return 'prefix_assembly_item';
        case 'Uniform and other Item': return 'prefix_uniform_and_other';
        case 'Service': return 'prefix_service';
        case 'Other': return 'prefix_other';
        default: return 'prefix_other';
    }
};

const generateInternalBatchNumber = async (connection, materialId, settings) => {
    if (!materialId) return null;
    const [matRows] = await connection.execute('SELECT code, material_type FROM materials WHERE id = ?', [materialId]);
    if (matRows.length === 0) return null;
    const mat = matRows[0];
    if (!mat.code) return null;

    const prefixKey = mapMaterialTypeToPrefixKey(mat.material_type);
    const prefix = settings ? (settings[prefixKey] || 'OTH') : 'OTH';

    const year = (settings && settings.batch_year) ? settings.batch_year : new Date().getFullYear().toString().slice(-2);

    const seq = await getNextSequence(connection, mat.code, year);

    return `-${prefix}${mat.code}${year}${String(seq).padStart(4, '0')}`;
};

const createRmReturn = async (data, addedBy) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Generate return_no
        const returnNo = await generateReturnNo();

        // 2. Fetch material details
        const [matRows] = await connection.execute('SELECT material_name FROM materials WHERE id = ?', [data.material_id]);
        if (matRows.length === 0) {
            throw new Error("Invalid Material ID");
        }
        const materialName = matRows[0].material_name;

        // 3. Fetch location name
        const [locRows] = await connection.execute('SELECT location_name FROM locations WHERE id = ?', [data.location_id]);
        if (locRows.length === 0) {
            throw new Error("Invalid Location ID");
        }
        const locationName = locRows[0].location_name;

        // 4. Generate internal batch number
        const settings = await getSettings();
        const internalBatchNumber = await generateInternalBatchNumber(connection, data.material_id, settings);

        // 5. Insert RM Return record
        const insertQuery = `
            INSERT INTO rm_returns (
                return_no, return_date, material_id, material_name, 
                grade, location_id, location_name, 
                quantity, internal_batch_number, added_by, pmemo_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.execute(insertQuery, [
            returnNo,
            data.return_date,
            data.material_id,
            materialName,
            data.grade || null,
            data.location_id,
            locationName,
            data.quantity,
            internalBatchNumber,
            addedBy,
            data.pmemo_id || null
        ]);
        const returnId = result.insertId;

        // 6. Upsert stock status
        const { upsertStockStatusForReturn } = require('./stockStatusModel.js');
        await upsertStockStatusForReturn(connection, returnId, {
            internal_batch_number: internalBatchNumber,
            material_id: data.material_id,
            material_name: materialName,
            grade: data.grade || null,
            location_name: locationName,
            quantity: data.quantity
        });

        await connection.commit();
        return { returnId, returnNo, internalBatchNumber };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getAllRmReturns = async () => {
    const query = `
        SELECT 
            r.*,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM rm_returns r
        LEFT JOIN users u ON r.added_by = u.id
        ORDER BY r.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

module.exports = {
    createRmReturnsTable,
    createRmReturn,
    getAllRmReturns
};
