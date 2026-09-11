import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import {
  getWorkshopEntryDetails,
  saveWorkshopEntry,
} from "../../api/workshopEntryApi";
import toast from "react-hot-toast";

export default function WorkshopEntryDetails() {
  const { pmemoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Data states
  const [entryData, setEntryData] = useState(null);

  // Editable form states
  const [packingMethod, setPackingMethod] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const entryRes = await getWorkshopEntryDetails(pmemoId);

        if (entryRes.data?.success && entryRes.data.data) {
          const data = entryRes.data.data;
          setEntryData(data);
          setPackingMethod(data.packing_method || "");
        } else {
          setError("Workshop entry details not found.");
        }
      } catch (err) {
        console.error("Failed to load workshop entry details", err);
        setError(err.response?.data?.message || "Failed to load workshop entry details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pmemoId]);

  const handleSaveWorkshopDetails = async (e) => {
    e.preventDefault();
    if (!entryData?.pmemo_id) {
      toast.error("Invalid Production Memo");
      return;
    }

    try {
      setSaving(true);
      await saveWorkshopEntry({
        pmemo_id: entryData.pmemo_id,
        packing_method: packingMethod.trim(),
      });

      toast.success("Workshop details updated successfully!");
      const updatedRes = await getWorkshopEntryDetails(pmemoId);
      if (updatedRes.data?.success && updatedRes.data.data) {
        setEntryData(updatedRes.data.data);
      }
    } catch (err) {
      console.error("Failed to save workshop entry", err);
      toast.error(err.response?.data?.message || "Failed to save workshop entry");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen">
        <Navbar title="ERP Admin" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#369ACF] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium text-sm">Loading Workshop Entry Details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !entryData) {
    return (
      <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen">
        <Navbar title="ERP Admin" />
        <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-xl flex items-center justify-between">
            <span>{error || "Failed to load details"}</span>
            <button
              onClick={() => navigate("/production/workshop-entry")}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition cursor-pointer"
            >
              Back to Workshop Entries
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Calculated values
  const productDisplayName = [entryData.material_name, entryData.material_code].filter(Boolean).join(" - ") || "—";
  const pMemoFormattedNo = entryData.p_memo_no != null ? String(entryData.p_memo_no) : "—";
  const workOrderFormattedNo = entryData.work_order_no != null ? String(entryData.work_order_no) : "—";
  const productWeightFromBom = entryData.unit_weight != null && entryData.unit_weight !== "" ? `${Number(entryData.unit_weight).toFixed(4)} kg` : "—";
  const prodQtyNumber = Number(entryData.production_quantity) || 0;
  const prodQty = entryData.production_quantity != null ? prodQtyNumber.toFixed(2) : "0.00";

  const rawMaterials = entryData.rawMaterials || [];
  const processes = entryData.processes || [];

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen pb-16">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Link */}
        <div className="mb-1">
          <Link
            to="/production/workshop-entry"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Workshop Entries</span>
          </Link>
        </div>

        {/* Page Title */}
        <div className="text-center my-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Workshop Entry
          </h1>
        </div>

        {/* Unified Card */}
        <form onSubmit={handleSaveWorkshopDetails}>
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* Top Specifications Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              
              {/* Row 1: Left - Product */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Product
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center">
                  <span className="truncate" title={productDisplayName}>{productDisplayName}</span>
                </div>
              </div>

              {/* Row 1: Right - P.Memo No. */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  P.Memo No.
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center">
                  <span>{pMemoFormattedNo}</span>
                </div>
              </div>

              {/* Row 2: Left - Work Order No: */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Work Order No:
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center">
                  <span>{workOrderFormattedNo}</span>
                </div>
              </div>

              {/* Row 2: Right - Product weight(from bom) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Product weight(from bom)
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center justify-between">
                  <span>{productWeightFromBom}</span>
                  <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    BOM Spec
                  </span>
                </div>
              </div>

              {/* Row 3: Left - Production Qty.: */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Production Qty.:
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center">
                  <span>{prodQty}</span>
                </div>
              </div>

              {/* Row 3: Right - Packing Method */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Packing Method.
                </label>
                <input
                  type="text"
                  value={packingMethod}
                  onChange={(e) => setPackingMethod(e.target.value)}
                  placeholder="Enter packing method..."
                  className="flex-1 bg-[#f8fafc] border border-slate-200/80 focus:border-indigo-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] outline-none transition"
                />
              </div>

            </div>

            {/* Divider */}
            <hr className="border-slate-200/80 my-4" />

            {/* Raw Materials and Processes Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Raw Materials Section */}
              <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-4 sm:p-5 flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-boxes-stacked text-[#369ACF] text-sm"></i>
                    <h2 className="text-sm font-bold text-slate-800">Raw Materials (BOM Formulation)</h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {rawMaterials.length} {rawMaterials.length === 1 ? "Item" : "Items"}
                  </span>
                </div>

                {rawMaterials.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-slate-400">
                    <i className="fa-solid fa-box-open text-2xl mb-1.5 text-slate-300"></i>
                    <p className="text-xs font-medium">No BOM raw materials configured for this product.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse bg-white rounded-lg overflow-hidden border border-slate-200/80">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">Material Name</th>
                          <th className="py-2 px-2.5 text-right">BOM Qty</th>
                          <th className="py-2 px-2.5 text-right">Total Req.</th>
                          <th className="py-2 px-2.5 text-center">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {rawMaterials.map((rm, idx) => {
                          const bomQty = Number(rm.bom_quantity) || 0;
                          const totalReqQty = bomQty * prodQtyNumber;
                          return (
                            <tr key={rm.id || idx} className="hover:bg-slate-50/50 transition">
                              <td className="py-2.5 px-2.5 font-semibold text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                                <div>{rm.material_name}</div>
                                {rm.material_code && (
                                  <span className="font-mono text-[10px] text-slate-400">{rm.material_code}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-medium text-slate-700">
                                {bomQty.toFixed(4)}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">
                                {totalReqQty.toFixed(3)}
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-medium text-slate-500">
                                {rm.unit_name || "kg"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Processes List Section */}
              <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-4 sm:p-5 flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-gears text-indigo-600 text-sm"></i>
                    <h2 className="text-sm font-bold text-slate-800">Processes List</h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {processes.length} {processes.length === 1 ? "Step" : "Steps"}
                  </span>
                </div>

                {processes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-slate-400">
                    <i className="fa-solid fa-clock-rotate-left text-2xl mb-1.5 text-slate-300"></i>
                    <p className="text-xs font-medium">No BOM processes configured for this product.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse bg-white rounded-lg overflow-hidden border border-slate-200/80">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">Process Name</th>
                          <th className="py-2 px-2.5 text-right">Cycle Time</th>
                          <th className="py-2 px-2.5 text-center">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {processes.map((proc, idx) => (
                          <tr key={proc.id || idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-2.5 font-semibold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                              {proc.process_name || "—"}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">
                              {proc.time != null ? Number(proc.time).toFixed(2) : "—"}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-medium text-slate-500">
                              {proc.unit_name || "Sec"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Form Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/production/workshop-entry")}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk text-xs"></i>
                    <span>Update Workshop Entry</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
