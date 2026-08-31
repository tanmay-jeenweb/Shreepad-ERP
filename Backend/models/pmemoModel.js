const db = require('../config/db.js');

const createPMemoTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS production_memos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            p_memo_no INT NOT NULL UNIQUE,
            work_order_item_id INT NOT NULL UNIQUE,
            date DATE NOT NULL,
            rm_required DECIMAL(15,4) DEFAULT NULL,
            rm_made DECIMAL(15,4) DEFAULT NULL,
            rm_to_be_made DECIMAL(15,4) DEFAULT NULL,
            loss_kg DECIMAL(15,4) DEFAULT NULL,
            loss_percent DECIMAL(5,2) DEFAULT NULL,
            rm_return DECIMAL(15,4) DEFAULT NULL,
            running_total_kg DECIMAL(15,4) DEFAULT NULL,
            running_total_percent DECIMAL(5,2) DEFAULT NULL,
            running_total_nos DECIMAL(15,4) DEFAULT NULL,
            is_final_submitted TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_item_id) REFERENCES work_order_items(id) ON DELETE CASCADE
        )
    `;
    await db.execute(query);
    console.log('Production Memos table ready');
};

const createPMemoRmIssuesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS pmemo_rm_issues (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pmemo_id INT NOT NULL,
            lot DECIMAL(15,4) NOT NULL,
            date DATE NOT NULL,
            remark TEXT DEFAULT NULL,
            material_id INT NOT NULL,
            grade VARCHAR(100) NOT NULL,
            internal_batch_number VARCHAR(100) NOT NULL,
            grn_item_id INT DEFAULT NULL,
            ma_item_id INT DEFAULT NULL,
            rm_return_id INT DEFAULT NULL,
            stock_issue_id INT DEFAULT NULL,
            qty DECIMAL(15,4) NOT NULL,
            total_quantity DECIMAL(15,4) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (pmemo_id) REFERENCES production_memos(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (grn_item_id) REFERENCES grn_items(id) ON DELETE SET NULL,
            FOREIGN KEY (ma_item_id) REFERENCES material_add_items(id) ON DELETE SET NULL,
            FOREIGN KEY (rm_return_id) REFERENCES rm_returns(id) ON DELETE SET NULL,
            FOREIGN KEY (stock_issue_id) REFERENCES stock_issues(id) ON DELETE SET NULL
        )
    `;
    await db.execute(query);
    console.log('Production Memo RM Issues table ready');
};

