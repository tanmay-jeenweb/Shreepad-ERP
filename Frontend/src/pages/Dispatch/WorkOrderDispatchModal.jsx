import React, { useState, useEffect } from "react";
import DateInput from "../../components/DateInput";
import toast from "react-hot-toast";
import { createWorkOrderDispatch } from "../../api/dispatchApi";

export default function WorkOrderDispatchModal({ item, isOpen, onClose, onSuccess }) {
  const [selectedBatch, setSelectedBatch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [partyName, setPartyName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter batches with available quantity > 0
  const validBatches = React.useMemo(() => {
    if (!item?.available_batches) return [];
    return item.available_batches.filter(b => parseFloat(b.available_quantity) > 0);
  }, [item]);

  // Determine current active batch and its available quantity
  const activeBatchObj = React.useMemo(() => {
    if (validBatches.length === 0) return null;
    return validBatches.find(b => b.batch_no === selectedBatch) || validBatches[0];
  }, [validBatches, selectedBatch]);

  useEffect(() => {
    if (item) {
      setPartyName(item.customer_name || "");
      setDispatchDate(new Date().toISOString().split("T")[0]);
      setVehicleNo("");
      setRemarks("");

      const initialBatch = validBatches.length > 0 ? validBatches[0].batch_no : (item.batch_no || "");
      setSelectedBatch(initialBatch);

      const maxAvailable = validBatches.length > 0
        ? parseFloat(validBatches[0].available_quantity)
        : parseFloat(item.available_to_dispatch || 0);

      setQuantity(maxAvailable > 0 ? String(maxAvailable) : "");
    }
  }, [item, validBatches]);

  const handleBatchChange = (batchNo) => {
    setSelectedBatch(batchNo);
    const found = validBatches.find(b => b.batch_no === batchNo);
    const max = found ? parseFloat(found.available_quantity) : parseFloat(item?.available_to_dispatch || 0);
    setQuantity(max > 0 ? String(max) : "");
  };

  if (!isOpen || !item) return null;

  const currentAvailableQty = activeBatchObj
    ? parseFloat(activeBatchObj.available_quantity)
    : parseFloat(item.available_to_dispatch || 0);

  const enteredQty = parseFloat(quantity || 0);
  const remainingAfter = Math.max(0, currentAvailableQty - (isNaN(enteredQty) ? 0 : enteredQty));
  const isOverQty = enteredQty > currentAvailableQty || isNaN(enteredQty) || enteredQty <= 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isNaN(enteredQty) || enteredQty <= 0) {
      toast.error("Please enter a valid dispatch quantity greater than 0.");
      return;
    }

    if (enteredQty > currentAvailableQty) {
      toast.error(`Cannot dispatch ${enteredQty}! Only ${currentAvailableQty} ${item.unit} available in batch ${selectedBatch}.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        work_order_item_id: item.work_order_item_id,
        quantity: enteredQty,
        dispatch_date: dispatchDate,
        party_name: partyName.trim() || null,
        vehicle_no: vehicleNo.trim() || null,
        remarks: remarks.trim() || null,
        internal_batch_number: selectedBatch || null
      };

      const res = await createWorkOrderDispatch(payload);
      toast.success(res.data?.message || "Finished goods dispatched successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Work order dispatch error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to dispatch finished goods";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const labelCls = "block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1";
  const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-xs sm:text-sm bg-white transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        
        {/* Compact Header */}
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#369ACF]/10 text-[#369ACF]">
              <i className="fa-solid fa-truck-fast text-sm"></i>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Dispatch Finished Goods</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                  WO-{String(item.work_order_no).padStart(4, "0")}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Compact Product & Batch Summary Card */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Finished Product</span>
              <span className="font-bold text-slate-900 text-sm truncate block">{item.material_name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs">
              <span className="text-slate-500 font-medium">Target: <strong className="text-slate-800">{parseFloat(item.target_quantity)}</strong></span>
              <span className="text-slate-300">|</span>
              <span className="text-blue-600 font-medium">Produced: <strong className="text-blue-700">{parseFloat(item.completed_quantity)}</strong></span>
            </div>
          </div>

          {/* Batch Selector / Indicator */}
          {validBatches.length > 1 ? (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-layer-group text-[#369ACF]"></i>
                  Select Finished Batch to Dispatch <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Batch Available: {currentAvailableQty} {item.unit}
                </span>
              </div>
              <select
                value={selectedBatch}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#369ACF]/40 rounded-xl text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-slate-800 shadow-2xs"
              >
                {validBatches.map(b => (
                  <option key={b.batch_no} value={b.batch_no}>
                    Batch: {b.batch_no} — {b.available_quantity} {item.unit} Available (Produced: {b.completed_quantity})
                  </option>
                ))}
              </select>
            </div>
          ) : validBatches.length === 1 ? (
            <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Finished Batch:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {validBatches[0].batch_no}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Available: {validBatches[0].available_quantity} {item.unit}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-1">
              Batch: <span className="font-mono font-bold">{item.batch_no || "—"}</span>
            </div>
          )}
        </div>

        {/* Compact Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Quantity & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-0.5">
              <label className={labelCls}>
                Dispatch Quantity <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max={currentAvailableQty}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={`Max ${currentAvailableQty}`}
                  className={`${inputCls} font-bold text-slate-900 pr-12 ${
                    enteredQty > currentAvailableQty ? "border-rose-400 focus:ring-rose-200" : ""
                  }`}
                  required
                  autoFocus
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                  {item.unit}
                </span>
              </div>
              {quantity && (
                <p className={`text-[11px] mt-1 font-medium flex items-center gap-1 ${
                  enteredQty > currentAvailableQty ? "text-rose-600 font-bold" : "text-slate-500"
                }`}>
                  <i className={`fa-solid ${enteredQty > currentAvailableQty ? "fa-circle-xmark" : "fa-circle-check text-emerald-600"} text-[10px]`}></i>
                  {enteredQty > currentAvailableQty
                    ? `Cannot exceed ${currentAvailableQty} ${item.unit}!`
                    : `Remaining in batch: ${remainingAfter.toFixed(2)} ${item.unit}`}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <label className={labelCls}>
                Dispatch Date <span className="text-rose-500">*</span>
              </label>
              <DateInput
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Party & Vehicle Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-0.5">
              <label className={labelCls}>Customer / Party</label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="Customer or recipient name"
                className={inputCls}
              />
            </div>
            <div className="space-y-0.5">
              <label className={labelCls}>Vehicle No. / Transporter</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="e.g. MH-12-AB-1234"
                className={inputCls}
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-0.5">
            <label className={labelCls}>Remarks / Dispatch Notes</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any delivery instructions or notes (optional)..."
              className={inputCls}
            />
          </div>

          {/* Compact Actions Footer */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isOverQty || currentAvailableQty <= 0}
              className="bg-[#369ACF] hover:bg-[#2884b2] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              <i className={`fa-solid ${submitting ? "fa-spinner fa-spin" : "fa-check"}`}></i>
              {submitting ? "Processing..." : "Confirm & Dispatch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
