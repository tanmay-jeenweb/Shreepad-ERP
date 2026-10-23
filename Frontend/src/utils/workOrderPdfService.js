import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Format date value into DD-MM-YYYY
 */
export const formatDate = (dateVal) => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "—";
  }
};

/**
 * Parse HTML content (such as from rich text / React Quill) into an array of clean plain-text strings
 */
export const parseHtmlToCleanLines = (htmlContent) => {
  if (!htmlContent) return [];

  // Check if it contains <li> tags
  if (/<li[^>]*>/i.test(htmlContent)) {
    const listItems = [];
    const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;
    while ((match = regex.exec(htmlContent)) !== null) {
      const itemText = match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
      if (itemText) listItems.push(itemText);
    }
    return listItems;
  }

  // Otherwise, split by <p> or <br> or newlines
  const text = htmlContent
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
};

/**
 * Generate and download a Work Order PDF matching corporate layout
 * @param {Object} options
 * @param {Object} options.workOrder - Full work order object with items
 * @param {string} [options.termsHtml] - Selected Terms and Conditions HTML/text
 * @param {string} [options.customNotes] - Drawing notes or custom remarks
 * @param {string} [options.logoBase64] - Base64 encoded logo string (optional)
 * @param {string} [options.companyName] - Company name fallback (optional)
 * @returns {jsPDF} doc
 */
