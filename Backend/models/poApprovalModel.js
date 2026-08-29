const db = require('../config/db.js');

const createPoApprovalLogsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS po_approval_logs (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            po_id           INT NOT NULL,
            action          VARCHAR(20) NOT NULL,
            action_by       INT NOT NULL,
            action_by_name  VARCHAR(255),
            reason          TEXT,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log("PO Approval Logs table ready");
};

const getPendingPOs = async () => {
    const query = `
        SELECT
            po.id, po.po_number, po.name, po.po_date, po.purchase_type, po.state,
            po.total_amount, po.revision_no, po.status, po.rejection_reason, po.created_at,
            COALESCE(usr.name, 'Unknown') AS added_by_name
        FROM purchase_orders po
        LEFT JOIN users usr ON po.added_by = usr.id
        WHERE po.status = 'pending'
        ORDER BY po.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const getAllApprovalPOs = async () => {
    const query = `
        SELECT
            po.id, po.po_number, po.name, po.po_date, po.purchase_type, po.state,
            po.total_amount, po.revision_no, po.status, po.rejection_reason, po.created_at,
            COALESCE(usr.name, 'Unknown') AS added_by_name
        FROM purchase_orders po
        LEFT JOIN users usr ON po.added_by = usr.id
        ORDER BY po.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
};

const approvePO = async (poId, actionBy, actionByName) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.execute(`UPDATE purchase_orders SET status = 'approved', rejection_reason = NULL WHERE id = ?`, [poId]);
        
        await connection.execute(`
            INSERT INTO po_approval_logs (po_id, action, action_by, action_by_name)
            VALUES (?, 'approved', ?, ?)
        `, [poId, actionBy, actionByName]);

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const rejectPO = async (poId, actionBy, actionByName, reason) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.execute(`UPDATE purchase_orders SET status = 'rejected', rejection_reason = ? WHERE id = ?`, [reason, poId]);
        
        await connection.execute(`
            INSERT INTO po_approval_logs (po_id, action, action_by, action_by_name, reason)
            VALUES (?, 'rejected', ?, ?, ?)
        `, [poId, actionBy, actionByName, reason]);

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getApprovalLogs = async (poId) => {
    const [rows] = await db.execute(
        `SELECT * FROM po_approval_logs WHERE po_id = ? ORDER BY created_at DESC`,
        [poId]
    );
    return rows;
};

module.exports = {
    createPoApprovalLogsTable,
    getPendingPOs,
    getAllApprovalPOs,
    approvePO,
    rejectPO,
    getApprovalLogs
};
