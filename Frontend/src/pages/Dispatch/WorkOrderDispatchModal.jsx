import React, { useState, useEffect, useMemo } from "react";
import DateInput from "../../components/DateInput";
import toast from "react-hot-toast";
import { createWorkOrderDispatch } from "../../api/dispatchApi";
import { getAllCustomers } from "../../api/customerApi";

export default function WorkOrderDispatchModal({ item, isOpen, onClose, onSuccess }) {
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [partyName, setPartyName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split("T")[0]);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [allocations, setAllocations] = useState({});

  // Excess Dispatch States
  const [dispatchExcess, setDispatchExcess] = useState(false);
  const [excessAllocations, setExcessAllocations] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [dismissFulfillmentNotice, setDismissFulfillmentNotice] = useState(false);
  const [dismissStockWarning, setDismissStockWarning] = useState(false);

  // Extract core metric values safely
  const orderQty = useMemo(() => {
    return parseFloat(item?.order_quantity ?? item?.target_quantity ?? 0);
  }, [item]);

  const prodQty = useMemo(() => {
    return parseFloat(item?.production_quantity ?? 0);
  }, [item]);

  const completedQty = useMemo(() => {
    return parseFloat(item?.completed_quantity ?? 0);
  }, [item]);

  const dispatchedQty = useMemo(() => {
    return parseFloat(item?.dispatched_quantity ?? 0);
  }, [item]);

  const orderDispatchedQty = useMemo(() => {
    return parseFloat(item?.order_dispatched_quantity ?? item?.dispatched_quantity ?? 0);
  }, [item]);

  const alreadyExcessQty = useMemo(() => {
    return parseFloat(item?.excess_dispatched_quantity ?? 0);
  }, [item]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, orderQty - orderDispatchedQty);
  }, [orderQty, orderDispatchedQty]);

  // Filter batches with available stock > 0
  const validBatches = useMemo(() => {
    if (!item?.available_batches) return [];
    return item.available_batches.filter(b => parseFloat(b.available_quantity) > 0);
  }, [item]);

  const totalAvailableStock = useMemo(() => {
    return validBatches.reduce((sum, b) => sum + parseFloat(b.available_quantity || 0), 0);
  }, [validBatches]);

  // Load customers for dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const res = await getAllCustomers();
        setCustomers(res.data?.data || []);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, []);

  // Reset & initialize allocations when modal opens or item changes
  useEffect(() => {
    if (item && isOpen) {
      setPartyName(item.customer_name || "");
      setDispatchDate(new Date().toISOString().split("T")[0]);
      setChallanNo("");
      setChallanDate(new Date().toISOString().split("T")[0]);
      setVehicleNo("");
      setRemarks("");
      setDismissFulfillmentNotice(false);
      setDismissStockWarning(false);
      setDispatchExcess(false);
      setExcessAllocations({});

      // Smart auto-allocation for regular order fulfillment:
      // Fill from WO production batches first, then warehouse stock batches, capped at remainingBalance
      const initialAllocations = {};
      let pendingToAllocate = remainingBalance;

      for (const b of validBatches) {
        const avail = parseFloat(b.available_quantity || 0);
        if (pendingToAllocate > 0 && avail > 0) {
          const allocateThis = Math.min(avail, pendingToAllocate);
          initialAllocations[b.batch_no] = allocateThis > 0 ? String(allocateThis) : "";
          pendingToAllocate -= allocateThis;
        } else {
          initialAllocations[b.batch_no] = "";
        }
      }

      setAllocations(initialAllocations);
    }
  }, [item, isOpen, validBatches, remainingBalance]);

  // Handle single batch allocation change for regular order fulfillment
  const handleAllocationChange = (batchNo, val) => {
    setAllocations(prev => ({
      ...prev,
      [batchNo]: val
    }));
  };

  // Quick fill maximum possible for a specific batch (order fulfillment)
  const handleMaxBatch = (batchNo) => {
    const batch = validBatches.find(b => b.batch_no === batchNo);
    if (!batch) return;
    const avail = parseFloat(batch.available_quantity || 0);

    // Calculate how much is allocated across other regular batches
    const otherTotal = Object.entries(allocations).reduce((sum, [bNo, q]) => {
      if (bNo === batchNo) return sum;
      const num = parseFloat(q || 0);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

    const needed = Math.max(0, remainingBalance - otherTotal);
    const fillQty = Math.min(avail, needed > 0 ? needed : avail);

    setAllocations(prev => ({
      ...prev,
      [batchNo]: fillQty > 0 ? String(fillQty) : ""
    }));
  };

  // Auto-allocate all available batches up to remaining balance
  const handleAutoAllocate = () => {
    const nextAllocations = {};
    let pending = remainingBalance;

    for (const b of validBatches) {
      const avail = parseFloat(b.available_quantity || 0);
      if (pending > 0 && avail > 0) {
        const alloc = Math.min(avail, pending);
        nextAllocations[b.batch_no] = String(alloc);
        pending -= alloc;
      } else {
        nextAllocations[b.batch_no] = "";
      }
    }

    setAllocations(nextAllocations);
    toast.success("Allocated available batches up to order balance!");
  };

  // Clear all regular batch allocations
  const handleClearAllocations = () => {
    const cleared = {};
    for (const b of validBatches) {
      cleared[b.batch_no] = "";
    }
    setAllocations(cleared);
  };

  // Handle excess batch allocation change
  const handleExcessAllocationChange = (batchNo, val) => {
    setExcessAllocations(prev => ({
      ...prev,
      [batchNo]: val
    }));
  };

  // Quick fill maximum unallocated available stock for a batch in the excess section
  const handleMaxExcessBatch = (batchNo) => {
    const batch = validBatches.find(b => b.batch_no === batchNo);
    if (!batch) return;
    const avail = parseFloat(batch.available_quantity || 0);
    const orderAlloc = parseFloat(allocations[batchNo] || 0) || 0;
    const remainingForExcess = Math.max(0, avail - orderAlloc);

    setExcessAllocations(prev => ({
      ...prev,
      [batchNo]: remainingForExcess > 0 ? String(remainingForExcess) : ""
    }));
  };

  // Clear all excess allocations
  const handleClearExcessAllocations = () => {
    const cleared = {};
    for (const b of validBatches) {
      cleared[b.batch_no] = "";
    }
    setExcessAllocations(cleared);
  };

  // Compute total selected for standard order fulfillment
  const orderSelectedQty = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => {
      const num = parseFloat(val || 0);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [allocations]);

  // Compute total selected for excess buffer
  const excessSelectedQty = useMemo(() => {
    if (!dispatchExcess) return 0;
    return Object.values(excessAllocations).reduce((sum, val) => {
      const num = parseFloat(val || 0);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [dispatchExcess, excessAllocations]);

  // Total physical quantity to dispatch
  const totalSelectedQty = useMemo(() => {
    return orderSelectedQty + excessSelectedQty;
  }, [orderSelectedQty, excessSelectedQty]);

  const balanceAfterDispatch = Math.max(0, remainingBalance - orderSelectedQty);
  const isOrderOverRemaining = orderSelectedQty > remainingBalance;

  // Check if any individual batch exceeds its available limit when summing order + excess allocation
  const batchStockExceededMap = useMemo(() => {
    const map = {};
    for (const b of validBatches) {
      const orderVal = parseFloat(allocations[b.batch_no] || 0) || 0;
      const excessVal = dispatchExcess ? (parseFloat(excessAllocations[b.batch_no] || 0) || 0) : 0;
      const totalBatchAlloc = orderVal + excessVal;
      const avail = parseFloat(b.available_quantity || 0);
      if (totalBatchAlloc > avail) {
        map[b.batch_no] = {
          totalAlloc: totalBatchAlloc,
          available: avail,
          excessOver: totalBatchAlloc - avail
        };
      }
    }
    return map;
  }, [allocations, excessAllocations, dispatchExcess, validBatches]);

  const hasExceededBatch = Object.keys(batchStockExceededMap).length > 0;

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (totalSelectedQty <= 0) {
      toast.error("Please enter a dispatch quantity for at least one batch.");
      return;
    }

    if (hasExceededBatch) {
      const firstExceeded = Object.entries(batchStockExceededMap)[0];
      toast.error(`Batch '${firstExceeded[0]}' total allocation (${firstExceeded[1].totalAlloc}) exceeds available stock (${firstExceeded[1].available} ${item.unit}).`);
      return;
    }

    if (isOrderOverRemaining) {
      toast.error(`Order fulfillment (${orderSelectedQty} ${item.unit}) exceeds remaining order balance (${remainingBalance} ${item.unit}). To dispatch extra units, use the 'Dispatch Excess' section.`);
      return;
    }

    if (dispatchExcess && excessSelectedQty <= 0 && orderSelectedQty <= 0) {
      toast.error("Please enter excess quantity or disable the excess toggle.");
      return;
    }

    // Build standard batch payload
    const batchesPayload = [];
    for (const b of validBatches) {
      const qtyVal = parseFloat(allocations[b.batch_no] || 0);
      if (!isNaN(qtyVal) && qtyVal > 0) {
        batchesPayload.push({
          internal_batch_number: b.batch_no,
          quantity: qtyVal,
          stock_status_id: b.stock_status_id || null,
          is_excess: false
        });
      }
    }

    // Build excess batch payload
    const excessBatchesPayload = [];
    if (dispatchExcess) {
      for (const b of validBatches) {
        const excessVal = parseFloat(excessAllocations[b.batch_no] || 0);
        if (!isNaN(excessVal) && excessVal > 0) {
          excessBatchesPayload.push({
            internal_batch_number: b.batch_no,
            quantity: excessVal,
            stock_status_id: b.stock_status_id || null,
            is_excess: true,
            excess_quantity: excessVal
          });
        }
      }
    }

    if (batchesPayload.length === 0 && excessBatchesPayload.length === 0) {
      toast.error("No valid batches selected for dispatch.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        work_order_item_id: item.work_order_item_id,
        quantity: totalSelectedQty,
        batches: batchesPayload,
        excess_batches: excessBatchesPayload,
        dispatch_excess: dispatchExcess,
        dispatch_date: dispatchDate,
        party_name: partyName.trim() || null,
        vehicle_no: vehicleNo.trim() || null,
        remarks: remarks.trim() || null,
        challan_no: challanNo.trim() || null,
        challan_date: challanDate || null
      };

      const res = await createWorkOrderDispatch(payload);
      toast.success(res.data?.message || `Finished goods (${totalSelectedQty} ${item.unit}) dispatched successfully!`);
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

  const productionDifference = Math.max(0, orderQty - completedQty);
  const woBatchesCount = validBatches.filter(b => b.source_type === "wo_production").length;
  const stockBatchesCount = validBatches.filter(b => b.source_type !== "wo_production").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/90 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#369ACF]/10 text-[#369ACF] border border-[#369ACF]/20">
              <i className="fa-solid fa-truck-fast text-base"></i>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Dispatch Finished Goods</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                  WO-{String(item.work_order_no).padStart(4, "0")}
                </span>
                {alreadyExcessQty > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <i className="fa-solid fa-boxes-packing text-[9px]"></i>
                    Prev Excess: {alreadyExcessQty} {item.unit}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.material_name} {item.material_code ? `(${item.material_code})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        {/* 5-Metric Order & Production Dashboard */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/30 border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            
            {/* 1. Order Qty */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Order Qty</span>
              <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                {orderQty % 1 === 0 ? orderQty : orderQty.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block font-medium">{item.unit}</span>
            </div>

            {/* 2. Planned Production */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Planned Prod</span>
              <span className="font-extrabold text-indigo-700 text-sm sm:text-base">
                {prodQty % 1 === 0 ? prodQty : prodQty.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block font-medium">{item.unit}</span>
            </div>

            {/* 3. Produced from WO */}
            <div className="bg-white p-2.5 rounded-xl border border-blue-200/80 shadow-2xs">
              <span className="text-[10px] text-blue-600 uppercase tracking-wider font-bold block">Produced (WO)</span>
              <span className="font-extrabold text-blue-700 text-sm sm:text-base">
                {completedQty % 1 === 0 ? completedQty : completedQty.toFixed(2)}
              </span>
              <span className="text-[10px] text-blue-500 block font-medium">{item.unit}</span>
            </div>

            {/* 4. Already Dispatched */}
            <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
              <span className="text-[10px] text-amber-700 uppercase tracking-wider font-bold block">Dispatched</span>
              <span className="font-extrabold text-amber-800 text-sm sm:text-base">
                {dispatchedQty % 1 === 0 ? dispatchedQty : dispatchedQty.toFixed(2)}
              </span>
              <span className="text-[10px] text-amber-600 block font-medium">
                {alreadyExcessQty > 0 ? `(${orderDispatchedQty} + ${alreadyExcessQty} ex)` : item.unit}
              </span>
            </div>

            {/* 5. Remaining Balance */}
            <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2.5 rounded-xl shadow-xs">
              <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-bold block">Remaining Order</span>
              <span className="font-extrabold text-white text-sm sm:text-base">
                {remainingBalance % 1 === 0 ? remainingBalance : remainingBalance.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-100 block font-medium">{item.unit}</span>
            </div>
          </div>

          {/* Intelligent Fulfillment Callout */}
          {!dismissFulfillmentNotice && productionDifference > 0 && remainingBalance > 0 && (
            <div className="mt-3 px-3.5 py-2.5 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <i className="fa-solid fa-circle-info text-blue-600 mt-0.5 shrink-0 text-sm"></i>
                <div className="leading-relaxed">
                  <span className="font-bold">Stock Fulfillment Notice:</span> Workshop completed <strong>{completedQty} {item.unit}</strong> out of <strong>{orderQty} {item.unit}</strong> ordered. The remaining balance (<strong>{remainingBalance} {item.unit}</strong>) can be fulfilled using available warehouse stock batches below.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissFulfillmentNotice(true)}
                className="text-blue-400 hover:text-blue-700 hover:bg-blue-100/70 p-1 rounded-lg transition-colors shrink-0 cursor-pointer"
                title="Dismiss notice"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          )}

          {!dismissStockWarning && totalAvailableStock < remainingBalance && (
            <div className="mt-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5 shrink-0 text-sm"></i>
                <div className="leading-relaxed">
                  <span className="font-bold">Partial Stock Warning:</span> Total available stock across all batches (<strong>{totalAvailableStock} {item.unit}</strong>) is less than the remaining order balance (<strong>{remainingBalance} {item.unit}</strong>). You can dispatch a partial delivery of up to <strong>{totalAvailableStock} {item.unit}</strong> today.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissStockWarning(true)}
                className="text-amber-400 hover:text-amber-700 hover:bg-amber-100/70 p-1 rounded-lg transition-colors shrink-0 cursor-pointer"
                title="Dismiss warning"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* SECTION 1: Standard Order Fulfillment Batches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#369ACF] text-white text-[10px] font-bold">1</span>
                  Work Order Fulfillment Batches
                </label>
                <span className="text-[11px] text-slate-400">
                  Allocates available finished goods to fulfill the order balance ({remainingBalance} {item.unit} remaining)
                </span>
              </div>

              {validBatches.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoAllocate}
                    className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="Auto-fill batches up to remaining order balance"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                    Auto-Allocate Order
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllocations}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {validBatches.length > 0 ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 bg-white">
                {validBatches.map((b) => {
                  const isWoBatch = b.source_type === "wo_production";
                  const avail = parseFloat(b.available_quantity || 0);
                  const currentAlloc = parseFloat(allocations[b.batch_no] || 0);
                  const isBatchOver = !isNaN(currentAlloc) && currentAlloc > avail;

                  return (
                    <div
                      key={b.batch_no}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        currentAlloc > 0 ? "bg-blue-50/40" : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Left: Batch Details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                            {b.batch_no}
                          </span>

                          {isWoBatch ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <i className="fa-solid fa-industry text-[9px]"></i>
                              WO Production
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <i className="fa-solid fa-warehouse text-[9px]"></i>
                              Warehouse Stock
                            </span>
                          )}

                          {b.location && (
                            <span className="text-[11px] text-slate-400">
                              • {b.location}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>
                            Available Stock: <strong className="text-emerald-700 font-bold">{avail % 1 === 0 ? avail : avail.toFixed(2)} {item.unit}</strong>
                          </span>
                          {b.party && (
                            <span className="text-slate-400 text-[11px]">
                              | Source: {b.party}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Allocation Input & Max Button */}
                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <div className="relative w-36">
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            max={avail}
                            placeholder="0.00"
                            value={allocations[b.batch_no] ?? ""}
                            onChange={(e) => handleAllocationChange(b.batch_no, e.target.value)}
                            className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 pr-10 text-right ${
                              isBatchOver
                                ? "border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-200"
                                : currentAlloc > 0
                                ? "border-[#369ACF] bg-white ring-1 ring-[#369ACF]/20"
                                : "border-slate-300 bg-white"
                            }`}
                          />
                          <span className="absolute right-2.5 top-1.5 text-[10px] font-bold text-slate-400 pointer-events-none">
                            {item.unit}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleMaxBatch(b.batch_no)}
                          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                          title="Allocate maximum available for this batch towards order"
                        >
                          Max
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400">
                <i className="fa-solid fa-boxes-stacked text-xl mb-1.5 block text-slate-300"></i>
                No finished goods currently available to dispatch. Complete production logs or add stock in Stock Status first.
              </div>
            )}
          </div>

          {/* INTERACTIVE TOGGLE: Do you want to dispatch excess? */}
          <div className="p-4 bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/30 rounded-2xl border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/30 shrink-0">
                <i className="fa-solid fa-boxes-packing text-lg"></i>
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Do you want to dispatch excess?</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                    Transit Buffer / Defect Allowance
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enable to select and dispatch additional finished parts from Stock Status as transit breakage or QA buffer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className={`text-xs font-bold ${dispatchExcess ? "text-amber-800" : "text-slate-400"}`}>
                {dispatchExcess ? "Excess Enabled" : "Excess Disabled"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dispatchExcess}
                  onChange={(e) => {
                    setDispatchExcess(e.target.checked);
                    if (!e.target.checked) setExcessAllocations({});
                  }}
                  className="sr-only peer"
                />
                <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* SECTION 2: Stock Status Excess Selection (Visible only when toggle is ON) */}
          {dispatchExcess && (
            <div className="p-4.5 bg-amber-50/40 rounded-2xl border-2 border-amber-300/80 space-y-4 animate-in fade-in zoom-in-98 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
                <div>
                  <label className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold">2</span>
                    Stock Status: Available Batches for Excess Dispatch
                  </label>
                  <span className="text-[11px] text-amber-700">
                    Allocate extra quantity directly from warehouse stock status for this product
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearExcessAllocations}
                    className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 px-2.5 py-1 rounded-lg hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer"
                  >
                    Clear Excess
                  </button>
                </div>
              </div>

              {/* Excess Batches Table */}
              <div className="border border-amber-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-amber-100 bg-white">
                {validBatches.map((b) => {
                  const isWoBatch = b.source_type === "wo_production";
                  const totalAvail = parseFloat(b.available_quantity || 0);
                  const orderAlloc = parseFloat(allocations[b.batch_no] || 0) || 0;
                  const unallocatedAvail = Math.max(0, totalAvail - orderAlloc);
                  const excessAlloc = parseFloat(excessAllocations[b.batch_no] || 0);
                  const isBatchOver = (orderAlloc + (isNaN(excessAlloc) ? 0 : excessAlloc)) > totalAvail;

                  return (
                    <div
                      key={`excess-${b.batch_no}`}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        excessAlloc > 0 ? "bg-amber-50/60" : "hover:bg-amber-50/30"
                      }`}
                    >
                      {/* Left: Batch info & unallocated availability */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                            {b.batch_no}
                          </span>

                          {isWoBatch ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <i className="fa-solid fa-industry text-[9px]"></i>
                              WO Production
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <i className="fa-solid fa-warehouse text-[9px]"></i>
                              Warehouse Stock
                            </span>
                          )}

                          {b.location && (
                            <span className="text-[11px] text-slate-400">
                              • {b.location}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>
                            Batch Stock: <strong className="text-slate-700">{totalAvail % 1 === 0 ? totalAvail : totalAvail.toFixed(2)} {item.unit}</strong>
                          </span>
                          {orderAlloc > 0 && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>
                                Dispatched for Order (in Step 1): <strong className="text-blue-700">{orderAlloc % 1 === 0 ? orderAlloc : orderAlloc.toFixed(2)} {item.unit}</strong>
                              </span>
                            </>
                          )}
                          <span className="text-slate-300">•</span>
                          <span>
                            Remaining for Excess: <strong className="text-emerald-700 font-bold">{unallocatedAvail % 1 === 0 ? unallocatedAvail : unallocatedAvail.toFixed(2)} {item.unit}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right: Excess input and max button */}
                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <div className="relative w-36">
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            max={unallocatedAvail}
                            placeholder="0.00"
                            value={excessAllocations[b.batch_no] ?? ""}
                            onChange={(e) => handleExcessAllocationChange(b.batch_no, e.target.value)}
                            className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 pr-10 text-right ${
                              isBatchOver
                                ? "border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-200"
                                : excessAlloc > 0
                                ? "border-amber-500 bg-white ring-1 ring-amber-500/20"
                                : "border-slate-300 bg-white"
                            }`}
                          />
                          <span className="absolute right-2.5 top-1.5 text-[10px] font-bold text-slate-400 pointer-events-none">
                            {item.unit}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleMaxExcessBatch(b.batch_no)}
                          disabled={unallocatedAvail <= 0}
                          className="px-2 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-300 transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Allocate maximum unallocated stock for excess"
                        >
                          Max
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DYNAMIC LIVE TALLY BAR */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Remaining Order</span>
                <span className="font-extrabold text-slate-800 text-sm sm:text-base">
                  {remainingBalance % 1 === 0 ? remainingBalance : remainingBalance.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">{item.unit}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">Order Fulfillment</span>
                <span className={`font-extrabold text-sm sm:text-base ${isOrderOverRemaining ? "text-rose-600" : "text-blue-700"}`}>
                  {orderSelectedQty % 1 === 0 ? orderSelectedQty : orderSelectedQty.toFixed(2)}
                </span>
                <span className="text-[10px] text-blue-500 block font-medium">{item.unit}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">Excess Buffer</span>
                <span className="font-extrabold text-amber-800 text-sm sm:text-base">
                  {excessSelectedQty > 0 ? `+${excessSelectedQty % 1 === 0 ? excessSelectedQty : excessSelectedQty.toFixed(2)}` : "0"}
                </span>
                <span className="text-[10px] text-amber-600 block font-medium">
                  {dispatchExcess && excessSelectedQty > 0 ? "Buffer Qty" : item.unit}
                </span>
              </div>

              <div className="bg-gradient-to-br from-[#369ACF] to-[#20698f] text-white p-2.5 rounded-xl shadow-xs">
                <span className="text-[10px] text-blue-100 font-bold uppercase tracking-wider block">Total Dispatched</span>
                <span className="font-extrabold text-white text-sm sm:text-base">
                  {totalSelectedQty % 1 === 0 ? totalSelectedQty : totalSelectedQty.toFixed(2)}
                </span>
                <span className="text-[10px] text-blue-100 block font-medium">Physical {item.unit}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
              <span className="text-slate-600">
                {balanceAfterDispatch === 0 && orderSelectedQty > 0 ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <i className="fa-solid fa-circle-check"></i>
                    Work Order will be marked fully completed upon dispatch!
                  </span>
                ) : (
                  <span>
                    Pending balance after this dispatch: <strong>{balanceAfterDispatch.toFixed(2)} {item.unit}</strong>
                  </span>
                )}
              </span>

              {excessSelectedQty > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-300">
                  <i className="fa-solid fa-boxes-packing text-xs"></i>
                  +{excessSelectedQty} {item.unit} excess buffer
                </span>
              )}
            </div>

            {isOrderOverRemaining && (
              <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                <i className="fa-solid fa-circle-xmark"></i>
                Order fulfillment ({orderSelectedQty} {item.unit}) exceeds remaining order balance ({remainingBalance} {item.unit}). Please move extra pieces to the 'Dispatch Excess' section below.
              </p>
            )}

            {hasExceededBatch && (
              <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                <i className="fa-solid fa-circle-xmark"></i>
                Total allocated (order + excess) exceeds available physical inventory for one or more batches.
              </p>
            )}
          </div>

          {/* Date & Customer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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

            <div className="space-y-0.5">
              <label className={labelCls}>Customer / Consignee</label>
              <select
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className={inputCls}
              >
                <option value="">{loadingCustomers ? "Loading customers..." : "-- Select Customer --"}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.customer_name}>
                    {c.customer_name} {c.customer_code ? `(${c.customer_code})` : ""}
                  </option>
                ))}
                {partyName && !customers.some(c => c.customer_name === partyName) && (
                  <option value={partyName}>{partyName}</option>
                )}
              </select>
            </div>
          </div>

          {/* Challan Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <label className={labelCls}>Challan Number</label>
              <input
                type="text"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                placeholder="Enter challan number (e.g. CH-2026-001)"
                className={inputCls}
              />
            </div>

            <div className="space-y-0.5">
              <label className={labelCls}>Challan Date</label>
              <DateInput
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
              />
            </div>
          </div>

          {/* Vehicle & Remarks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <label className={labelCls}>Vehicle No. / Transporter</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="e.g. MH-12-AB-1234 or Blue Dart"
                className={inputCls}
              />
            </div>

            <div className="space-y-0.5">
              <label className={labelCls}>Dispatch Remarks / Notes</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Delivery instructions (optional)..."
                className={inputCls}
              />
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {totalSelectedQty > 0 ? (
                <span>
                  Dispatching <strong className="text-slate-800">{totalSelectedQty} {item.unit}</strong>{" "}
                  {excessSelectedQty > 0 ? (
                    <span className="text-amber-700">({orderSelectedQty} Order + {excessSelectedQty} Excess Buffer)</span>
                  ) : (
                    <span>against Work Order</span>
                  )}
                </span>
              ) : null}
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || totalSelectedQty <= 0 || isOrderOverRemaining || hasExceededBatch}
                className="bg-[#369ACF] hover:bg-[#2884b2] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <i className={`fa-solid ${submitting ? "fa-spinner fa-spin" : "fa-check"}`}></i>
                {submitting
                  ? "Processing Dispatch..."
                  : excessSelectedQty > 0
                  ? `Confirm & Dispatch (${orderSelectedQty} + ${excessSelectedQty} Excess)`
                  : `Confirm & Dispatch (${totalSelectedQty} ${item.unit})`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
