import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getTermsAndConditions } from "../../api/termsAndConditionsApi";
import { downloadWorkOrderExcel } from "../../api/workOrderApi";
import { getOrganizationDetails } from "../../api/organizationApi";
import { downloadWorkOrderPdf } from "../../utils/workOrderPdfService";

export default function TermsSelectModal({
  isOpen,
  onClose,
  workOrder,
  initialFormat = "excel",
}) {
  const [termsList, setTermsList] = useState([]);
  const [selectedTermsId, setSelectedTermsId] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [orgDetails, setOrgDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (isOpen && workOrder) {
      setCustomNotes(workOrder.remark || "");
      loadInitialData();
    }
  }, [isOpen, workOrder]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [termsRes, orgRes] = await Promise.allSettled([
        getTermsAndConditions(),
        getOrganizationDetails(),
      ]);

      if (termsRes.status === "fulfilled") {
        const list = termsRes.value.data?.data || [];
        setTermsList(list);
        if (list.length > 0) {
          setSelectedTermsId(String(list[0].id));
        }
      } else {
        console.error("Failed to load terms list:", termsRes.reason);
      }

      if (orgRes.status === "fulfilled") {
        const orgData = orgRes.value.data?.data || orgRes.value.data;
        setOrgDetails(orgData);
      } else {
        console.error("Failed to load org details:", orgRes.reason);
      }
    } catch (err) {
      console.error("Failed to load terms and conditions", err);
      toast.error("Unable to load initial modal data");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !workOrder) return null;

  const selectedTerms = termsList.find((t) => String(t.id) === String(selectedTermsId));

  const woNum = workOrder.work_order_no
    ? `WO-${String(workOrder.work_order_no).padStart(4, "0")}`
    : `ID #${workOrder.id}`;

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const response = await downloadWorkOrderExcel(
        workOrder.id,
        selectedTermsId ? Number(selectedTermsId) : null,
        customNotes.trim() || null
      );

      // Create download link from blob
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Work_Order_${woNum}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Work Order ${woNum} Excel downloaded!`);
      onClose();
    } catch (err) {
      console.error("Failed to download Work Order Excel:", err);
      toast.error("Failed to generate and download Excel file");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      downloadWorkOrderPdf({
        workOrder,
        termsHtml: selectedTerms?.description || "",
        customNotes: customNotes.trim() || "",
        logoBase64: orgDetails?.logo || null,
        companyName: orgDetails?.name || "SHREEPAD ENGINEERING CO.",
      });

      toast.success(`Work Order ${woNum} PDF downloaded!`);
      onClose();
    } catch (err) {
      console.error("Failed to download Work Order PDF:", err);
      toast.error("Failed to generate and download PDF document");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const isBusy = downloadingExcel || downloadingPdf;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-xs border border-white">
                <i className="fa-solid fa-file-excel"></i>
              </div>
              <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm shadow-xs border border-white">
                <i className="fa-solid fa-file-pdf"></i>
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Export Work Order (Excel / PDF)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {woNum} • {workOrder.customer_name || "Customer"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1.5 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Work Order Info Pill */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Client P.O.:</span>
              <span className="font-medium text-slate-800">
                {workOrder.purchase_order_number || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Project / Capex:</span>
              <span className="font-medium text-slate-800">
                {workOrder.project_name || "—"}
                {workOrder.major_capex ? ` • ${workOrder.major_capex}` : ""}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Total Items:</span>
              <span className="font-bold text-indigo-600">
                {workOrder.items?.length || 0} items ({workOrder.total_quantity || 0} Qty)
              </span>
            </div>
          </div>

          {/* Terms & Conditions Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Terms & Conditions <span className="text-rose-500">*</span>
            </label>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <i className="fa-solid fa-spinner fa-spin"></i> Loading terms & settings...
              </div>
            ) : (
              <select
                value={selectedTermsId}
                onChange={(e) => setSelectedTermsId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              >
                <option value="">— No Terms & Conditions —</option>
                {termsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Live Terms Preview */}
          {selectedTerms && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Preview of Terms ({selectedTerms.name}):
              </label>
              <div
                className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-36 overflow-y-auto leading-relaxed prose prose-sm prose-slate"
                dangerouslySetInnerHTML={{
                  __html: selectedTerms.description || "<i>No text content</i>",
                }}
              />
            </div>
          )}

          {/* Drawing / Dimensions Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Drawing / Special Dimensions Note
            </label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. HANDLE DIMENSION AS PER NEW DRAWING: Advance copy BLIND PLATE_SPACER_TAIL Dimensions..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Modal Footer with Both Excel & PDF Download Buttons */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {/* Download Excel Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
              title="Download corporate Work Order spreadsheet (.xlsx)"
            >
              {downloadingExcel ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Generating Excel...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-excel"></i> Download Excel
                </>
              )}
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
              title="Download corporate Work Order document (.pdf)"
            >
              {downloadingPdf ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Generating PDF...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-pdf"></i> Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
