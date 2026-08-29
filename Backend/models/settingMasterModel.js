const db = require('../config/db.js');

const createSettingMasterTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS settings_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            batch_year VARCHAR(2) DEFAULT NULL,
            prefix_finished_goods VARCHAR(10) DEFAULT 'FG',
            prefix_semi_finished_goods VARCHAR(10) DEFAULT 'SFG',
            prefix_raw_materials VARCHAR(10) DEFAULT 'RM',
            prefix_store_consumed VARCHAR(10) DEFAULT 'SC',
            prefix_packaging_material VARCHAR(10) DEFAULT 'PM',
            prefix_waste_and_scrap VARCHAR(10) DEFAULT 'WS',
            prefix_capital_equipment VARCHAR(10) DEFAULT 'CE',
            prefix_assembly_item VARCHAR(10) DEFAULT 'AI',
            prefix_uniform_and_other VARCHAR(10) DEFAULT 'UI',
            prefix_service VARCHAR(10) DEFAULT 'SRV',
            prefix_other VARCHAR(10) DEFAULT 'OTH',
            wait_hour INT DEFAULT 0,
            added_by INT,
            device_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `;

    await db.execute(query);
    console.log('Settings master table ready');
};

const getSettings = async () => {
    const [rows] = await db.execute(
        `SELECT * FROM settings_master ORDER BY id DESC LIMIT 1`
    );
    return rows[0] || null;
};

const upsertSettings = async (data, addedBy, deviceId) => {
    const [existing] = await db.execute(
        `SELECT id FROM settings_master LIMIT 1`
    );

    if (existing.length > 0) {
        await db.execute(
            `UPDATE settings_master SET 
                batch_year = ?,
                prefix_finished_goods = ?,
                prefix_semi_finished_goods = ?,
                prefix_raw_materials = ?,
                prefix_store_consumed = ?,
                prefix_packaging_material = ?,
                prefix_waste_and_scrap = ?,
                prefix_capital_equipment = ?,
                prefix_assembly_item = ?,
                prefix_uniform_and_other = ?,
                prefix_service = ?,
                prefix_other = ?,
                wait_hour = ?,
                added_by = ?, 
                device_id = ? 
             WHERE id = ?`,
            [
                data.batch_year, data.prefix_finished_goods, data.prefix_semi_finished_goods,
                data.prefix_raw_materials, data.prefix_store_consumed, data.prefix_packaging_material,
                data.prefix_waste_and_scrap, data.prefix_capital_equipment, data.prefix_assembly_item,
                data.prefix_uniform_and_other, data.prefix_service, data.prefix_other, data.wait_hour,
                addedBy, deviceId, existing[0].id
            ]
        );
        return { action: 'updated' };
    } else {
        await db.execute(
            `INSERT INTO settings_master (
                batch_year, prefix_finished_goods, prefix_semi_finished_goods,
                prefix_raw_materials, prefix_store_consumed, prefix_packaging_material,
                prefix_waste_and_scrap, prefix_capital_equipment, prefix_assembly_item,
                prefix_uniform_and_other, prefix_service, prefix_other, wait_hour,
                added_by, device_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.batch_year, data.prefix_finished_goods, data.prefix_semi_finished_goods,
                data.prefix_raw_materials, data.prefix_store_consumed, data.prefix_packaging_material,
                data.prefix_waste_and_scrap, data.prefix_capital_equipment, data.prefix_assembly_item,
                data.prefix_uniform_and_other, data.prefix_service, data.prefix_other, data.wait_hour,
                addedBy, deviceId
            ]
        );
        return { action: 'created' };
    }
};

const ensureSettingsMasterColumns = async () => {
    const columnsToEnsure = [
        { name: 'batch_year', query: `ALTER TABLE settings_master ADD COLUMN batch_year VARCHAR(2) DEFAULT NULL` },
        { name: 'prefix_finished_goods', query: `ALTER TABLE settings_master ADD COLUMN prefix_finished_goods VARCHAR(10) DEFAULT 'FG'` },
        { name: 'prefix_semi_finished_goods', query: `ALTER TABLE settings_master ADD COLUMN prefix_semi_finished_goods VARCHAR(10) DEFAULT 'SFG'` },
        { name: 'prefix_raw_materials', query: `ALTER TABLE settings_master ADD COLUMN prefix_raw_materials VARCHAR(10) DEFAULT 'RM'` },
        { name: 'prefix_store_consumed', query: `ALTER TABLE settings_master ADD COLUMN prefix_store_consumed VARCHAR(10) DEFAULT 'SC'` },
        { name: 'prefix_packaging_material', query: `ALTER TABLE settings_master ADD COLUMN prefix_packaging_material VARCHAR(10) DEFAULT 'PM'` },
        { name: 'prefix_waste_and_scrap', query: `ALTER TABLE settings_master ADD COLUMN prefix_waste_and_scrap VARCHAR(10) DEFAULT 'WS'` },
        { name: 'prefix_capital_equipment', query: `ALTER TABLE settings_master ADD COLUMN prefix_capital_equipment VARCHAR(10) DEFAULT 'CE'` },
        { name: 'prefix_assembly_item', query: `ALTER TABLE settings_master ADD COLUMN prefix_assembly_item VARCHAR(10) DEFAULT 'AI'` },
        { name: 'prefix_uniform_and_other', query: `ALTER TABLE settings_master ADD COLUMN prefix_uniform_and_other VARCHAR(10) DEFAULT 'UI'` },
        { name: 'prefix_service', query: `ALTER TABLE settings_master ADD COLUMN prefix_service VARCHAR(10) DEFAULT 'SRV'` },
        { name: 'prefix_other', query: `ALTER TABLE settings_master ADD COLUMN prefix_other VARCHAR(10) DEFAULT 'OTH'` },
        { name: 'wait_hour', query: `ALTER TABLE settings_master ADD COLUMN wait_hour INT DEFAULT 0` }
    ];
    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings_master' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to settings_master`);
        }
    }

    // Modify legacy columns 'module' and 'prefix' to be nullable if they exist
    const legacyColumns = ['module', 'prefix'];
    for (const name of legacyColumns) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings_master' AND COLUMN_NAME = ?`,
            [name]
        );
        if (rows.length > 0) {
            await db.execute(`ALTER TABLE settings_master MODIFY COLUMN ${name} VARCHAR(255) DEFAULT NULL`);
            console.log(`Modified legacy column ${name} to be nullable in settings_master`);
        }
    }
};

module.exports = {
    createSettingMasterTable,
    ensureSettingsMasterColumns,
    getSettings,
    upsertSettings
};
