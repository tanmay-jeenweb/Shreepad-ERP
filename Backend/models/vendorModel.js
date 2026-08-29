const db = require('../config/db.js');

const createVendorTables = async () => {
    const createVendorMasterQuery = `
        CREATE TABLE IF NOT EXISTS vendor_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vendor_code VARCHAR(100) NOT NULL UNIQUE,
            vendor_name VARCHAR(255) NOT NULL,
            contact_phone VARCHAR(50),
            contact_email VARCHAR(255),
            industry VARCHAR(150),
            currency VARCHAR(50),
            vendor_status VARCHAR(50) DEFAULT 'Not Approved',
            time_zone VARCHAR(100),
            contact_name VARCHAR(255),
            gst_no VARCHAR(50),
            state_code VARCHAR(10),
            bank_name VARCHAR(255),
            bank_account_number VARCHAR(100),
            bank_ifsc VARCHAR(50),
            cheque_printing_name VARCHAR(255),
            pan_no VARCHAR(50),
            active BOOLEAN DEFAULT TRUE,
            added_by INT,
            device_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `;

    const createVendorContactsQuery = `
        CREATE TABLE IF NOT EXISTS vendor_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vendor_id INT NOT NULL,
            contact_name VARCHAR(255) NOT NULL,
            contact_number VARCHAR(50),
            designation VARCHAR(150),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendor_master(id) ON DELETE CASCADE
        )
    `;

    const createVendorDocumentsQuery = `
        CREATE TABLE IF NOT EXISTS vendor_documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vendor_id INT NOT NULL,
            document_master_id INT NOT NULL,
            document_number VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendor_master(id) ON DELETE CASCADE,
            FOREIGN KEY (document_master_id) REFERENCES document_master(id) ON DELETE CASCADE
        )
    `;

    const createVendorAddressesQuery = `
        CREATE TABLE IF NOT EXISTS vendor_addresses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vendor_id INT NOT NULL,
            address TEXT,
            country VARCHAR(100),
            state VARCHAR(100),
            city VARCHAR(100),
            zip_code VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendor_master(id) ON DELETE CASCADE
        )
    `;

    await db.execute(createVendorMasterQuery);
    await db.execute(createVendorContactsQuery);
    await db.execute(createVendorAddressesQuery);
    await db.execute(createVendorDocumentsQuery);
    console.log('Vendor tables ready');
};

const ensureVendorColumns = async () => {
    // Ensure vendor_master columns
    const columnsToEnsure = [
        { name: 'industry',              query: "ALTER TABLE vendor_master ADD COLUMN industry VARCHAR(150) DEFAULT NULL" },
        { name: 'time_zone',             query: "ALTER TABLE vendor_master ADD COLUMN time_zone VARCHAR(100) DEFAULT NULL" },
        { name: 'contact_phone',         query: "ALTER TABLE vendor_master ADD COLUMN contact_phone VARCHAR(50) DEFAULT NULL" },
        { name: 'contact_email',         query: "ALTER TABLE vendor_master ADD COLUMN contact_email VARCHAR(255) DEFAULT NULL" },
        { name: 'contact_name',          query: "ALTER TABLE vendor_master ADD COLUMN contact_name VARCHAR(255) DEFAULT NULL" },
        { name: 'bank_name',             query: "ALTER TABLE vendor_master ADD COLUMN bank_name VARCHAR(255) DEFAULT NULL" },
        { name: 'bank_account_number',   query: "ALTER TABLE vendor_master ADD COLUMN bank_account_number VARCHAR(100) DEFAULT NULL" },
        { name: 'bank_ifsc',             query: "ALTER TABLE vendor_master ADD COLUMN bank_ifsc VARCHAR(50) DEFAULT NULL" },
        { name: 'cheque_printing_name',  query: "ALTER TABLE vendor_master ADD COLUMN cheque_printing_name VARCHAR(255) DEFAULT NULL" },
        { name: 'pan_no',                query: "ALTER TABLE vendor_master ADD COLUMN pan_no VARCHAR(50) DEFAULT NULL" },
        { name: 'state_code',            query: "ALTER TABLE vendor_master ADD COLUMN state_code VARCHAR(10) DEFAULT NULL" },
        { name: 'active',                query: "ALTER TABLE vendor_master ADD COLUMN active BOOLEAN DEFAULT TRUE" },
        { name: 'added_by',              query: "ALTER TABLE vendor_master ADD COLUMN added_by INT DEFAULT NULL, ADD CONSTRAINT fk_vendor_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL" },
        { name: 'device_id',             query: "ALTER TABLE vendor_master ADD COLUMN device_id VARCHAR(255) DEFAULT NULL" },
    ];

    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_master' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to vendor_master`);
        }
    }

    // Ensure vendor_contacts table exists (for existing installs)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS vendor_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vendor_id INT NOT NULL,
            contact_name VARCHAR(255) NOT NULL,
            contact_number VARCHAR(50),
            designation VARCHAR(150),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendor_master(id) ON DELETE CASCADE
        )
    `);

    // Ensure vendor_addresses table exists (for existing installs)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS vendor_addresses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vendor_id INT NOT NULL,
            address TEXT,
            country VARCHAR(100),
            state VARCHAR(100),
            city VARCHAR(100),
            zip_code VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendor_master(id) ON DELETE CASCADE
        )
    `);
};

