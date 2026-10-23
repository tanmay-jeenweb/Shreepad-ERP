const ExcelJS = require('exceljs');
const db = require('../config/db.js');
const { getOrganizationDetails } = require('../models/organizationModel.js');
const { getTermsAndConditionsById } = require('../models/termsAndConditionsModel.js');

/**
 * Format a date object or string into DD-MM-YYYY
 */
const formatDate = (dateVal) => {
    if (!dateVal) return '-';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return '-';
    }
};

/**
 * Parse HTML content (like from React Quill) into an array of clean plain-text strings
 */
const parseHtmlToCleanLines = (htmlContent) => {
    if (!htmlContent) return [];
    
    // Check if it contains <li> tags
    if (/<li[^>]*>/i.test(htmlContent)) {
        const listItems = [];
        const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let match;
        while ((match = regex.exec(htmlContent)) !== null) {
            let itemText = match[1]
                .replace(/<[^>]+>/g, '') // remove inner HTML tags
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .trim();
            if (itemText) {
                listItems.push(itemText);
            }
        }
        return listItems;
    }

    // Otherwise, split by <p> or <br> or newlines
    let text = htmlContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
    
    return text.split('\n').map(l => l.trim()).filter(Boolean);
};

/**
 * Query full details for a Work Order for report & Excel generation
 */
const getWorkOrderReportDetails = async (workOrderId) => {
    const woQuery = `
        SELECT
            wo.*,
            COALESCE(wo.status, 'Draft') AS status,
            c.customer_name,
            c.customer_code,
            insp.name AS inspection_name
        FROM work_orders wo
        LEFT JOIN customer_master c ON wo.customer_id = c.id
        LEFT JOIN inspection_masters insp ON wo.inspection_id = insp.id
        WHERE wo.id = ?
    `;
    const [woRows] = await db.execute(woQuery, [workOrderId]);
    if (woRows.length === 0) return null;
    const workOrder = woRows[0];

    // Fetch items with joined material details (details, item, size, class, material_code, material_name)
    const itemsQuery = `
        SELECT
            woi.id AS work_order_item_id,
            woi.material_id,
            woi.quantity,
            woi.production_quantity,
            woi.exp_delivery_date,
            woi.batch_no AS item_batch_no,
            woi.remarks,
            woi.sort_order,
            m.material_code,
            m.material_name,
            COALESCE(NULLIF(TRIM(m.details), ''), m.material_name) AS item_description,
            COALESCE(NULLIF(TRIM(m.item), ''), '-') AS item_type,
            COALESCE(NULLIF(TRIM(m.size), ''), '-') AS item_size,
            COALESCE(NULLIF(TRIM(m.class), ''), '-') AS item_class,
            COALESCE(m.material_group, 'PLATE & FORGED FLANGES') AS material_group
        FROM work_order_items woi
        LEFT JOIN materials m ON woi.material_id = m.id
        WHERE woi.work_order_id = ?
          AND COALESCE(woi.production_quantity, 0) > 0
          AND (LOWER(COALESCE(m.material_group, '')) NOT LIKE '%raw%')
          AND (woi.remarks IS NULL OR woi.remarks NOT LIKE 'Allocated raw material%')
        ORDER BY COALESCE(woi.sort_order, woi.id) ASC, woi.id ASC
    `;
    const [items] = await db.execute(itemsQuery, [workOrderId]);

    // Query finished goods batches ONLY from completed production logs (where to_bom_process_id IS NULL)
    const logsQuery = `
        SELECT
            wpl.work_order_item_id,
            wpl.batch_no,
            SUM(CASE WHEN wpl.movement_type = 'revert' THEN -wpl.quantity ELSE wpl.quantity END) AS finished_qty
        FROM workshop_production_logs wpl
        WHERE wpl.work_order_item_id IN (SELECT id FROM work_order_items WHERE work_order_id = ?)
          AND wpl.to_bom_process_id IS NULL
          AND wpl.batch_no IS NOT NULL
          AND TRIM(wpl.batch_no) != ''
        GROUP BY wpl.work_order_item_id, wpl.batch_no
        HAVING finished_qty > 0
        ORDER BY wpl.batch_no ASC
    `;
    const [logRows] = await db.execute(logsQuery, [workOrderId]);

    const batchMap = {};
    for (const row of logRows) {
        if (!batchMap[row.work_order_item_id]) {
            batchMap[row.work_order_item_id] = [];
        }
        batchMap[row.work_order_item_id].push({
            batch_no: row.batch_no,
            qty: Number(row.finished_qty)
        });
    }

    // Attach resolved ID No. (ONLY if batch number is assigned after complete production)
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        it.sr_no = i + 1;
        const finishedBatches = batchMap[it.work_order_item_id] || [];

        if (finishedBatches.length > 0) {
            it.has_finished_batch = true;
            it.batch_list = finishedBatches;
            if (finishedBatches.length === 1) {
                // Single batch
                it.id_no = finishedBatches[0].batch_no;
            } else {
                // Multiple batches: one after the other with quantity
                it.id_no = finishedBatches
                    .map(b => `${b.batch_no}-${b.qty} Nos.`)
                    .join(' / \n');
            }
        } else {
            // No finished production batch assigned
            it.has_finished_batch = false;
            it.batch_list = [];
            it.id_no = '-';
        }
    }

    workOrder.items = items;
    return workOrder;
};

