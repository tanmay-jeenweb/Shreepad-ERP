const db = require('../config/db.js');

const createOrganizationTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS organization_details (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            logo LONGTEXT,
            address TEXT,
            gst_number VARCHAR(50),
            state_code VARCHAR(10),
            added_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    await db.execute(query);
    console.log("Organization details table ready");
};

const ensureOrganizationColumns = async () => {
    try {
        const [columns] = await db.execute("SHOW COLUMNS FROM organization_details LIKE 'state_code'");
        if (columns.length === 0) {
            await db.execute("ALTER TABLE organization_details ADD COLUMN state_code VARCHAR(10)");
            console.log("Added state_code column to organization_details table");
        }
    } catch (err) {
        console.error("Error ensuring organization_details columns:", err);
    }
};

const getOrganizationDetails = async () => {
    const query = `
        SELECT 
            org.id,
            org.name,
            org.logo,
            org.address,
            org.gst_number,
            org.state_code,
            COALESCE(usr.name, 'Unknown') AS added_by_name,
            org.created_at,
            org.updated_at
        FROM organization_details org
        LEFT JOIN users usr ON org.added_by = usr.id
        LIMIT 1
    `;

    const [rows] = await db.execute(query);
    return rows[0] || null;
};

const upsertOrganizationDetails = async (name, logo, address, gstNumber, stateCode, addedBy) => {
    // Check if a record already exists
    const existing = await getOrganizationDetails();

    if (existing) {
        // Update the existing record
        const query = `
            UPDATE organization_details
            SET name = ?, logo = ?, address = ?, gst_number = ?, state_code = ?, added_by = ?
            WHERE id = ?
        `;
        const [result] = await db.execute(query, [name, logo || null, address || null, gstNumber || null, stateCode || null, addedBy, existing.id]);
        return { action: 'updated', id: existing.id, result };
    } else {
        // Insert a new record
        const query = `
            INSERT INTO organization_details (name, logo, address, gst_number, state_code, added_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [name, logo || null, address || null, gstNumber || null, stateCode || null, addedBy]);
        return { action: 'created', id: result.insertId, result };
    }
};

module.exports = {
    createOrganizationTable,
    ensureOrganizationColumns,
    getOrganizationDetails,
    upsertOrganizationDetails
};
