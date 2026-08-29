const db = require('../config/db.js');

const createSalesOrdersTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS sales_orders (
            id                      INT AUTO_INCREMENT PRIMARY KEY,
            sales_order_id          VARCHAR(100) NOT NULL UNIQUE,
            customer_id             INT NOT NULL,
            total_amount            DECIMAL(15,2) DEFAULT 0,
            status                  VARCHAR(20) DEFAULT 'pending',
            rejection_reason        TEXT DEFAULT NULL,
            revision_no             INT DEFAULT 0,
            added_by                INT NOT NULL,
            device_id               VARCHAR(255),
            customer_order_no       VARCHAR(255) DEFAULT NULL,
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customer_master(id) ON DELETE RESTRICT,
            FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    const itemsQuery = `
        CREATE TABLE IF NOT EXISTS sales_order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sales_order_id INT NOT NULL,
            material_id INT NOT NULL,
            quantity DECIMAL(15,3) NOT NULL,
            price DECIMAL(15,2) NOT NULL,
            gst DECIMAL(5,2) DEFAULT 0,
            discount DECIMAL(5,2) DEFAULT 0,
            total_price DECIMAL(15,2) NOT NULL,
            FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT
        )
    `;

    await db.execute(query);
    await db.execute(itemsQuery);
    console.log('Sales orders tables ready');
};

const ensureSalesOrderColumns = async () => {
    const columnsToEnsure = [
        { name: 'status', query: `ALTER TABLE sales_orders ADD COLUMN status VARCHAR(20) DEFAULT 'pending'` },
        { name: 'rejection_reason', query: `ALTER TABLE sales_orders ADD COLUMN rejection_reason TEXT DEFAULT NULL` },
        { name: 'revision_no', query: `ALTER TABLE sales_orders ADD COLUMN revision_no INT DEFAULT 0` },
        { name: 'customer_order_no', query: `ALTER TABLE sales_orders ADD COLUMN customer_order_no VARCHAR(255) DEFAULT NULL` },
    ];
    for (const col of columnsToEnsure) {
        const [rows] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_orders' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows.length === 0) {
            await db.execute(col.query);
            console.log(`Added column ${col.name} to sales_orders`);
        }
    }
};

const createSalesOrder = async (salesOrderId, customerId, totalAmount, addedBy, deviceId, items, customerOrderNo) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const query = `
            INSERT INTO sales_orders (sales_order_id, customer_id, total_amount, status, rejection_reason, revision_no, added_by, device_id, customer_order_no)
            VALUES (?, ?, ?, 'pending', NULL, 0, ?, ?, ?)
        `;
        const [results] = await connection.execute(query, [
            salesOrderId,
            customerId,
            totalAmount,
            addedBy,
            deviceId,
            customerOrderNo || null
        ]);

        const orderId = results.insertId;

        const itemQuery = `
            INSERT INTO sales_order_items (sales_order_id, material_id, quantity, price, gst, discount, total_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        for (const item of items) {
            await connection.execute(itemQuery, [
                orderId,
                item.materialId,
                item.quantity,
                item.price,
                item.gst || 0,
                item.discount || 0,
                item.totalPrice
            ]);
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

const getAllSalesOrders = async () => {
    const query = `
        SELECT
            so.*,
            c.customer_name,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM sales_orders so
        LEFT JOIN customer_master c ON so.customer_id = c.id
        LEFT JOIN users u ON so.added_by = u.id
        ORDER BY so.created_at DESC
    `;

    const [results] = await db.execute(query);
    return results;
};

const getSalesOrderById = async (id) => {
    const query = `
        SELECT so.*, c.customer_name, COALESCE(u.name, 'Unknown') AS added_by_name
        FROM sales_orders so
        LEFT JOIN customer_master c ON so.customer_id = c.id
        LEFT JOIN users u ON so.added_by = u.id
        WHERE so.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    
    if (rows.length === 0) return null;
    const order = rows[0];

    const itemsQuery = `
        SELECT i.*, m.material_name, m.material_code, u.unit_name as uom, m.hsn_code
        FROM sales_order_items i
        LEFT JOIN materials m ON i.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        WHERE i.sales_order_id = ?
    `;
    
    const [items] = await db.execute(itemsQuery, [id]);
    order.items = items;

    return order;
};