const ensurePMemoColumns = async () => {
    try {
        const columnsToAdd = [
            { name: 'rm_required', type: 'DECIMAL(15,4) DEFAULT NULL' },
            { name: 'rm_made', type: 'DECIMAL(15,4) DEFAULT NULL' },
            { name: 'rm_to_be_made', type: 'DECIMAL(15,4) DEFAULT NULL' },
            { name: 'loss_kg', type: 'DECIMAL(15,4) DEFAULT NULL' },
            { name: 'loss_percent', type: 'DECIMAL(5,2) DEFAULT NULL' },
            { name: 'rm_return', type: 'DECIMAL(15,4) DEFAULT NULL' },
            { name: 'running_total_kg', type: 'DECIMAL(15,4) DEFAULT NULL' },
            { name: 'running_total_percent', type: 'DECIMAL(5,2) DEFAULT NULL' },
            { name: 'running_total_nos', type: 'DECIMAL(15,4) DEFAULT NULL' },
            { name: 'is_final_submitted', type: 'TINYINT DEFAULT 0' }
        ];

        for (const col of columnsToAdd) {
            const [rows] = await db.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'production_memos' 
                  AND COLUMN_NAME = ?
            `, [col.name]);

            if (rows.length === 0) {
                await db.execute(`ALTER TABLE production_memos ADD COLUMN ${col.name} ${col.type}`);
                console.log(`Added column ${col.name} to production_memos`);
            }
        }
    } catch (err) {
        console.error('Error ensuring production_memos columns:', err.message || err);
    }
};

const getNextPMemoNo = async () => {
    const [rows] = await db.execute(
        `SELECT MAX(p_memo_no) AS maxNo FROM production_memos`
    );
    const maxNo = rows[0]?.maxNo;
    return maxNo ? maxNo + 1 : 1;
};

const getPMemoByWorkOrderItemId = async (workOrderItemId) => {
    const query = `
        SELECT 
            pm.id AS id,
            woi.id AS work_order_item_id,
            pm.p_memo_no,
            pm.date AS p_memo_date,
            pm.rm_required,
            pm.rm_made,
            pm.rm_to_be_made,
            pm.loss_kg,
            pm.loss_percent,
            pm.rm_return,
            pm.running_total_kg,
            pm.running_total_percent,
            pm.running_total_nos,
            pm.is_final_submitted,
            mac.name AS machine_name,
            m.material_name,
            m.material_code AS item_code,
            bom.product_weight AS unit_weight,
            woi.batch_no AS batch,
            woi.quantity AS production_quantity,
            wo.id AS work_order_id,
            wo.work_order_no
        FROM work_order_items woi
        LEFT JOIN work_orders wo ON woi.work_order_id = wo.id
        LEFT JOIN production_memos pm ON woi.id = pm.work_order_item_id
        LEFT JOIN machines mac ON woi.machine_id = mac.id
        LEFT JOIN sales_order_items soi ON woi.sales_order_item_id = soi.id
        LEFT JOIN materials m ON soi.material_id = m.id
        LEFT JOIN bill_of_materials bom ON m.id = bom.material_id
        WHERE woi.id = ?
    `;
    const [rows] = await db.execute(query, [workOrderItemId]);
    return rows[0] || null;
};

const getPMemoRmIssues = async (pmemoId) => {
    const query = `
        SELECT 
            pri.id,
            pri.pmemo_id,
            pri.lot,
            pri.date,
            pri.remark,
            pri.material_id,
            m.material_name AS rm_type_name,
            pri.grade,
            pri.internal_batch_number,
            pri.grn_item_id,
            pri.ma_item_id,
            pri.rm_return_id,
            pri.stock_issue_id,
            pri.qty,
            pri.total_quantity,
            COALESCE(ss.mfi, '') AS mfi,
            COALESCE(gi.supplier_batch_number, '') AS supplier_batch_number
        FROM pmemo_rm_issues pri
        JOIN materials m ON pri.material_id = m.id
        LEFT JOIN stock_status ss ON pri.internal_batch_number = ss.internal_batch_number
        LEFT JOIN grn_items gi ON pri.grn_item_id = gi.id
        WHERE pri.pmemo_id = ?
        ORDER BY pri.id ASC
    `;
    const [rows] = await db.execute(query, [pmemoId]);
    return rows;
};

const getAvailableBatches = async (materialId, grade) => {
    const query = `
        SELECT 
            ss.internal_batch_number,
            gi.id AS grn_item_id,
            mai.id AS ma_item_id,
            r.id AS rm_return_id,
            COALESCE(gi.supplier_batch_number, '') AS supplier_batch_number,
            COALESCE(ss.mfi, '') AS mfi,
            (COALESCE(qc_agg.approved_qty, qc_ma_agg.approved_qty, r.quantity, ss.total_kg) - COALESCE(issue_agg.issued_qty, issue_ma_agg.issued_qty, issue_rtr_agg.issued_qty, 0)) AS available_qty
        FROM stock_status ss
        LEFT JOIN grn_items gi ON ss.internal_batch_number = gi.internal_batch_number AND ss.grn_id IS NOT NULL
        LEFT JOIN material_add_items mai ON ss.internal_batch_number = mai.internal_batch_number AND ss.ma_id IS NOT NULL
        LEFT JOIN rm_returns r ON ss.internal_batch_number = r.internal_batch_number AND ss.rm_return_id IS NOT NULL
        LEFT JOIN (
            SELECT grn_item_id, SUM(approved_quantity) AS approved_qty
            FROM qc_items WHERE grn_item_id IS NOT NULL
            GROUP BY grn_item_id
        ) qc_agg ON gi.id = qc_agg.grn_item_id
        LEFT JOIN (
            SELECT ma_item_id, SUM(approved_quantity) AS approved_qty
            FROM qc_items WHERE ma_item_id IS NOT NULL
            GROUP BY ma_item_id
        ) qc_ma_agg ON mai.id = qc_ma_agg.ma_item_id
        LEFT JOIN (
            SELECT grn_item_id, SUM(issue_quantity) AS issued_qty
            FROM stock_issues WHERE grn_item_id IS NOT NULL
            GROUP BY grn_item_id
        ) issue_agg ON gi.id = issue_agg.grn_item_id
        LEFT JOIN (
            SELECT ma_item_id, SUM(issue_quantity) AS issued_qty
            FROM stock_issues WHERE ma_item_id IS NOT NULL
            GROUP BY ma_item_id
        ) issue_ma_agg ON mai.id = issue_ma_agg.ma_item_id
        LEFT JOIN (
            SELECT rm_return_id, SUM(issue_quantity) AS issued_qty
            FROM stock_issues WHERE rm_return_id IS NOT NULL
            GROUP BY rm_return_id
        ) issue_rtr_agg ON r.id = issue_rtr_agg.rm_return_id
        WHERE ss.material_id = ? AND COALESCE(ss.rm_grade, '') = ?
        HAVING available_qty > 0
    `;
    const [rows] = await db.execute(query, [materialId, grade || '']);
    return rows;
};

const createPMemo = async (workOrderItemId, date, rmDetails = {}, rmIssues = [], addedBy = null) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if production memo already exists
        const [existing] = await connection.execute(
            `SELECT id, p_memo_no, is_final_submitted FROM production_memos WHERE work_order_item_id = ?`,
            [workOrderItemId]
        );

        // Commented out to allow editing/issuing raw materials again and again as per new requirement
        // if (existing.length > 0 && existing[0].is_final_submitted === 1) {
        //     throw new Error('This Production Memo has been finally submitted and cannot be modified.');
        // }

        let pmemoId;
        let memoNo;
        if (existing.length > 0) {
            pmemoId = existing[0].id;
            memoNo = existing[0].p_memo_no;
        } else {
            // Get next memo number inside the transaction for safety
            const [maxNoRows] = await connection.execute(
                `SELECT MAX(p_memo_no) AS maxNo FROM production_memos`
            );
            const maxNo = maxNoRows[0]?.maxNo;
            memoNo = maxNo ? maxNo + 1 : 1;
        }

        const queryMemo = `
            INSERT INTO production_memos (
                p_memo_no, work_order_item_id, date,
                rm_required, rm_made, rm_to_be_made,
                loss_kg, loss_percent, rm_return,
                running_total_kg, running_total_percent,
                running_total_nos, is_final_submitted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                date = VALUES(date),
                rm_required = VALUES(rm_required),
                rm_made = VALUES(rm_made),
                rm_to_be_made = VALUES(rm_to_be_made),
                loss_kg = VALUES(loss_kg),
                loss_percent = VALUES(loss_percent),
                rm_return = VALUES(rm_return),
                running_total_kg = VALUES(running_total_kg),
                running_total_percent = VALUES(running_total_percent),
                running_total_nos = VALUES(running_total_nos),
                is_final_submitted = VALUES(is_final_submitted)
        `;

        const [memoResult] = await connection.execute(queryMemo, [
            memoNo,
            workOrderItemId,
            date,
            rmDetails.rm_required !== undefined && rmDetails.rm_required !== '' ? rmDetails.rm_required : null,
            rmDetails.rm_made !== undefined && rmDetails.rm_made !== '' ? rmDetails.rm_made : null,
            rmDetails.rm_to_be_made !== undefined && rmDetails.rm_to_be_made !== '' ? rmDetails.rm_to_be_made : null,
            rmDetails.loss_kg !== undefined && rmDetails.loss_kg !== '' ? rmDetails.loss_kg : null,
            rmDetails.loss_percent !== undefined && rmDetails.loss_percent !== '' ? rmDetails.loss_percent : null,
            rmDetails.rm_return !== undefined && rmDetails.rm_return !== '' ? rmDetails.rm_return : null,
            rmDetails.running_total_kg !== undefined && rmDetails.running_total_kg !== '' ? rmDetails.running_total_kg : null,
            rmDetails.running_total_percent !== undefined && rmDetails.running_total_percent !== '' ? rmDetails.running_total_percent : null,
            rmDetails.running_total_nos !== undefined && rmDetails.running_total_nos !== '' ? rmDetails.running_total_nos : null,
            rmDetails.is_final_submitted !== undefined ? Number(rmDetails.is_final_submitted) : 0
        ]);

        if (existing.length > 0) {
            pmemoId = existing[0].id;
        } else {
            pmemoId = memoResult.insertId;
        }

        // --- Process RM Issues ---
        // 1. Fetch any existing issue items for this production memo
        const [oldIssues] = await connection.execute(
            `SELECT id, stock_issue_id FROM pmemo_rm_issues WHERE pmemo_id = ?`,
            [pmemoId]
        );

        // 2. Delete old stock issues from stock_issues table (automatically reverting stock status balance)
        const oldStockIssueIds = oldIssues.map(oi => oi.stock_issue_id).filter(Boolean);
        if (oldStockIssueIds.length > 0) {
            const placeholders = oldStockIssueIds.map(() => '?').join(',');
            await connection.execute(
                `DELETE FROM stock_issues WHERE id IN (${placeholders})`,
                oldStockIssueIds
            );
        }

        // 3. Delete old pmemo_rm_issues records
        await connection.execute(
            `DELETE FROM pmemo_rm_issues WHERE pmemo_id = ?`,
            [pmemoId]
        );

        // 4. Save new issues
        const formattedMemoNo = `PM-${String(memoNo).padStart(4, '0')}`;
        for (const issue of rmIssues) {
            // First, create the stock_issue record
            const insertStockIssueQuery = `
                INSERT INTO stock_issues (
                    grn_item_id, ma_item_id, rm_return_id, issue_quantity, p_memo_number, issue_date, remarks, removal_type, added_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'issue', ?)
            `;
            const [stockIssueResult] = await connection.execute(insertStockIssueQuery, [
                issue.grn_item_id || null,
                issue.ma_item_id || null,
                issue.rm_return_id || null,
                Math.floor(Number(issue.lot) || 0) * (Number(issue.qty) || 0),
                formattedMemoNo,
                issue.date || date, // default to P Memo date if issue date not supplied
                issue.remark || null,
                addedBy
            ]);
            const stockIssueId = stockIssueResult.insertId;

            // Second, create the pmemo_rm_issue record
            const insertPmRmIssueQuery = `
                INSERT INTO pmemo_rm_issues (
                    pmemo_id, lot, date, remark, material_id, grade, internal_batch_number, grn_item_id, ma_item_id, rm_return_id, stock_issue_id, qty, total_quantity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.execute(insertPmRmIssueQuery, [
                pmemoId,
                Number(issue.lot) || 0, // Store full decimal suffix lot
                issue.date || date,
                issue.remark || null,
                Number(issue.material_id),
                issue.grade,
                issue.internal_batch_number,
                issue.grn_item_id || null,
                issue.ma_item_id || null,
                issue.rm_return_id || null,
                stockIssueId,
                Number(issue.qty) || 0,
                Math.floor(Number(issue.lot) || 0) * (Number(issue.qty) || 0)
            ]);
        }

        await connection.commit();
        return { insertId: pmemoId, p_memo_no: memoNo };
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const ensurePMemoRmIssuesColumns = async () => {
    try {
        const [rows] = await db.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'pmemo_rm_issues' 
              AND COLUMN_NAME = 'rm_return_id'
        `);

        if (rows.length === 0) {
            await db.execute(`ALTER TABLE pmemo_rm_issues ADD COLUMN rm_return_id INT DEFAULT NULL`);
            await db.execute(`ALTER TABLE pmemo_rm_issues ADD CONSTRAINT fk_pmemo_rm_issues_rtr FOREIGN KEY (rm_return_id) REFERENCES rm_returns(id) ON DELETE SET NULL`);
            console.log(`Added column rm_return_id to pmemo_rm_issues`);
        }
    } catch (err) {
        console.error('Error ensuring pmemo_rm_issues columns:', err.message || err);
    }
};

module.exports = {
    createPMemoTable,
    createPMemoRmIssuesTable,
    ensurePMemoColumns,
    ensurePMemoRmIssuesColumns,
    getNextPMemoNo,
    getPMemoByWorkOrderItemId,
    getPMemoRmIssues,
    getAvailableBatches,
    createPMemo
};