/**
 * Generate Excel workbook for a Work Order matching corporate layout
 */
const generateWorkOrderExcel = async (workOrderId, termsId = null, customNotes = null) => {
    const workOrder = await getWorkOrderReportDetails(workOrderId);
    if (!workOrder) {
        throw new Error(`Work Order with ID ${workOrderId} not found.`);
    }

    const orgDetails = await getOrganizationDetails();

    let termsConditions = [];
    if (termsId) {
        const termsRecord = await getTermsAndConditionsById(termsId);
        if (termsRecord && termsRecord.description) {
            termsConditions = parseHtmlToCleanLines(termsRecord.description);
        }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shreepad ERP';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Work Order', {
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
        },
        views: [{ showGridLines: true }]
    });

    // Column widths setup (Columns A to I)
    sheet.columns = [
        { key: 'colA', width: 8 },   // Sr. No
        { key: 'colB', width: 15 },  // Mat Code
        { key: 'colC', width: 36 },  // Item Description / Major Capex label
        { key: 'colD', width: 8 },   // Item
        { key: 'colE', width: 8 },   // Size
        { key: 'colF', width: 10 },  // Class
        { key: 'colG', width: 15 },  // Material
        { key: 'colH', width: 10 },  // Qty
        { key: 'colI', width: 24 }   // ID No.
    ];

    const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
        left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
        bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
        right: { style: 'thin', color: { argb: 'FFB0B0B0' } }
    };

    const applyBorderToRange = (startCol, startRow, endCol, endRow) => {
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const cell = sheet.getCell(r, c);
                cell.border = thinBorder;
            }
        }
    };

    // ── Row 1: Logo Centered at Top (No company name text as requested) ────────
    sheet.getRow(1).height = 46;
    sheet.mergeCells('A1:I1');
    const row1Cell = sheet.getCell('A1');
    row1Cell.value = '';

    // Embed logo centered horizontally
    if (orgDetails?.logo && orgDetails.logo.startsWith('data:image')) {
        try {
            const matches = orgDetails.logo.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (matches && matches[2]) {
                const ext = matches[1].toLowerCase().replace('jpeg', 'jpg');
                const validExt = ['png', 'jpg', 'jpeg', 'gif'].includes(ext) ? ext : 'png';
                const imageId = workbook.addImage({
                    base64: matches[2],
                    extension: validExt
                });
                // Place centered across the sheet
                sheet.addImage(imageId, {
                    tl: { col: 2.8, row: 0.08 },
                    ext: { width: 380, height: 44 }
                });
            }
        } catch (imgErr) {
            console.error('Error embedding logo in Excel:', imgErr.message);
        }
    }

    // ── Row 2: WORK ORDER Banner ────────────────────────────────────────────────
    sheet.getRow(2).height = 24;
    sheet.mergeCells('A2:I2');
    const titleCell = sheet.getCell('A2');
    titleCell.value = 'WORK ORDER';
    titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
    };
    applyBorderToRange(1, 2, 9, 2);

    // ── Rows 3-8: Two-column Work Order Details ─────────────────────────────────
    // Row 3: Rev No. (Rev Date removed as requested)
    sheet.getRow(3).height = 20;
    sheet.getCell('A3').value = 'Rev No.';
    sheet.getCell('A3').font = { bold: true, size: 9 };
    sheet.mergeCells('B3:I3');
    sheet.getCell('B3').value = workOrder.revision_number !== null && workOrder.revision_number !== undefined ? String(workOrder.revision_number) : '0';
    sheet.getCell('B3').font = { size: 9 };

    // Row 4: W.O. No. & Dated
    sheet.getRow(4).height = 20;
    sheet.getCell('A4').value = 'W.O. No.';
    sheet.getCell('A4').font = { bold: true, size: 9 };
    sheet.mergeCells('B4:E4');
    sheet.getCell('B4').value = workOrder.work_order_no ? `WO-${String(workOrder.work_order_no).padStart(4, '0')}` : '-';
    sheet.getCell('B4').font = { bold: true, size: 9 };
    
    sheet.getCell('F4').value = 'Dated :';
    sheet.getCell('F4').font = { bold: true, size: 9 };
    sheet.mergeCells('G4:I4');
    sheet.getCell('G4').value = formatDate(workOrder.work_order_date);
    sheet.getCell('G4').font = { size: 9 };

    // Row 5: CLIENT
    sheet.getRow(5).height = 22;
    sheet.getCell('A5').value = 'CLIENT';
    sheet.getCell('A5').font = { bold: true, size: 9 };
    sheet.mergeCells('B5:I5');
    sheet.getCell('B5').value = workOrder.customer_name || '-';
    sheet.getCell('B5').font = { bold: true, size: 9.5 };

    // Row 6: Client P.O. & Dated
    sheet.getRow(6).height = 20;
    sheet.getCell('A6').value = 'Client P.O.';
    sheet.getCell('A6').font = { bold: true, size: 9 };
    sheet.mergeCells('B6:E6');
    sheet.getCell('B6').value = workOrder.purchase_order_number || '-';
    sheet.getCell('B6').font = { size: 9 };
    
    sheet.getCell('F6').value = 'Dated :';
    sheet.getCell('F6').font = { bold: true, size: 9 };
    sheet.mergeCells('G6:I6');
    sheet.getCell('G6').value = formatDate(workOrder.purchase_order_date);
    sheet.getCell('G6').font = { size: 9 };

    // Row 7: PROJECT & MAJOR CAPEX (Major Capex just beside Project)
    sheet.getRow(7).height = 20;
    sheet.getCell('A7').value = 'PROJECT';
    sheet.getCell('A7').font = { bold: true, size: 9 };
    sheet.getCell('B7').value = workOrder.project_name || '-';
    sheet.getCell('B7').font = { size: 9 };
    
    sheet.getCell('C7').value = 'MAJOR CAPEX';
    sheet.getCell('C7').font = { bold: true, size: 9 };
    sheet.mergeCells('D7:I7');
    sheet.getCell('D7').value = workOrder.major_capex || '';
    sheet.getCell('D7').font = { bold: true, size: 9 };

    // Row 8: INSPECTION
    sheet.getRow(8).height = 20;
    sheet.getCell('A8').value = 'INSPECTION';
    sheet.getCell('A8').font = { bold: true, size: 9 };
    sheet.mergeCells('B8:I8');
    sheet.getCell('B8').value = workOrder.inspection_name || '-';
    sheet.getCell('B8').font = { size: 9 };

    applyBorderToRange(1, 3, 9, 8);

    // ── Row 9: Group Summary Headers ───────────────────────────────────────────
    sheet.getRow(9).height = 22;
    sheet.getCell('A9').value = 'Sr. No.';
    sheet.getCell('A9').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('A9').font = { bold: true, size: 9 };

    sheet.mergeCells('B9:G9');
    sheet.getCell('B9').value = 'Item Description';
    sheet.getCell('B9').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('B9').font = { bold: true, size: 9 };

    sheet.getCell('H9').value = 'Quantity';
    sheet.getCell('H9').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('H9').font = { bold: true, size: 9 };

    sheet.getCell('I9').value = 'Delivery Date';
    sheet.getCell('I9').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('I9').font = { bold: true, size: 9 };

    applyBorderToRange(1, 9, 9, 9);

    // ── Row 10: Group Summary Values ───────────────────────────────────────────
    const totalQty = workOrder.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const firstDeliveryDate = workOrder.items.find(it => it.exp_delivery_date)?.exp_delivery_date;
    const materialGroup = workOrder.items[0]?.material_group || 'PLATE & FORGED FLANGES';

    sheet.getRow(10).height = 22;
    sheet.getCell('A10').value = '';
    sheet.mergeCells('B10:G10');
    sheet.getCell('B10').value = materialGroup.toUpperCase();
    sheet.getCell('B10').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('B10').font = { bold: true, size: 9.5 };

    sheet.getCell('H10').value = totalQty;
    sheet.getCell('H10').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('H10').font = { bold: true, size: 9.5 };

    sheet.getCell('I10').value = formatDate(firstDeliveryDate);
    sheet.getCell('I10').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('I10').font = { bold: true, size: 9 };

    applyBorderToRange(1, 10, 9, 10);

    // ── Row 11: Column Headers ─────────────────────────────────────────────────
    sheet.getRow(11).height = 24;
    const headers = [
        { col: 'A', text: 'Sr. No' },
        { col: 'B', text: 'Mat Code' },
        { col: 'C', text: 'Item Description' },
        { col: 'D', text: 'Item' },
        { col: 'E', text: 'Size' },
        { col: 'F', text: 'Class' },
        { col: 'G', text: 'Material' },
        { col: 'H', text: 'Qty' },
        { col: 'I', text: 'ID No.' }
    ];

    headers.forEach(h => {
        const cell = sheet.getCell(`${h.col}11`);
        cell.value = h.text;
        cell.font = { bold: true, size: 9, name: 'Segoe UI' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (h.col === 'I') {
            // ID No. header with yellow background
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' } // Bright Yellow
            };
        } else {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8FAFC' }
            };
        }
    });
    applyBorderToRange(1, 11, 9, 11);

    // ── Rows 12+: Items List ───────────────────────────────────────────────────
    let currentRow = 12;
    workOrder.items.forEach((item, index) => {
        const isMultipleBatches = item.has_finished_batch && Array.isArray(item.batch_list) && item.batch_list.length > 1;
        const rowHeight = isMultipleBatches ? Math.max(24, item.batch_list.length * 16) : 20;

        const row = sheet.getRow(currentRow);
        row.height = rowHeight;

        // Sr. No
        const cellA = sheet.getCell(`A${currentRow}`);
        cellA.value = index + 1;
        cellA.alignment = { horizontal: 'center', vertical: 'middle' };

        // Mat Code
        const cellB = sheet.getCell(`B${currentRow}`);
        cellB.value = item.material_code || '-';
        cellB.alignment = { horizontal: 'center', vertical: 'middle' };

        // Item Description (material master details/description)
        const cellC = sheet.getCell(`C${currentRow}`);
        cellC.value = item.item_description || '-';
        cellC.alignment = { horizontal: 'left', vertical: 'middle' };

        // Item
        const cellD = sheet.getCell(`D${currentRow}`);
        cellD.value = item.item_type || '-';
        cellD.alignment = { horizontal: 'center', vertical: 'middle' };

        // Size
        const cellE = sheet.getCell(`E${currentRow}`);
        cellE.value = item.item_size || '-';
        cellE.alignment = { horizontal: 'center', vertical: 'middle' };

        // Class
        const cellF = sheet.getCell(`F${currentRow}`);
        cellF.value = item.item_class || '-';
        cellF.alignment = { horizontal: 'center', vertical: 'middle' };

        // Material
        const cellG = sheet.getCell(`G${currentRow}`);
        cellG.value = item.material_name || '-';
        cellG.alignment = { horizontal: 'center', vertical: 'middle' };

        // Qty
        const cellH = sheet.getCell(`H${currentRow}`);
        cellH.value = Number(item.quantity) || 0;
        cellH.alignment = { horizontal: 'center', vertical: 'middle' };

        // ID No. (Batch No)
        const cellI = sheet.getCell(`I${currentRow}`);
        cellI.value = item.id_no || '-';
        cellI.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Highlight ONLY if batch number is assigned after complete production
        if (item.has_finished_batch && item.id_no && item.id_no !== '-') {
            cellI.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC6EFCE' } // Soft Green
            };
            cellI.font = { bold: true, size: 8.5, color: { argb: 'FF006100' } };
        } else {
            cellI.font = { size: 9 };
        }

        applyBorderToRange(1, currentRow, 9, currentRow);
        currentRow++;
    });

    // ── Drawing Note / Remarks (Merged A:I) ─────────────────────────────────────
    const drawingNote = customNotes || workOrder.remark;
    if (drawingNote && drawingNote.trim()) {
        const noteRow = sheet.getRow(currentRow);
        noteRow.height = 22;
        sheet.mergeCells(`A${currentRow}:I${currentRow}`);
        const noteCell = sheet.getCell(`A${currentRow}`);
        noteCell.value = drawingNote.trim();
        noteCell.font = { bold: true, size: 8.5, name: 'Segoe UI' };
        noteCell.alignment = { horizontal: 'left', vertical: 'middle' };
        noteCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFBEB' } // Warm Amber tint
        };
        applyBorderToRange(1, currentRow, 9, currentRow);
        currentRow++;
    }

    // ── Special Instructions / Terms and Conditions ────────────────────────────
    if (termsConditions.length > 0) {
        // "Special Instructions, if any:" Header
        const headerRow = sheet.getRow(currentRow);
        headerRow.height = 20;
        sheet.mergeCells(`A${currentRow}:I${currentRow}`);
        const instrHeader = sheet.getCell(`A${currentRow}`);
        instrHeader.value = 'Special Instructions, if any:';
        instrHeader.font = { bold: true, size: 9, name: 'Segoe UI' };
        instrHeader.alignment = { horizontal: 'left', vertical: 'middle' };
        applyBorderToRange(1, currentRow, 9, currentRow);
        currentRow++;

        // Add each condition as a numbered point
        termsConditions.forEach((cond, idx) => {
            const condRow = sheet.getRow(currentRow);
            condRow.height = 22;
            sheet.mergeCells(`A${currentRow}:I${currentRow}`);
            const condCell = sheet.getCell(`A${currentRow}`);
            const startsWithNumber = /^\d+[\.\)]\s*/.test(cond);
            condCell.value = startsWithNumber ? cond : `${idx + 1}. ${cond}`;
            condCell.font = { size: 8.5, name: 'Segoe UI' };
            condCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            applyBorderToRange(1, currentRow, 9, currentRow);
            currentRow++;
        });
    }

    return workbook;
};

