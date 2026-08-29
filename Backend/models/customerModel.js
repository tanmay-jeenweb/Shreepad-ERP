const db = require('../config/db.js');

const createCustomerTables = async () => {
    const createCustomerMasterQuery = `
        CREATE TABLE IF NOT EXISTS customer_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_code VARCHAR(100) NOT NULL UNIQUE,
            customer_name VARCHAR(255) NOT NULL,
            contact_phone VARCHAR(50),
            contact_email VARCHAR(255),
            industry VARCHAR(150),
            currency VARCHAR(50),
            customer_status VARCHAR(50) DEFAULT 'Not Approved',
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

    const createCustomerContactsQuery = `
        CREATE TABLE IF NOT EXISTS customer_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            contact_name VARCHAR(255) NOT NULL,
            contact_number VARCHAR(50),
            designation VARCHAR(150),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_master(id) ON DELETE CASCADE
        )
    `;

    const createCustomerDocumentsQuery = `
        CREATE TABLE IF NOT EXISTS customer_documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            document_master_id INT NOT NULL,
            document_number VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_master(id) ON DELETE CASCADE,
            FOREIGN KEY (document_master_id) REFERENCES document_master(id) ON DELETE CASCADE
        )
    `;

    const createCustomerAddressesQuery = `
        CREATE TABLE IF NOT EXISTS customer_addresses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            address TEXT,
            country VARCHAR(100),
            state VARCHAR(100),
            city VARCHAR(100),
            zip_code VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_master(id) ON DELETE CASCADE
        )
    `;

    await db.execute(createCustomerMasterQuery);
    await db.execute(createCustomerContactsQuery);
    await db.execute(createCustomerAddressesQuery);
    await db.execute(createCustomerDocumentsQuery);
    console.log('Customer tables ready');
};

const ensureCustomerColumns = async () => {
    // Ensure customer_master columns
    const columnsToEnsure = [
        { name: 'industry',              query: "ALTER TABLE customer_master ADD COLUMN industry VARCHAR(150) DEFAULT NULL" },
        { name: 'time_zone',             query: "ALTER TABLE customer_master ADD COLUMN time_zone VARCHAR(100) DEFAULT NULL" },
        { name: 'contact_phone',         query: "ALTER TABLE customer_master ADD COLUMN contact_phone VARCHAR(50) DEFAULT NULL" },
        { name: 'contact_email',         query: "ALTER TABLE customer_master ADD COLUMN contact_email VARCHAR(255) DEFAULT NULL" },
        { name: 'contact_name',          query: "ALTER TABLE customer_master ADD COLUMN contact_name VARCHAR(255) DEFAULT NULL" },
        { name: 'bank_name',             query: "ALTER TABLE customer_master ADD COLUMN bank_name VARCHAR(255) DEFAULT NULL" },
        { name: 'bank_account_number',   query: "ALTER TABLE customer_master ADD COLUMN bank_account_number VARCHAR(100) DEFAULT NULL" },
        { name: 'bank_ifsc',             query: "ALTER TABLE customer_master ADD COLUMN bank_ifsc VARCHAR(50) DEFAULT NULL" },
        { name: 'cheque_printing_name',  query: "ALTER TABLE customer_master ADD COLUMN cheque_printing_name VARCHAR(255) DEFAULT NULL" },
        { name: 'pan_no',                query: "ALTER TABLE customer_master ADD COLUMN pan_no VARCHAR(50) DEFAULT NULL" },
        { name: 'state_code',            query: "ALTER TABLE customer_master ADD COLUMN state_code VARCHAR(10) DEFAULT NULL" },
        { name: 'active',                query: "ALTER TABLE customer_master ADD COLUMN active BOOLEAN DEFAULT TRUE" },
        { name: 'added_by',              query: "ALTER TABLE customer_master ADD COLUMN added_by INT DEFAULT NULL, ADD CONSTRAINT fk_customer_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL" },
        { name: 'device_id',             query: "ALTER TABLE customer_master ADD COLUMN device_id VARCHAR(255) DEFAULT NULL" },
    ];

    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_master' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to customer_master`);
        }
    }

    // Ensure customer_contacts table exists (for existing installs)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS customer_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            contact_name VARCHAR(255) NOT NULL,
            contact_number VARCHAR(50),
            designation VARCHAR(150),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_master(id) ON DELETE CASCADE
        )
    `);

    // Ensure customer_addresses table exists (for existing installs)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS customer_addresses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            address TEXT,
            country VARCHAR(100),
            state VARCHAR(100),
            city VARCHAR(100),
            zip_code VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_master(id) ON DELETE CASCADE
        )
    `);
};

