const db = require('../config/db.js');
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

const generateReturnNo = async (connection) => {
    const conn = connection || db;
    const year = new Date().getFullYear();
    const prefix = `RTR-${year}-`;
    const [rows] = await conn.execute(
        `SELECT return_no FROM rm_returns WHERE return_no LIKE ?`,
        [`${prefix}%`]
    );
    let maxSeq = 0;
    for (const r of rows) {
        if (r.return_no && r.return_no.startsWith(prefix)) {
            const numPart = parseInt(r.return_no.slice(prefix.length), 10);
            if (!isNaN(numPart) && numPart > maxSeq) {
                maxSeq = numPart;
            }
        }
    }
    const seq = maxSeq + 1;
    return `${prefix}${String(seq).padStart(4, '0')}`;
};

const mapMaterialTypeToDefaultPrefix = (type) => {
    switch (type) {
        case 'Finished Goods': return 'FG';
        case 'Semi Finished Goods': return 'SFG';
        case 'Raw Materials': return 'RM';
        case 'Store Consumed': return 'SC';
        case 'Packaging Material': return 'PM';
        case 'Waste and scrap': return 'WS';
        case 'Capital Equipment': return 'CE';
        case 'Assembly Item': return 'AI';
        case 'Uniform and other Item': return 'UI';
        case 'Service': return 'SRV';
        case 'Other': return 'OTH';
        default: return 'OTH';
    }
};

const generateInternalBatchNumber = async (connection, materialId) => {
    if (!materialId) return null;
    const [matRows] = await connection.execute('SELECT material_code, material_type, prefix FROM materials WHERE id = ?', [materialId]);
    if (matRows.length === 0) return null;
    const mat = matRows[0];

    const defaultPrefix = mapMaterialTypeToDefaultPrefix(mat.material_type);
    const prefix = mat.prefix || defaultPrefix;

    const year = new Date().getFullYear().toString().slice(-2);

    const seqKey = prefix || mat.material_code || String(materialId);
    const seq = await getNextSequence(connection, seqKey, year);

    return `-${prefix}${year}${String(seq).padStart(4, '0')}`;
};

const createRmReturn = async (data, addedBy) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Generate return_no
        const returnNo = await generateReturnNo(connection);

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
        const internalBatchNumber = await generateInternalBatchNumber(connection, data.material_id);

        // 5. Insert RM Return record
        const insertQuery = `
            INSERT INTO rm_returns (
                return_no, return_date, material_id, material_name, 
                grade, location_id, location_name, 
                quantity, internal_batch_number, added_by, pmemo_id
            ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.execute(insertQuery, [
            returnNo,
            data.return_date,
            data.material_id,
            materialName,
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
            grade: null,
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