const updateSalesOrder = async (id, salesOrderId, customerId, totalAmount, items, customerOrderNo) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Fetch current SO to determine revision increment
        const [currentSORows] = await connection.execute(
            `SELECT status, revision_no FROM sales_orders WHERE id = ?`,
            [id]
        );

        if (currentSORows.length === 0) {
            throw new Error("Sales order not found");
        }

        const currentSO = currentSORows[0];
        let nextRevisionNo = currentSO.revision_no || 0;

        // Auto-increment revision if the SO was previously approved or rejected
        if (currentSO.status === 'approved' || currentSO.status === 'rejected') {
            nextRevisionNo += 1;
        }

        const query = `
            UPDATE sales_orders
            SET sales_order_id = ?, customer_id = ?, total_amount = ?, status = 'pending', rejection_reason = NULL, revision_no = ?, customer_order_no = ?
            WHERE id = ?
        `;
        await connection.execute(query, [
            salesOrderId,
            customerId,
            totalAmount,
            nextRevisionNo,
            customerOrderNo || null,
            id
        ]);

        // Delete old items
        await connection.execute(`DELETE FROM sales_order_items WHERE sales_order_id = ?`, [id]);

        // Insert new items
        const itemQuery = `
            INSERT INTO sales_order_items (sales_order_id, material_id, quantity, price, gst, discount, total_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        for (const item of items) {
            await connection.execute(itemQuery, [
                id,
                item.materialId || item.material_id, // handle both cases
                item.quantity,
                item.price,
                item.gst || 0,
                item.discount || 0,
                item.totalPrice || item.total_price
            ]);
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

const deleteSalesOrder = async (id) => {
    const query = `DELETE FROM sales_orders WHERE id = ?`; // Cascade will delete items
    const [results] = await db.execute(query, [id]);
    return results;
};

const reviseSalesOrder = async (originalId, salesOrderId, customerId, totalAmount, itemsData, addedBy, deviceId, customerOrderNo) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Fetch current SO
        const [currentSORows] = await connection.execute(
            `SELECT sales_order_id, revision_no FROM sales_orders WHERE id = ?`,
            [originalId]
        );

        if (currentSORows.length === 0) {
            throw new Error("Sales order not found");
        }

        const currentSO = currentSORows[0];

        // 2. Determine base SO ID and new suffix
        let baseSoId = currentSO.sales_order_id;
        const suffixMatch = currentSO.sales_order_id.match(/-(\d{3})$/);
        if (suffixMatch) {
            baseSoId = currentSO.sales_order_id.substring(0, currentSO.sales_order_id.lastIndexOf('-'));
        }

        // 3. Count existing revisions for this base SO to generate the next suffix
        const [revisionRows] = await connection.execute(
            `SELECT COUNT(*) AS cnt FROM sales_orders WHERE sales_order_id LIKE ? AND sales_order_id != ?`,
            [`${baseSoId}-%`, baseSoId]
        );
        const nextSuffixSeq = (revisionRows[0].cnt || 0) + 1;
        const newSalesOrderId = `${baseSoId}-${String(nextSuffixSeq).padStart(3, '0')}`;

        const nextRevisionNo = (currentSO.revision_no || 0) + 1;

        // 4. Insert new Sales Order
        const query = `
            INSERT INTO sales_orders (sales_order_id, customer_id, total_amount, status, rejection_reason, revision_no, added_by, device_id, customer_order_no)
            VALUES (?, ?, ?, 'pending', NULL, ?, ?, ?, ?)
        `;
        const [results] = await connection.execute(query, [
            newSalesOrderId,
            customerId,
            totalAmount,
            nextRevisionNo,
            addedBy,
            deviceId,
            customerOrderNo || null
        ]);

        const newOrderId = results.insertId;

        // 5. Insert items
        const itemQuery = `
            INSERT INTO sales_order_items (sales_order_id, material_id, quantity, price, gst, discount, total_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        for (const item of itemsData) {
            await connection.execute(itemQuery, [
                newOrderId,
                item.materialId || item.material_id,
                item.quantity,
                item.price,
                item.gst || 0,
                item.discount || 0,
                item.totalPrice || item.total_price
            ]);
        }

        await connection.commit();
        return { salesOrderId: newSalesOrderId, id: newOrderId };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createSalesOrdersTable,
    ensureSalesOrderColumns,
    createSalesOrder,
    getAllSalesOrders,
    getSalesOrderById,
    updateSalesOrder,
    deleteSalesOrder,
    reviseSalesOrder
};
