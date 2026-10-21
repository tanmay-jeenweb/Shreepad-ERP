import React, { useState } from "react";
import toast from "react-hot-toast";
import { holdWorkOrder } from "../../../api/workOrderApi";

export default function HoldWorkOrderModal({ row, isOpen, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !row) return null;

  const woNumber = `WO-${String(row.work_order_no).padStart(4, '0')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!row.work_order_id) return;

    setLoading(true);
    try {
      await holdWorkOrder(row.work_order_id, {
        hold_reason: reason.trim() || "Work Order put on hold"
      });
      toast.success(`Work Order ${woNumber} put on hold successfully. Floor production paused; dispatches remain enabled.`);
      setReason("");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to put work order on hold:", err);
      toast.error(err?.response?.data?.message || "Failed to put work order on hold");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 border border-amber-200 text-amber-600">
              <i className="fa-solid fa-pause text-lg"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Put Work Order {woNumber} on Hold
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Temporarily pause manufacturing activities on the workshop floor while allowing finished goods dispatch.
              </p>
            </div>
          </div>

          {/* Quick info summary */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1.5 mb-4">
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-400">Product / Material:</span>
              <span className="font-semibold text-slate-800 text-right">{row.material_name || "—"}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-400">Customer:</span>
              <span className="font-semibold text-slate-800 text-right">{row.customer_name || "—"}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-400">Production Status:</span>
              <span className="font-semibold text-slate-800 text-right">
                {row.produced_quantity || 0} / {row.production_quantity || row.wo_quantity || 0} Produced
              </span>
            </div>
          </div>

          {/* Rules alert notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 mb-4">
            <i className="fa-solid fa-circle-info text-amber-600 mt-0.5 shrink-0 text-sm"></i>
            <div className="space-y-1">
              <div className="font-bold text-amber-950">While On Hold:</div>
              <ul className="list-disc list-inside text-amber-800 space-y-0.5">
                <li>Zero production allowed (RM issue & stage movements paused)</li>
                <li><strong>Finished goods dispatch remains fully enabled</strong></li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Hold Reason <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g., Customer requested delivery pause, material quality verification, engineering review..."
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Putting on Hold...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-pause text-xs"></i>
                    <span>Confirm Hold</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
