const db = require('../config/db.js');

const createSoApprovalLogsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS so_approval_logs (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            so_id           INT NOT NULL,
            action          VARCHAR(20) NOT NULL,
            action_by       INT NOT NULL,
            action_by_name  VARCHAR(255),
            reason          TEXT,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log("SO Approval Logs table ready");
};

const getPendingSOs = async () => {
    const query = `
        SELECT
            so.id, so.sales_order_id, so.customer_id, so.total_amount, so.revision_no, so.status,
            so.rejection_reason, so.created_at, c.customer_name,
            COALESCE(usr.name, 'Unknown') AS added_by_name
        FROM sales_orders so
        LEFT JOIN customer_master c ON so.customer_id = c.id
        LEFT JOIN users usr ON so.added_by = usr.id
        WHERE so.status = 'pending'
        ORDER BY so.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getAllApprovalSOs = async () => {
    const query = `
        SELECT
            so.id, so.sales_order_id, so.customer_id, so.total_amount, so.revision_no, so.status,
            so.rejection_reason, so.created_at, c.customer_name,
            COALESCE(usr.name, 'Unknown') AS added_by_name
        FROM sales_orders so
        LEFT JOIN customer_master c ON so.customer_id = c.id
        LEFT JOIN users usr ON so.added_by = usr.id
        ORDER BY so.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const approveSO = async (soId, actionBy, actionByName) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.execute(`UPDATE sales_orders SET status = 'approved', rejection_reason = NULL WHERE id = ?`, [soId]);
        
        await connection.execute(`
            INSERT INTO so_approval_logs (so_id, action, action_by, action_by_name)
            VALUES (?, 'approved', ?, ?)
        `, [soId, actionBy, actionByName]);

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const rejectSO = async (soId, actionBy, actionByName, reason) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.execute(`UPDATE sales_orders SET status = 'rejected', rejection_reason = ? WHERE id = ?`, [reason, soId]);
        
        await connection.execute(`
            INSERT INTO so_approval_logs (so_id, action, action_by, action_by_name, reason)
            VALUES (?, 'rejected', ?, ?, ?)
        `, [soId, actionBy, actionByName, reason]);

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getApprovalLogs = async (soId) => {
    const [rows] = await db.execute(
        `SELECT * FROM so_approval_logs WHERE so_id = ? ORDER BY created_at DESC`,
        [soId]
    );
    return rows;
};

module.exports = {
    createSoApprovalLogsTable,
    getPendingSOs,
    getAllApprovalSOs,
    approveSO,
    rejectSO,
    getApprovalLogs
};