const createVendor = async (vendorData, documentsData, contactsData, addressesData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const insertVendorQuery = `
            INSERT INTO vendor_master
                (vendor_code, vendor_name, contact_phone, contact_email, industry, currency, vendor_status, time_zone, contact_name, gst_no, state_code, bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no, added_by, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [vendorResult] = await connection.execute(insertVendorQuery, [
            vendorData.vendor_code,
            vendorData.vendor_name,
            vendorData.contact_phone || null,
            vendorData.contact_email || null,
            vendorData.industry || null,
            vendorData.currency || null,
            vendorData.vendor_status || 'Not Approved',
            vendorData.time_zone || null,
            vendorData.contact_name || null,
            vendorData.gst_no || null,
            vendorData.state_code || null,
            vendorData.bank_name || null,
            vendorData.bank_account_number || null,
            vendorData.bank_ifsc || null,
            vendorData.cheque_printing_name || null,
            vendorData.pan_no || null,
            vendorData.added_by || null,
            vendorData.device_id || null
        ]);

        const vendorId = vendorResult.insertId;

        // Insert addresses
        if (addressesData && addressesData.length > 0) {
            const insertAddressQuery = `
                INSERT INTO vendor_addresses (vendor_id, address, country, state, city, zip_code)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            for (const addr of addressesData) {
                await connection.execute(insertAddressQuery, [
                    vendorId,
                    addr.address   || null,
                    addr.country   || null,
                    addr.state     || null,
                    addr.city      || null,
                    addr.zip_code  || null,
                ]);
            }
        }

        // Insert contacts
        if (contactsData && contactsData.length > 0) {
            const insertContactQuery = `
                INSERT INTO vendor_contacts (vendor_id, contact_name, contact_number, designation)
                VALUES (?, ?, ?, ?)
            `;
            for (const contact of contactsData) {
                if (contact.contact_name) {
                    await connection.execute(insertContactQuery, [
                        vendorId,
                        contact.contact_name,
                        contact.contact_number || null,
                        contact.designation    || null,
                    ]);
                }
            }
        }

        // Insert documents
        if (documentsData && documentsData.length > 0) {
            const insertDocQuery = `
                INSERT INTO vendor_documents (vendor_id, document_master_id, document_number)
                VALUES (?, ?, ?)
            `;
            for (const doc of documentsData) {
                if (doc.document_master_id) {
                    await connection.execute(insertDocQuery, [
                        vendorId,
                        doc.document_master_id,
                        doc.document_number || null
                    ]);
                }
            }
        }

        await connection.commit();
        return vendorId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getAllVendors = async (includeInactive = false) => {
    const whereClause = includeInactive ? '' : 'WHERE v.active = 1 OR v.active IS NULL';
    const query = `
        SELECT 
            v.*,
            COALESCE(
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', va.id,
                            'address', va.address,
                            'country', va.country,
                            'state', va.state,
                            'city', va.city,
                            'zip_code', va.zip_code
                        )
                    )
                    FROM vendor_addresses va
                    WHERE va.vendor_id = v.id
                ),
                JSON_ARRAY()
            ) as addresses,
            COALESCE(
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', vc.id,
                            'contact_name', vc.contact_name,
                            'contact_number', vc.contact_number,
                            'designation', vc.designation
                        )
                    )
                    FROM vendor_contacts vc
                    WHERE vc.vendor_id = v.id
                ),
                JSON_ARRAY()
            ) as contacts,
            COALESCE(
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', vd.id,
                            'document_master_id', vd.document_master_id,
                            'document_name', dm.document_name,
                            'document_type', dm.document_type,
                            'document_number', vd.document_number
                        )
                    )
                    FROM vendor_documents vd
                    LEFT JOIN document_master dm ON vd.document_master_id = dm.id
                    WHERE vd.vendor_id = v.id
                ),
                JSON_ARRAY()
            ) as documents
        FROM vendor_master v
        ${whereClause}
        ORDER BY v.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows.map(row => {
        if (typeof row.addresses === 'string') {
            try {
                row.addresses = JSON.parse(row.addresses);
            } catch (e) {
                row.addresses = [];
            }
        }
        if (typeof row.contacts === 'string') {
            try {
                row.contacts = JSON.parse(row.contacts);
            } catch (e) {
                row.contacts = [];
            }
        }
        if (typeof row.documents === 'string') {
            try {
                row.documents = JSON.parse(row.documents);
            } catch (e) {
                row.documents = [];
            }
        }
        return row;
    });
};

const getVendorById = async (id) => {
    const query = `SELECT * FROM vendor_master WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    if (rows.length === 0) return null;
    const vendor = rows[0];

    const addressesQuery = `SELECT * FROM vendor_addresses WHERE vendor_id = ?`;
    const [addresses] = await db.execute(addressesQuery, [id]);
    vendor.addresses = addresses;

    const contactsQuery = `SELECT * FROM vendor_contacts WHERE vendor_id = ?`;
    const [contacts] = await db.execute(contactsQuery, [id]);
    vendor.contacts = contacts;

    const docsQuery = `
        SELECT vd.*, dm.document_name, dm.document_type 
        FROM vendor_documents vd
        LEFT JOIN document_master dm ON vd.document_master_id = dm.id
        WHERE vd.vendor_id = ?
    `;
    const [docs] = await db.execute(docsQuery, [id]);
    vendor.documents = docs;

    return vendor;
};