/**
 * Fetch all Work Orders structured with nested items and resolved batch numbers for reports
 */
const getAllWorkOrdersForReport = async () => {
    // 1. Fetch work order headers
    const woQuery = `
        SELECT
            wo.id,
            wo.work_order_no,
            wo.work_order_date,
            COALESCE(wo.status, 'Draft') AS status,
            wo.revision_number,
            wo.purchase_order_number,
            wo.purchase_order_date,
            wo.project_name,
            wo.major_capex,
            wo.inspection_id,
            wo.remark,
            wo.created_at,
            c.customer_name,
            c.customer_code,
            insp.name AS inspection_name,
            COALESCE(u.name, 'Unknown') AS added_by_name
        FROM work_orders wo
        LEFT JOIN customer_master c ON wo.customer_id = c.id
        LEFT JOIN inspection_masters insp ON wo.inspection_id = insp.id
        LEFT JOIN users u ON wo.added_by = u.id
        ORDER BY wo.work_order_no DESC, wo.created_at DESC
    `;
    const [workOrders] = await db.execute(woQuery);
    if (workOrders.length === 0) return [];

    // 2. Fetch all items with material info
    const itemsQuery = `
        SELECT
            woi.id AS work_order_item_id,
            woi.work_order_id,
            woi.material_id,
            woi.quantity,
            woi.production_quantity,
            woi.exp_delivery_date,
            woi.batch_no AS item_batch_no,
            woi.remarks,
            woi.sort_order,
            m.material_code,
            m.material_name,
            COALESCE(NULLIF(TRIM(m.details), ''), m.material_name) AS item_description,
            COALESCE(NULLIF(TRIM(m.item), ''), '-') AS item_type,
            COALESCE(NULLIF(TRIM(m.size), ''), '-') AS item_size,
            COALESCE(NULLIF(TRIM(m.class), ''), '-') AS item_class,
            COALESCE(m.material_group, 'PLATE & FORGED FLANGES') AS material_group
        FROM work_order_items woi
        LEFT JOIN materials m ON woi.material_id = m.id
        WHERE COALESCE(woi.production_quantity, 0) > 0
          AND (LOWER(COALESCE(m.material_group, '')) NOT LIKE '%raw%')
          AND (woi.remarks IS NULL OR woi.remarks NOT LIKE 'Allocated raw material%')
        ORDER BY COALESCE(woi.sort_order, woi.id) ASC, woi.id ASC
    `;
    const [allItems] = await db.execute(itemsQuery);

    // 3. Fetch finished production batches ONLY (where to_bom_process_id IS NULL)
    const logsQuery = `
        SELECT
            wpl.work_order_item_id,
            wpl.batch_no,
            SUM(CASE WHEN wpl.movement_type = 'revert' THEN -wpl.quantity ELSE wpl.quantity END) AS finished_qty
        FROM workshop_production_logs wpl
        WHERE wpl.to_bom_process_id IS NULL
          AND wpl.batch_no IS NOT NULL
          AND TRIM(wpl.batch_no) != ''
        GROUP BY wpl.work_order_item_id, wpl.batch_no
        HAVING finished_qty > 0
        ORDER BY wpl.batch_no ASC
    `;
    const [logRows] = await db.execute(logsQuery);
    const batchMap = {};
    for (const row of logRows) {
        if (!batchMap[row.work_order_item_id]) batchMap[row.work_order_item_id] = [];
        batchMap[row.work_order_item_id].push({
            batch_no: row.batch_no,
            qty: Number(row.finished_qty)
        });
    }

    // Group items by work_order_id
    const itemsByWo = {};
    for (const it of allItems) {
        if (!itemsByWo[it.work_order_id]) itemsByWo[it.work_order_id] = [];
        
        const finishedBatches = batchMap[it.work_order_item_id] || [];
        if (finishedBatches.length > 0) {
            it.has_finished_batch = true;
            it.batch_list = finishedBatches;
            if (finishedBatches.length === 1) {
                it.id_no = finishedBatches[0].batch_no;
            } else {
                it.id_no = finishedBatches
                    .map(b => `${b.batch_no}-${b.qty} Nos.`)
                    .join(' / \n');
            }
        } else {
            // ONLY if assigned after complete production
            it.has_finished_batch = false;
            it.batch_list = [];
            it.id_no = '-';
        }
        itemsByWo[it.work_order_id].push(it);
    }

    for (const wo of workOrders) {
        const items = itemsByWo[wo.id] || [];
        items.forEach((it, idx) => { it.sr_no = idx + 1; });
        wo.items = items;
        wo.total_quantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
        wo.item_count = items.length;
    }

    return workOrders;
};

module.exports = {
    getWorkOrderReportDetails,
    generateWorkOrderExcel,
    getAllWorkOrdersForReport
};