const createCustomer = async (customerData, documentsData, contactsData, addressesData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const insertCustomerQuery = `
            INSERT INTO customer_master
                (customer_code, customer_name, contact_phone, contact_email, industry, currency, customer_status, time_zone, contact_name, gst_no, state_code, bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no, added_by, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [customerResult] = await connection.execute(insertCustomerQuery, [
            customerData.customer_code,
            customerData.customer_name,
            customerData.contact_phone || null,
            customerData.contact_email || null,
            customerData.industry || null,
            customerData.currency || null,
            customerData.customer_status || 'Not Approved',
            customerData.time_zone || null,
            customerData.contact_name || null,
            customerData.gst_no || null,
            customerData.state_code || null,
            customerData.bank_name || null,
            customerData.bank_account_number || null,
            customerData.bank_ifsc || null,
            customerData.cheque_printing_name || null,
            customerData.pan_no || null,
            customerData.added_by || null,
            customerData.device_id || null
        ]);

        const customerId = customerResult.insertId;

        // Insert addresses
        if (addressesData && addressesData.length > 0) {
            const insertAddressQuery = `
                INSERT INTO customer_addresses (customer_id, address, country, state, city, zip_code)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            for (const addr of addressesData) {
                await connection.execute(insertAddressQuery, [
                    customerId,
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
                INSERT INTO customer_contacts (customer_id, contact_name, contact_number, designation)
                VALUES (?, ?, ?, ?)
            `;
            for (const contact of contactsData) {
                if (contact.contact_name) {
                    await connection.execute(insertContactQuery, [
                        customerId,
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
                INSERT INTO customer_documents (customer_id, document_master_id, document_number)
                VALUES (?, ?, ?)
            `;
            for (const doc of documentsData) {
                if (doc.document_master_id) {
                    await connection.execute(insertDocQuery, [
                        customerId,
                        doc.document_master_id,
                        doc.document_number || null
                    ]);
                }
            }
        }

        await connection.commit();
        return customerId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getAllCustomers = async (includeInactive = false) => {
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
                    FROM customer_addresses va
                    WHERE va.customer_id = v.id
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
                    FROM customer_contacts vc
                    WHERE vc.customer_id = v.id
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
                    FROM customer_documents vd
                    LEFT JOIN document_master dm ON vd.document_master_id = dm.id
                    WHERE vd.customer_id = v.id
                ),
                JSON_ARRAY()
            ) as documents
        FROM customer_master v
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

const getCustomerById = async (id) => {
    const query = `SELECT * FROM customer_master WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    if (rows.length === 0) return null;
    const customer = rows[0];

    const addressesQuery = `SELECT * FROM customer_addresses WHERE customer_id = ?`;
    const [addresses] = await db.execute(addressesQuery, [id]);
    customer.addresses = addresses;

    const contactsQuery = `SELECT * FROM customer_contacts WHERE customer_id = ?`;
    const [contacts] = await db.execute(contactsQuery, [id]);
    customer.contacts = contacts;

    const docsQuery = `
        SELECT vd.*, dm.document_name, dm.document_type 
        FROM customer_documents vd
        LEFT JOIN document_master dm ON vd.document_master_id = dm.id
        WHERE vd.customer_id = ?
    `;
    const [docs] = await db.execute(docsQuery, [id]);
    customer.documents = docs;

    return customer;
};

const updateCustomer = async (id, customerData, documentsData, contactsData, addressesData) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const updateCustomerQuery = `
            UPDATE customer_master
            SET 
                customer_code          = ?,
                customer_name          = ?,
                contact_phone        = ?,
                contact_email        = ?,
                industry             = ?,
                currency             = ?,
                customer_status        = ?,
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
        await connection.execute(updateCustomerQuery, [
            customerData.customer_code,
            customerData.customer_name,
            customerData.contact_phone         || null,
            customerData.contact_email         || null,
            customerData.industry              || null,
            customerData.currency              || null,
            customerData.customer_status         || 'Not Approved',
            customerData.time_zone             || null,
            customerData.contact_name          || null,
            customerData.gst_no                || null,
            customerData.state_code            || null,
            customerData.bank_name             || null,
            customerData.bank_account_number   || null,
            customerData.bank_ifsc             || null,
            customerData.cheque_printing_name  || null,
            customerData.pan_no                || null,
            id
        ]);

        // Replace contacts
        await connection.execute(`DELETE FROM customer_contacts WHERE customer_id = ?`, [id]);
        if (contactsData && contactsData.length > 0) {
            const insertContactQuery = `
                INSERT INTO customer_contacts (customer_id, contact_name, contact_number, designation)
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
        await connection.execute(`DELETE FROM customer_addresses WHERE customer_id = ?`, [id]);
        if (addressesData && addressesData.length > 0) {
            const insertAddressQuery = `
                INSERT INTO customer_addresses (customer_id, address, country, state, city, zip_code)
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
        await connection.execute(`DELETE FROM customer_documents WHERE customer_id = ?`, [id]);
        if (documentsData && documentsData.length > 0) {
            const insertDocQuery = `
                INSERT INTO customer_documents (customer_id, document_master_id, document_number)
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

const toggleCustomerActive = async (id, active) => {
    const query = `UPDATE customer_master SET active = ? WHERE id = ?`;
    const [result] = await db.execute(query, [active ? 1 : 0, id]);
    return result;
};

const deleteCustomer = async (id) => {
    const query = `DELETE FROM customer_master WHERE id = ?`;
    const [results] = await db.execute(query, [id]);
    return results;
};

module.exports = {
    createCustomerTables,
    ensureCustomerColumns,
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    toggleCustomerActive,
    deleteCustomer
};