export const generateWorkOrderPdf = ({
  workOrder,
  termsHtml = "",
  customNotes = "",
  logoBase64 = null,
  companyName = "SHREEPAD ENGINEERING CO.",
}) => {
  if (!workOrder) {
    throw new Error("Work order data is required to generate PDF.");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const woNum = workOrder.work_order_no
    ? `WO-${String(workOrder.work_order_no).padStart(4, "0")}`
    : `ID #${workOrder.id}`;

  const items = workOrder.items || [];
  const totalQty = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );
  const firstDeliveryDate = items.find((it) => it.exp_delivery_date)?.exp_delivery_date;
  const materialGroup = items[0]?.material_group || "PLATE & FORGED FLANGES";

  // 1. Header Logo or Fallback Typography
  let startHeaderY = 8;
  if (logoBase64 && typeof logoBase64 === "string" && logoBase64.startsWith("data:image")) {
    try {
      const isJpeg = logoBase64.startsWith("data:image/jpeg") || logoBase64.startsWith("data:image/jpg");
      const imgType = isJpeg ? "JPEG" : "PNG";
      // Center logo: 84mm width, 10mm height
      const logoWidth = 84;
      const logoHeight = 10;
      const logoX = (210 - logoWidth) / 2;
      doc.addImage(logoBase64, imgType, logoX, startHeaderY, logoWidth, logoHeight);
      startHeaderY += 12;
    } catch (imgErr) {
      console.warn("Could not render logo in PDF, using text fallback:", imgErr);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(companyName, 105, startHeaderY + 6, { align: "center" });
      startHeaderY += 10;
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(companyName, 105, startHeaderY + 6, { align: "center" });
    startHeaderY += 10;
  }

  // 2. WORK ORDER Title Banner
  doc.setFillColor(241, 245, 249); // #F1F5F9
  doc.setDrawColor(203, 213, 225); // #CBD5E1
  doc.setLineWidth(0.3);
  doc.rect(10, startHeaderY, 190, 7.5, "FD");

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("WORK ORDER", 105, startHeaderY + 5.2, { align: "center" });

  let currentY = startHeaderY + 8.5;

  // 3. Two-Column Metadata Table (matching Excel Rows 3-8)
  const metaBody = [
    // Row 1: Rev No.
    [
      { content: "Rev No.", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      {
        content:
          workOrder.revision_number !== null && workOrder.revision_number !== undefined
            ? String(workOrder.revision_number)
            : "0",
        colSpan: 3,
      },
    ],
    // Row 2: W.O. No. & Dated
    [
      { content: "W.O. No.", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: woNum, styles: { fontStyle: "bold" } },
      { content: "Dated :", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: formatDate(workOrder.work_order_date) },
    ],
    // Row 3: CLIENT
    [
      { content: "CLIENT", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: workOrder.customer_name || "—", colSpan: 3, styles: { fontStyle: "bold" } },
    ],
    // Row 4: Client P.O. & Dated
    [
      { content: "Client P.O.", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: workOrder.purchase_order_number || "—" },
      { content: "Dated :", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: formatDate(workOrder.purchase_order_date) },
    ],
    // Row 5: PROJECT & MAJOR CAPEX
    [
      { content: "PROJECT", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: workOrder.project_name || "—" },
      { content: "MAJOR CAPEX", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: workOrder.major_capex || "—", styles: { fontStyle: "bold" } },
    ],
    // Row 6: INSPECTION
    [
      { content: "INSPECTION", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: workOrder.inspection_name || "—", colSpan: 3 },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 1.5,
      lineColor: [176, 176, 176],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 69 },
      2: { cellWidth: 26 },
      3: { cellWidth: 69 },
    },
    body: metaBody,
  });

  currentY = doc.lastAutoTable.finalY;

  // 4. Group Summary Row (matching Excel Rows 9-10)
  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 1.6,
      lineColor: [176, 176, 176],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    head: [
      [
        {
          content: "Sr. No.",
          styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 10 },
        },
        {
          content: "Item Description",
          styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 138 },
        },
        {
          content: "Quantity",
          styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 16 },
        },
        {
          content: "Delivery Date",
          styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 26 },
        },
      ],
    ],
    body: [
      [
        { content: "", styles: { halign: "center" } },
        { content: materialGroup.toUpperCase(), styles: { halign: "center", fontStyle: "bold" } },
        { content: String(totalQty), styles: { halign: "center", fontStyle: "bold" } },
        { content: formatDate(firstDeliveryDate), styles: { halign: "center" } },
      ],
    ],
  });

  currentY = doc.lastAutoTable.finalY;

  // 5. Items Table (matching Excel Rows 11+)
  const itemsHead = [
    [
      { content: "Sr. No", styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: "Mat Code", styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: "Item Description", styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: "Item", styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: "Size", styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: "Class", styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: "Material", styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252] } },
      { content: "Qty", styles: { halign: "center", fontStyle: "bold", fillColor: [248, 250, 252] } },
      {
        content: "ID No.",
        styles: {
          halign: "center",
          fontStyle: "bold",
          fillColor: [255, 255, 0], // Bright Yellow matching corporate Excel
          textColor: [0, 0, 0],
        },
      },
    ],
  ];

  const itemsBody = items.map((it, idx) => {
    let idNoCell = {
      content: it.id_no || "—",
      styles: { halign: "center" },
    };

    // Highlight ONLY if batch number is assigned after complete production
    if (it.has_finished_batch && it.id_no && it.id_no !== "—" && it.id_no !== "-") {
      idNoCell.styles = {
        halign: "center",
        fontStyle: "bold",
        fillColor: [198, 239, 206], // Soft Green (#C6EFCE)
        textColor: [0, 97, 0],       // Dark Green (#006100)
      };
    }

    return [
      { content: String(idx + 1), styles: { halign: "center" } },
      { content: it.material_code || "—", styles: { halign: "center", fontStyle: "bold" } },
      { content: it.item_description || "—", styles: { halign: "left" } },
      { content: it.item_type || "—", styles: { halign: "center" } },
      { content: it.item_size || "—", styles: { halign: "center" } },
      { content: it.item_class || "—", styles: { halign: "center" } },
      { content: it.material_name || "—", styles: { halign: "center" } },
      { content: String(it.quantity || 0), styles: { halign: "center", fontStyle: "bold" } },
      idNoCell,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 1.5,
      lineColor: [176, 176, 176],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 10 }, // Sr. No
      1: { cellWidth: 22 }, // Mat Code
      2: { cellWidth: 48 }, // Item Description
      3: { cellWidth: 14 }, // Item
      4: { cellWidth: 14 }, // Size
      5: { cellWidth: 14 }, // Class
      6: { cellWidth: 24 }, // Material
      7: { cellWidth: 16 }, // Qty
      8: { cellWidth: 28 }, // ID No.
    },
    head: itemsHead,
    body: itemsBody,
  });

  currentY = doc.lastAutoTable.finalY;

  // 6. Drawing Note / Remarks (Merged full-width callout)
  const drawingNote = customNotes || workOrder.remark;
  if (drawingNote && drawingNote.trim()) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 7.2,
        cellPadding: 1.8,
        lineColor: [176, 176, 176],
        lineWidth: 0.2,
      },
      body: [
        [
          {
            content: drawingNote.trim(),
            styles: {
              fontStyle: "bold",
              fillColor: [255, 251, 235], // Warm Amber tint (#FFFBEB)
              textColor: [146, 64, 14],   // Warm Amber text (#92400E)
              halign: "left",
            },
          },
        ],
      ],
    });
    currentY = doc.lastAutoTable.finalY;
  }

  // 7. Special Instructions / Terms and Conditions
  const cleanTerms = parseHtmlToCleanLines(termsHtml);
  if (cleanTerms.length > 0) {
    const termsRows = [
      [
        {
          content: "Special Instructions, if any:",
          styles: {
            fontStyle: "bold",
            fillColor: [248, 250, 252],
            textColor: [30, 41, 59],
            fontSize: 7.8,
          },
        },
      ],
      ...cleanTerms.map((cond, idx) => {
        const startsWithNum = /^\d+[\.\)]\s*/.test(cond);
        const text = startsWithNum ? cond : `${idx + 1}. ${cond}`;
        return [
          {
            content: text,
            styles: {
              fontSize: 7.2,
              textColor: [51, 65, 85],
              halign: "left",
              fillColor: [255, 255, 255],
            },
          },
        ];
      }),
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      theme: "grid",
      styles: {
        font: "helvetica",
        cellPadding: 1.6,
        lineColor: [176, 176, 176],
        lineWidth: 0.2,
      },
      body: termsRows,
    });
  }

  // 8. Footer (Page numbers and timestamp across all pages)
  const totalPages = doc.internal.getNumberOfPages();
  const currentDateStr = formatDate(new Date());

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Work Order Report • Generated on ${currentDateStr} via Shreepad ERP`,
      10,
      292,
      { align: "left" }
    );
    doc.text(`Page ${p} of ${totalPages}`, 200, 292, { align: "right" });
  }

  return doc;
};

/**
 * Convenience helper to download the Work Order PDF directly in browser
 */
export const downloadWorkOrderPdf = (options) => {
  const doc = generateWorkOrderPdf(options);
  const woNum = options.workOrder.work_order_no
    ? `WO-${String(options.workOrder.work_order_no).padStart(4, "0")}`
    : `ID_${options.workOrder.id}`;
  doc.save(`Work_Order_${woNum}.pdf`);
  return doc;
};