const updateVendor = async (id, vendorData, documentsData, contactsData, addressesData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const updateVendorQuery = `
            UPDATE vendor_master
            SET 
                vendor_code          = ?,
                vendor_name          = ?,
                contact_phone        = ?,
                contact_email        = ?,
                industry             = ?,
                currency             = ?,
                vendor_status        = ?,
                time_zone            = ?,
                contact_name         = ?,
                gst_no               = ?,
                state_code           = ?,
                bank_name            = ?,
                bank_account_number  = ?,
                bank_ifsc            = ?,
                cheque_printing_name = ?,
                pan_no               = ?
            WHERE id = ?
        `;
        await connection.execute(updateVendorQuery, [
            vendorData.vendor_code,
            vendorData.vendor_name,
            vendorData.contact_phone         || null,
            vendorData.contact_email         || null,
            vendorData.industry              || null,
            vendorData.currency              || null,
            vendorData.vendor_status         || 'Not Approved',
            vendorData.time_zone             || null,
            vendorData.contact_name          || null,
            vendorData.gst_no                || null,
            vendorData.state_code            || null,
            vendorData.bank_name             || null,
            vendorData.bank_account_number   || null,
            vendorData.bank_ifsc             || null,
            vendorData.cheque_printing_name  || null,
            vendorData.pan_no                || null,
            id
        ]);

        // Replace contacts
        await connection.execute(`DELETE FROM vendor_contacts WHERE vendor_id = ?`, [id]);
        if (contactsData && contactsData.length > 0) {
            const insertContactQuery = `
                INSERT INTO vendor_contacts (vendor_id, contact_name, contact_number, designation)
                VALUES (?, ?, ?, ?)
            `;
            for (const contact of contactsData) {
                if (contact.contact_name) {
                    await connection.execute(insertContactQuery, [
                        id,
                        contact.contact_name,
                        contact.contact_number || null,
                        contact.designation    || null,
                    ]);
                }
            }
        }

        // Replace addresses
        await connection.execute(`DELETE FROM vendor_addresses WHERE vendor_id = ?`, [id]);
        if (addressesData && addressesData.length > 0) {
            const insertAddressQuery = `
                INSERT INTO vendor_addresses (vendor_id, address, country, state, city, zip_code)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            for (const addr of addressesData) {
                await connection.execute(insertAddressQuery, [
                    id,
                    addr.address   || null,
                    addr.country   || null,
                    addr.state     || null,
                    addr.city      || null,
                    addr.zip_code  || null,
                ]);
            }
        }

        // Replace documents
        await connection.execute(`DELETE FROM vendor_documents WHERE vendor_id = ?`, [id]);
        if (documentsData && documentsData.length > 0) {
            const insertDocQuery = `
                INSERT INTO vendor_documents (vendor_id, document_master_id, document_number)
                VALUES (?, ?, ?)
            `;
            for (const doc of documentsData) {
                if (doc.document_master_id) {
                    await connection.execute(insertDocQuery, [
                        id,
                        doc.document_master_id,
                        doc.document_number || null
                    ]);
                }
            }
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const toggleVendorActive = async (id, active) => {
    const query = `UPDATE vendor_master SET active = ? WHERE id = ?`;
    const [result] = await db.execute(query, [active ? 1 : 0, id]);
    return result;
};

const deleteVendor = async (id) => {
    const query = `DELETE FROM vendor_master WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createVendorTables,
    ensureVendorColumns,
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    toggleVendorActive,
    deleteVendor
};
