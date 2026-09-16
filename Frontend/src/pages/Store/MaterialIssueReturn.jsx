import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DateInput from "../../components/DateInput";
import WorkshopRmIssueChit from "../../components/WorkshopRmIssueChit";
import {
  getWorkshopEntryDetails,
  getAvailableBatches,
  issueWorkshopRm,
} from "../../api/workshopEntryApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import { getLocations } from "../../api/locationApi";
import { createRmReturn } from "../../api/rmReturnApi";
import toast from "react-hot-toast";

export default function MaterialIssueReturn() {
  const { workOrderItemId } = useParams();
  const navigate = useNavigate();

  const [loadingDetails, setLoadingDetails] = useState(true);
  const [entryData, setEntryData] = useState(null);
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [locations, setLocations] = useState([]);

  // Active tab: "rm-issue" | "rm-return"
  const [activeTab, setActiveTab] = useState("rm-issue");

  // RM Issue Form State
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [rmIssues, setRmIssues] = useState([]);
  const [issuingRm, setIssuingRm] = useState(false);

  // RM Return Form State
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [returnMaterialId, setReturnMaterialId] = useState("");
  const [returnLocationId, setReturnLocationId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState("");
  const [savingReturn, setSavingReturn] = useState(false);

  // Load details for this specific work order
  const loadWorkOrderData = async () => {
    if (!workOrderItemId) {
      navigate("/store/material-issue-return", { replace: true });
      return;
    }

    try {
      setLoadingDetails(true);
      const [entryRes, rmRes, locRes] = await Promise.all([
        getWorkshopEntryDetails(workOrderItemId),
        getRawMaterials(),
        getLocations(false),
      ]);

      if (entryRes.data?.success && entryRes.data.data) {
        setEntryData(entryRes.data.data);
      } else {
        toast.error("Work order details not found");
        navigate("/store/material-issue-return", { replace: true });
      }

      setRawMaterialsList(rmRes.data?.data || []);
      setLocations(locRes.data?.data || []);
    } catch (err) {
      console.error("Failed to load work order details:", err);
      toast.error(err.response?.data?.message || "Failed to load work order details");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadWorkOrderData();
  }, [workOrderItemId]);

  // Group RM issues by lot
  const submittedChits = useMemo(() => {
    if (!entryData?.rmIssues) return [];
    const grouped = {};
    entryData.rmIssues.forEach((issue) => {
      const lotNum = issue.lot || 1;
      if (!grouped[lotNum]) {
        grouped[lotNum] = {
          lot: lotNum,
          date: issue.date ? new Date(issue.date).toISOString().split("T")[0] : "",
          rows: [],
        };
      }
      grouped[lotNum].rows.push(issue);
    });
    return Object.values(grouped).sort((a, b) => a.lot - b.lot);
  }, [entryData?.rmIssues]);

  // Chit Printing Handler
  const handlePrint = (lotId) => {
    const element = document.getElementById(`chit-${lotId}`);
    if (!element) return;

    const clone = element.cloneNode(true);
    const printBtn = clone.querySelector(".no-print");
    if (printBtn) {
      printBtn.remove();
    }

    clone.style.margin = "0 auto";
    clone.style.border = "none";
    clone.style.boxShadow = "none";
    clone.style.padding = "0";

    const root = document.getElementById("root");
    const printContainer = document.createElement("div");
    printContainer.id = "print-container";
    printContainer.appendChild(clone);

    if (root) root.style.display = "none";
    document.body.appendChild(printContainer);

    window.print();

    document.body.removeChild(printContainer);
    if (root) root.style.display = "";
  };

  // RM Issue Handlers
  const handleAddIssueRow = () => {
    setRmIssues((prev) => [
      ...prev,
      {
        material_id: "",
        internal_batch_number: "",
        qty: "",
        available_qty: 0,
        batches: [],
        loadingBatches: false,
      },
    ]);
  };

  const handleRemoveIssueRow = (index) => {
    setRmIssues((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMaterialChange = async (index, matId) => {
    const updated = [...rmIssues];
    updated[index].material_id = matId;
    updated[index].internal_batch_number = "";
    updated[index].qty = "";
    updated[index].available_qty = 0;
    updated[index].loadingBatches = true;
    setRmIssues(updated);

    if (!matId) {
      updated[index].loadingBatches = false;
      updated[index].batches = [];
      setRmIssues([...updated]);
      return;
    }

    try {
      const res = await getAvailableBatches(matId);
      const batches = res.data?.data || [];
      setRmIssues((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index].batches = batches;
          next[index].loadingBatches = false;
        }
        return next;
      });
    } catch (err) {
      console.error("Error loading batches:", err);
      toast.error("Failed to load available stock batches");
      setRmIssues((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index].batches = [];
          next[index].loadingBatches = false;
        }
        return next;
      });
    }
  };

  const handleBatchChange = (index, batchNum) => {
    setRmIssues((prev) => {
      const updated = [...prev];
      const row = updated[index];
      row.internal_batch_number = batchNum;
      const selectedBatch = (row.batches || []).find(
        (b) => b.internal_batch_number === batchNum
      );
      if (selectedBatch) {
        row.available_qty = Number(selectedBatch.available_qty) || 0;
        row.ma_item_id = selectedBatch.ma_item_id || null;
        row.rm_return_id = selectedBatch.rm_return_id || null;
      } else {
        row.available_qty = 0;
        row.ma_item_id = null;
        row.rm_return_id = null;
      }
      return updated;
    });
  };

  const handleQtyChange = (index, val) => {
    setRmIssues((prev) => {
      const updated = [...prev];
      updated[index].qty = val;
      return updated;
    });
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!workOrderItemId) return;
    if (entryData?.work_order_status !== 'Started') {
      return toast.error("Cannot issue materials: Work Order has not been started yet. Please start it in Work Order Master.");
    }
    if (rmIssues.length === 0) {
      return toast.error("Please add at least one raw material to issue.");
    }

    // Validation
    for (let i = 0; i < rmIssues.length; i++) {
      const row = rmIssues[i];
      if (!row.material_id) {
        return toast.error(`Row #${i + 1}: Please select a Raw Material.`);
      }
      if (!row.internal_batch_number) {
        return toast.error(`Row #${i + 1}: Please select an Internal Batch.`);
      }
      const q = parseFloat(row.qty);
      if (isNaN(q) || q <= 0) {
        return toast.error(
          `Row #${i + 1}: Please enter a valid quantity greater than 0.`
        );
      }
      if (q > Number(row.available_qty)) {
        return toast.error(
          `Row #${i + 1}: Issued qty (${q} kg) exceeds available stock (${row.available_qty} kg).`
        );
      }
    }

    try {
      setIssuingRm(true);
      const res = await issueWorkshopRm({
        work_order_item_id: Number(workOrderItemId),
        issues: rmIssues,
        date: issueDate,
      });

      toast.success(res.data?.message || "Raw materials issued successfully!");
      setRmIssues([]);
      setIssueDate(new Date().toISOString().split("T")[0]);

      // Reload updated details
      const updated = await getWorkshopEntryDetails(workOrderItemId);
      if (updated.data?.success) {
        setEntryData(updated.data.data);
      }
    } catch (err) {
      console.error("Failed to issue RM:", err);
      toast.error(err.response?.data?.message || "Failed to issue raw materials");
    } finally {
      setIssuingRm(false);
    }
  };

  // RM Return Handler
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!workOrderItemId) return;
    if (entryData?.work_order_status !== 'Started') {
      return toast.error("Cannot return materials: Work Order has not been started yet. Please start it in Work Order Master.");
    }
    if (!returnMaterialId) {
      return toast.error("Please select a Material Name to return.");
    }
    if (!returnLocationId) {
      return toast.error("Please select a Storage Location.");
    }
    const qty = parseFloat(returnQuantity);
    if (isNaN(qty) || qty <= 0) {
      return toast.error("Please enter a valid return quantity greater than 0 kg.");
    }

    try {
      setSavingReturn(true);
      await createRmReturn({
        work_order_item_id: Number(workOrderItemId),
        return_date: returnDate,
        material_id: Number(returnMaterialId),
        location_id: Number(returnLocationId),
        quantity: qty,
      });

      toast.success("Raw material return recorded successfully!");
      setReturnMaterialId("");
      setReturnLocationId("");
      setReturnQuantity("");
      setReturnDate(new Date().toISOString().split("T")[0]);

      // Reload updated details
      const updated = await getWorkshopEntryDetails(workOrderItemId);
      if (updated.data?.success) {
        setEntryData(updated.data.data);
      }
    } catch (err) {
      console.error("Failed to record RM return:", err);
      toast.error(err.response?.data?.message || "Failed to record raw material return");
    } finally {
      setSavingReturn(false);
    }
  };

  const workOrderFormattedNo = entryData?.work_order_no
    ? `WO-${String(entryData.work_order_no).padStart(4, "0")}`
    : "—";

  if (loadingDetails) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
        <Navbar title="Material Issue & Return" />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-semibold">Loading work order details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!entryData) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
        <Navbar title="Material Issue & Return" />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-semibold text-slate-600 mb-3">Work order not found.</p>
          <Link
            to="/store/material-issue-return"
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-indigo-700 transition"
          >
            Back to Work Orders
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen pb-16">
      <Navbar title="Material Issue & Return" />

      {/* CSS for chit label print mode */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-container, #print-container * {
            visibility: visible !important;
          }
          #print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <main className="flex-1 flex flex-col w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Navigation Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/store/material-issue-return"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Material Issue & Return</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
              <i className="fa-solid fa-file-lines text-[10px]"></i>
              {workOrderFormattedNo}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              entryData?.work_order_status === 'Started'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {entryData?.work_order_status === 'Started' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
              {entryData?.work_order_status || 'Draft'}
            </span>
          </div>
        </div>

        {/* Unstarted Notice Banner */}
        {entryData?.work_order_status !== 'Started' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 shadow-2xs">
            <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xl shrink-0"></i>
            <div>
              <p className="text-sm font-bold">This Work Order is not started ({entryData?.work_order_status || 'Draft'}).</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Raw material issuing, chit printing, and returns are disabled until the Work Order is started from the Work Order Master.
              </p>
            </div>
          </div>
        )}

        {/* Selected Work Order Banner (White Background) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                <i className="fa-solid fa-file-lines text-[10px]"></i>
                {workOrderFormattedNo}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {entryData.work_order_date
                  ? new Date(entryData.work_order_date).toLocaleDateString()
                  : ""}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#f8fafc] border border-slate-200/70 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Product / Item
              </span>
              <span className="font-bold text-slate-900 text-sm block truncate" title={entryData.material_name}>
                {entryData.material_name}
              </span>
              <span className="text-xs font-mono text-slate-500 mt-0.5 block">
                {entryData.material_code || "—"}
              </span>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200/70 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Batch No.
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm block">
                {entryData.batch_no || "—"}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Production Lot
              </span>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200/70 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Target Prod Qty
              </span>
              <span className="font-bold text-indigo-700 text-sm block">
                {Number(entryData.production_quantity || entryData.quantity || 0).toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-600">Nos</span>
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Unit: {entryData.unit_weight ? `${Number(entryData.unit_weight).toFixed(3)} kg` : "—"}
              </span>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200/70 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Customer
              </span>
              <span className="text-sm font-semibold text-slate-800 block truncate" title={entryData.customer_name}>
                {entryData.customer_name || "Internal Stock"}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Work Order Party
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Only 2 Work-Order Specific Tabs) */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveTab("rm-issue")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "rm-issue"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <i className="fa-solid fa-arrow-up-from-bracket"></i>
            <span>Raw Material Issues</span>
            <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800">
              {entryData?.rmIssues?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rm-return")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "rm-return"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <i className="fa-solid fa-arrow-rotate-left"></i>
            <span>Raw Material Returns</span>
            <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-800">
              {entryData?.rmReturns?.length || 0}
            </span>
          </button>
        </div>

        {/* TAB 1: RM ISSUE & CHIT PRINTING */}
        {activeTab === "rm-issue" && (
          <div className="space-y-6">
            {/* Issue Form Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-arrow-up-from-bracket text-indigo-600 text-base"></i>
                  <h2 className="text-base font-bold text-slate-900">
                    Issue Raw Materials (Generate New Chit)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Chit Issue Date:</span>
                  <div className="w-40">
                    <DateInput
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Issue Rows Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[220px]">Raw Material</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Internal Batch (Available kg)</th>
                      <th className="py-2.5 px-3 min-w-[130px] text-right">Issue Qty (kg)</th>
                      <th className="py-2.5 px-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rmIssues.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">
                          <i className="fa-solid fa-basket-shopping text-2xl mb-1 text-slate-300 block"></i>
                          Click "+ Add Material" below to issue raw materials for {workOrderFormattedNo}.
                        </td>
                      </tr>
                    ) : (
                      rmIssues.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={row.material_id}
                              onChange={(e) => handleMaterialChange(idx, e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-indigo-500 outline-none"
                            >
                              <option value="">-- Select Material --</option>
                              {rawMaterialsList.map((m) => (
                                <option key={m.id || m.material_id} value={m.material_id || m.id}>
                                  {m.material_name} {m.material_code ? `(${m.material_code})` : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            {row.loadingBatches ? (
                              <span className="text-xs text-slate-400 italic">
                                Loading batches...
                              </span>
                            ) : (
                              <select
                                value={row.internal_batch_number}
                                onChange={(e) => handleBatchChange(idx, e.target.value)}
                                disabled={!row.material_id}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:border-indigo-500 outline-none disabled:bg-slate-100"
                              >
                                <option value="">-- Select Batch --</option>
                                {(row.batches || []).map((b) => (
                                  <option key={b.internal_batch_number} value={b.internal_batch_number}>
                                    {b.internal_batch_number} ({Number(b.available_qty).toFixed(3)} kg avail)
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              max={row.available_qty || undefined}
                              value={row.qty}
                              onChange={(e) => handleQtyChange(idx, e.target.value)}
                              placeholder="0.000"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold text-right focus:border-indigo-500 outline-none"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveIssueRow(idx)}
                              className="text-rose-500 hover:text-rose-700 transition p-1 cursor-pointer"
                              title="Remove row"
                            >
                              <i className="fa-solid fa-trash-can text-sm"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Form Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddIssueRow}
                  disabled={entryData?.work_order_status !== 'Started'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                  <span>Add Material</span>
                </button>

                {rmIssues.length > 0 && (
                  <button
                    type="button"
                    onClick={handleIssueSubmit}
                    disabled={issuingRm}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {issuingRm ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Issuing...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check text-xs"></i>
                        <span>Generate Chit & Issue RM</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Issued Chit Labels List */}
            {submittedChits.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <i className="fa-solid fa-receipt text-indigo-600 text-base"></i>
                  <h3 className="text-sm font-bold text-slate-800">
                    Issued Raw Material Chit Labels ({submittedChits.length})
                  </h3>
                </div>

                <div className="space-y-6">
                  {submittedChits.map((chit, idx) => (
                    <WorkshopRmIssueChit
                      key={idx}
                      chit={chit}
                      materialName={entryData.material_name}
                      itemCode={entryData.material_code}
                      batch={entryData.batch_no}
                      workOrderNo={workOrderFormattedNo}
                      onPrint={handlePrint}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RM RETURN */}
        {activeTab === "rm-return" && (
          <div className="space-y-6">
            {/* RM Return Form Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <i className="fa-solid fa-arrow-rotate-left text-indigo-600 text-base"></i>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Record Raw Material Return
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Return unused raw material back to warehouse inventory for {workOrderFormattedNo}.
                  </p>
                </div>
              </div>

              <form onSubmit={handleReturnSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Return Date
                    </label>
                    <DateInput
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Raw Material
                    </label>
                    <select
                      value={returnMaterialId}
                      onChange={(e) => setReturnMaterialId(e.target.value)}
                      required
                      className="w-full bg-[#f8fafc] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:border-indigo-500 outline-none"
                    >
                      <option value="">-- Select Material --</option>
                      {rawMaterialsList.map((m) => (
                        <option key={m.id || m.material_id} value={m.material_id || m.id}>
                          {m.material_name} {m.material_code ? `(${m.material_code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Return Storage Location
                    </label>
                    <select
                      value={returnLocationId}
                      onChange={(e) => setReturnLocationId(e.target.value)}
                      required
                      className="w-full bg-[#f8fafc] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:border-indigo-500 outline-none"
                    >
                      <option value="">-- Select Location --</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.location_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Quantity (kg)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={returnQuantity}
                      onChange={(e) => setReturnQuantity(e.target.value)}
                      placeholder="e.g. 15.500"
                      required
                      className="w-full bg-[#f8fafc] border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingReturn}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingReturn ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Recording Return...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-arrow-rotate-left text-xs"></i>
                        <span>Record RM Return</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Returned RM Table */}
            {entryData?.rmReturns?.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <i className="fa-solid fa-list-check text-indigo-600 text-base"></i>
                  <h3 className="text-sm font-bold text-slate-800">
                    Returned Raw Materials ({entryData.rmReturns.length})
                  </h3>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3">Return No.</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Material Name</th>
                        <th className="py-2.5 px-3">Storage Location</th>
                        <th className="py-2.5 px-3">Internal Batch</th>
                        <th className="py-2.5 px-3 text-right">Qty (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entryData.rmReturns.map((ret, idx) => (
                        <tr key={ret.id || idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                            {ret.return_no || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            {ret.return_date ? new Date(ret.return_date).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {ret.material_name || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600">
                            {ret.location_name || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-700">
                            {ret.internal_batch_number || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {Number(ret.quantity).toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
