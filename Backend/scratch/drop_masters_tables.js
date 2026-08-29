const mysql = require('mysql2/promise');

async function dropForeignKeyIfExists(conn, tableName, columnName) {
    const query = `
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND COLUMN_NAME = ? 
          AND REFERENCED_TABLE_NAME IS NOT NULL
    `;
    const [rows] = await conn.execute(query, [tableName, columnName]);
    for (const row of rows) {
        const fkName = row.CONSTRAINT_NAME;
        console.log(`Dropping FK constraint ${fkName} on ${tableName}.${columnName}...`);
        try {
            await conn.execute(`ALTER TABLE ${tableName} DROP FOREIGN KEY ${fkName}`);
        } catch (err) {
            console.error(`Error dropping FK ${fkName} on ${tableName}:`, err.message);
        }
    }
}

async function dropColumnIfExists(conn, tableName, columnName) {
    const query = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND COLUMN_NAME = ?
    `;
    const [rows] = await conn.execute(query, [tableName, columnName]);
    if (rows.length > 0) {
        console.log(`Dropping column ${columnName} from table ${tableName}...`);
        try {
            await conn.execute(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
        } catch (err) {
            console.error(`Error dropping column ${columnName} from ${tableName}:`, err.message);
        }
    }
}

async function dropMasters() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'admin123',
        database: 'shreepad_erp'
    });

    console.log("Disabling foreign key checks...");
    await conn.execute("SET FOREIGN_KEY_CHECKS = 0");

    // Clean up foreign keys on referencing tables first
    const refs = [
        { table: 'work_order_items', col: 'mould_id' },
        { table: 'work_order_items', col: 'job_party_id' },
        { table: 'bill_of_materials', col: 'raw_material_id' },
        { table: 'bill_of_materials', col: 'mould_id' },
        { table: 'rm_returns', col: 'job_party_id' },
        { table: 'material_add_master', col: 'job_party_id' },
        { table: 'grn_master', col: 'job_party_id' }
    ];

    for (const ref of refs) {
        await dropForeignKeyIfExists(conn, ref.table, ref.col);
    }

    // Drop target master tables
    const tablesToDrop = [
        'sub_sd_reason_master',
        'reasons_for_delay',
        'reason_for_delay_types',
        'reason_master',
        'raw_materials',
        'mould_machines',
        'material_moulds',
        'bom_moulds',
        'moulds',
        'job_parties',
        'job_party_types'
    ];

    for (const table of tablesToDrop) {
        console.log(`Dropping table ${table}...`);
        await conn.execute(`DROP TABLE IF EXISTS ${table}`);
    }

    // Drop columns from referencing tables
    const colsToDrop = [
        { table: 'work_order_items', col: 'mould_id' },
        { table: 'work_order_items', col: 'job_party_id' },
        { table: 'bill_of_materials', col: 'raw_material_id' },
        { table: 'bill_of_materials', col: 'mould_id' },
        { table: 'rm_returns', col: 'job_party_id' },
        { table: 'rm_returns', col: 'job_party_name' },
        { table: 'material_add_master', col: 'job_party_id' },
        { table: 'material_add_master', col: 'job_party_name' },
        { table: 'grn_master', col: 'job_party_id' },
        { table: 'grn_master', col: 'job_party_name' }
    ];

    for (const item of colsToDrop) {
        await dropColumnIfExists(conn, item.table, item.col);
    }

    console.log("Re-enabling foreign key checks...");
    await conn.execute("SET FOREIGN_KEY_CHECKS = 1");

    console.log("Done database cleanup!");
    await conn.end();
}

dropMasters().catch(console.error);
