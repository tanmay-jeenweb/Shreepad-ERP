import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import {
  getWorkshopEntryDetails,
  getAvailableBatches,
  issueWorkshopRm,
  addProductionLog,
  deleteProductionLog,
} from "../../api/workshopEntryApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import { getLocations } from "../../api/locationApi";
import { createRmReturn } from "../../api/rmReturnApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

export default function WorkshopEntryDetails() {
  const { workOrderItemId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("rm-issue");

  // Data states
  const [entryData, setEntryData] = useState(null);
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [locations, setLocations] = useState([]);

  // RM Issue Form State
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [rmIssues, setRmIssues] = useState([]);
  const [issuingRm, setIssuingRm] = useState(false);

  // RM Return Form State
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [returnMaterialId, setReturnMaterialId] = useState("");
  const [returnLocationId, setReturnLocationId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState("");
  const [savingReturn, setSavingReturn] = useState(false);

  // Production Movement Form & Modal State
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [moveQuantity, setMoveQuantity] = useState("");
  const [moveDate, setMoveDate] = useState(new Date().toISOString().split("T")[0]);
  const [moveRemarks, setMoveRemarks] = useState("");
  const [movingProduction, setMovingProduction] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState(null);

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

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [entryRes, rmRes, locRes] = await Promise.all([
        getWorkshopEntryDetails(workOrderItemId),
        getRawMaterials(),
        getLocations(false),
      ]);

      if (entryRes.data?.success && entryRes.data.data) {
        setEntryData(entryRes.data.data);
      } else {
        toast.error("Workshop entry not found");
      }

      setRawMaterialsList(rmRes.data?.data || []);
      setLocations(locRes.data?.data || []);
    } catch (err) {
      console.error("Failed to load workshop details:", err);
      toast.error(err.response?.data?.message || "Failed to load workshop details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workOrderItemId) {
      loadAllData();
    }
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

  // RM Issue Form Handlers
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
        return toast.error(`Row #${i + 1}: Please enter a valid quantity greater than 0.`);
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

      // Reload workshop data
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

  // RM Return Form Handler
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
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

      // Reload workshop data
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

  const productDisplayName = entryData
    ? [entryData.material_name, entryData.material_code].filter(Boolean).join(" - ") || "—"
    : "—";
  const workOrderFormattedNo =
    entryData?.work_order_no != null
      ? `WO-${String(entryData.work_order_no).padStart(4, "0")}`
      : "—";
  const prodQtyNumber = Number(entryData?.production_quantity || entryData?.quantity) || 0;

  const rawMaterials = entryData?.rawMaterials || [];
  const processes = entryData?.processes || [];
  const rmReturns = entryData?.rmReturns || [];
  const productionLogs = entryData?.productionLogs || [];

  // Production Stage Accounting
  const stageStats = useMemo(() => {
    if (!processes || processes.length === 0) return [];
    let prevCompleted = prodQtyNumber;
    return processes.map((proc, index) => {
      const logsForStage = productionLogs.filter(
        (l) => Number(l.bom_process_id) === Number(proc.id)
      );
      const completed = logsForStage.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0), 0);
      const input = index === 0 ? prodQtyNumber : prevCompleted;
      const available = Math.max(0, input - completed);
      prevCompleted = completed;
      const nextProc = index < processes.length - 1 ? processes[index + 1] : null;

      return {
        ...proc,
        stageNumber: index + 1,
        inputQty: input,
        completedQty: completed,
        availableQty: available,
        nextStageName: nextProc ? nextProc.process_name : "Finished Goods",
        isComplete: input > 0 && available === 0,
        logs: logsForStage,
      };
    });
  }, [processes, productionLogs, prodQtyNumber]);

  const finishedGoodsQty = useMemo(() => {
    if (stageStats.length === 0) return 0;
    return stageStats[stageStats.length - 1].completedQty;
  }, [stageStats]);

  const totalWipQty = useMemo(() => {
    if (stageStats.length === 0) return 0;
    return stageStats.slice(1).reduce((sum, s) => sum + s.availableQty, 0);
  }, [stageStats]);

  const overallProgressPercent = useMemo(() => {
    if (prodQtyNumber <= 0) return 0;
    return Math.min(100, Math.round((finishedGoodsQty / prodQtyNumber) * 100));
  }, [finishedGoodsQty, prodQtyNumber]);

  const handleOpenMoveModal = (stage) => {
    setSelectedStage(stage);
    setMoveQuantity("");
    setMoveDate(new Date().toISOString().split("T")[0]);
    setMoveRemarks("");
    setMoveModalOpen(true);
  };

  const handleCloseMoveModal = () => {
    if (movingProduction) return;
    setMoveModalOpen(false);
    setSelectedStage(null);
  };

  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStage) return;

    const qtyNum = parseFloat(moveQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return toast.error("Please enter a valid quantity greater than 0.");
    }
    if (qtyNum > selectedStage.availableQty) {
      return toast.error(
        `Quantity cannot exceed available stock (${selectedStage.availableQty} Nos) in ${selectedStage.process_name}.`
      );
    }

    try {
      setMovingProduction(true);
      const res = await addProductionLog({
        work_order_item_id: Number(workOrderItemId),
        bom_process_id: selectedStage.id,
        quantity: qtyNum,
        log_date: moveDate,
        remarks: moveRemarks.trim(),
      });

      toast.success(res.data?.message || "Quantity moved successfully!");
      handleCloseMoveModal();

      // Reload workshop data
      const updated = await getWorkshopEntryDetails(workOrderItemId);
      if (updated.data?.success) {
        setEntryData(updated.data.data);
      }
    } catch (err) {
      console.error("Failed to record production movement:", err);
      toast.error(err.response?.data?.message || "Failed to record production movement");
    } finally {
      setMovingProduction(false);
    }
  };

  const handleDeleteLog = async (logId, qty, fromName, toName) => {
    const confirmMsg = `Are you sure you want to reverse this movement of ${qty} Nos from ${fromName} to ${toName || "Finished Goods"}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingLogId(logId);
      const res = await deleteProductionLog(logId);
      toast.success(res.data?.message || "Movement deleted successfully");

      // Reload workshop data
      const updated = await getWorkshopEntryDetails(workOrderItemId);
      if (updated.data?.success) {
        setEntryData(updated.data.data);
      }
    } catch (err) {
      console.error("Failed to delete production movement:", err);
      toast.error(err.response?.data?.message || "Failed to delete movement");
    } finally {
      setDeletingLogId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen">
        <Navbar title="Workshop Entry" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-semibold text-sm">Loading Workshop Entry details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!entryData) {
    return (
      <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen">
        <Navbar title="Workshop Entry" />
        <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-xl flex items-center justify-between">
            <span>Workshop Entry details not found.</span>
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

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen pb-16">
      <Navbar title="Workshop Entry" />

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
            to="/production/workshop-entry"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Workshop Entries</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <i className="fa-solid fa-file-lines text-[10px]"></i>
              {workOrderFormattedNo}
            </span>
          </div>
        </div>

        {/* Work Order & Product Specifications Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Production Floor Entry
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                <i className="fa-solid fa-screwdriver-wrench text-indigo-600"></i>
                <span>Workshop Entry</span>
              </h1>
            </div>
            {entryData.customer_name && (
              <div className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                Customer: <span className="font-bold text-slate-800">{entryData.customer_name}</span>
              </div>
            )}
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#f8fafc] border border-slate-200/70 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Product Name
              </span>
              <span className="font-bold text-slate-900 text-sm block truncate" title={productDisplayName}>
                {productDisplayName}
              </span>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200/70 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Batch No.
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm block">
                {entryData.batch_no || "—"}
              </span>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200/70 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Target Production Qty
              </span>
              <span className="font-bold text-indigo-700 text-sm block">
                {prodQtyNumber.toLocaleString()} Nos
              </span>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
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
              {entryData.rmIssues?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("production")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "production"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <i className="fa-solid fa-industry"></i>
            <span>Production</span>
            <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800">
              {productionLogs.length}
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
              {rmReturns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bom-specs")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "bom-specs"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <i className="fa-solid fa-boxes-stacked"></i>
            <span>BOM Formulation & Processes</span>
            <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-800">
              {rawMaterials.length}
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
                          Click "+ Add Material" below to issue raw materials for this work order.
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer border border-indigo-200"
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
                    Return unused raw material back to warehouse inventory for this work order.
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
            {rmReturns.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <i className="fa-solid fa-list-check text-indigo-600 text-base"></i>
                  <h3 className="text-sm font-bold text-slate-800">
                    Returned Raw Materials ({rmReturns.length})
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
                      {rmReturns.map((ret, idx) => (
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

        {/* TAB: PRODUCTION MOVEMENT & TRACKING */}
        {activeTab === "production" && (
          <div className="space-y-6">
            {/* Top KPI Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-lg">
                  <i className="fa-solid fa-bullseye"></i>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Target Quantity
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {prodQtyNumber.toLocaleString()}{" "}
                    <span className="text-xs font-semibold text-slate-500">Nos</span>
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-lg">
                  <i className="fa-solid fa-play"></i>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Process 1 Available
                  </span>
                  <span className="text-lg font-black text-amber-700">
                    {(stageStats[0]?.availableQty ?? 0).toLocaleString()}{" "}
                    <span className="text-xs font-semibold text-amber-600/80">Nos</span>
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg">
                  <i className="fa-solid fa-arrows-split-up-and-left"></i>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    In-Process WIP
                  </span>
                  <span className="text-lg font-black text-blue-700">
                    {totalWipQty.toLocaleString()}{" "}
                    <span className="text-xs font-semibold text-blue-600/80">Nos</span>
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Finished Goods
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    {finishedGoodsQty.toLocaleString()}{" "}
                    <span className="text-xs font-bold text-emerald-600">({overallProgressPercent}%)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600 flex items-center gap-2">
                  <i className="fa-solid fa-chart-line text-indigo-600"></i>
                  Overall Production Completion
                </span>
                <span className="text-indigo-600">
                  {finishedGoodsQty} / {prodQtyNumber} Nos ({overallProgressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Stage Pipeline Flow Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-gears text-indigo-600"></i>
                    <span>Production Routing & Stages</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Move quantities sequentially from stage to stage. When products finish the final stage, they become Finished Goods.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full self-start sm:self-auto">
                  {stageStats.length} {stageStats.length === 1 ? "Stage" : "Stages"} Defined
                </span>
              </div>

              {stageStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                  <i className="fa-solid fa-diagram-project text-3xl mb-2 text-slate-300"></i>
                  <p className="text-sm font-semibold text-slate-600">No BOM processes configured for this product.</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Please configure processes in the BOM Formulation & Processes tab to enable sequential stage tracking.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {stageStats.map((stage, idx) => {
                    const isLastStage = idx === stageStats.length - 1;
                    return (
                      <div
                        key={stage.id || idx}
                        className={`relative rounded-2xl border transition-all flex flex-col justify-between p-4.5 bg-white ${
                          stage.availableQty > 0
                            ? "border-indigo-200 shadow-xs hover:border-indigo-400 hover:shadow-md"
                            : "border-slate-200/80 bg-slate-50/40 opacity-90"
                        }`}
                      >
                        {/* Stage Top Tag & Header */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                              Stage {stage.stageNumber} of {stageStats.length}
                            </span>
                            {stage.time != null && (
                              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                <i className="fa-regular fa-clock text-[9px]"></i>
                                {Number(stage.time).toFixed(1)} {stage.unit_name || "s"}
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-slate-900 leading-snug">
                              {stage.process_name}
                            </h3>
                            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>Destination:</span>
                              <span className="font-semibold text-slate-600">
                                {stage.nextStageName}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Available in Queue Metric (Focal Point) */}
                        <div className="my-4 p-3 bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Available In Queue
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-2xl font-black text-indigo-900">
                              {stage.availableQty.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-indigo-600">Nos</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-indigo-100/80 pt-2 mt-2 text-[11px]">
                            <span className="text-slate-500">
                              Total Input: <strong className="text-slate-700">{stage.inputQty.toLocaleString()}</strong>
                            </span>
                            <span className="text-slate-500">
                              Completed: <strong className="text-emerald-700">{stage.completedQty.toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Stage Action Button */}
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenMoveModal(stage)}
                            disabled={stage.availableQty <= 0}
                            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              stage.availableQty > 0
                                ? isLastStage
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60"
                            }`}
                          >
                            {isLastStage ? (
                              <>
                                <i className="fa-solid fa-check-double"></i>
                                <span>Complete to Finished Goods</span>
                              </>
                            ) : (
                              <>
                                <span>Move to Next Process</span>
                                <i className="fa-solid fa-arrow-right text-[11px]"></i>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Movement Logs Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-indigo-600 text-base"></i>
                  <h2 className="text-base font-bold text-slate-900">
                    Production Movement History
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full self-start sm:self-auto">
                  {productionLogs.length} {productionLogs.length === 1 ? "Record" : "Records"}
                </span>
              </div>

              {productionLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <i className="fa-solid fa-arrows-split-up-and-left text-2xl mb-1.5 text-slate-300"></i>
                  <p className="text-xs font-medium">No movement history yet. Use the buttons above to move products through stages.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">From Stage</th>
                        <th className="py-2.5 px-3 text-center"></th>
                        <th className="py-2.5 px-3">To Stage</th>
                        <th className="py-2.5 px-3 text-right">Quantity (Nos)</th>
                        <th className="py-2.5 px-3">Remarks</th>
                        <th className="py-2.5 px-3">Logged By</th>
                        <th className="py-2.5 px-3 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productionLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                            {log.log_date ? new Date(log.log_date).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {log.from_process_name || `Stage ${log.step_order}`}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400">
                            <i className="fa-solid fa-arrow-right text-[10px]"></i>
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            {log.to_process_name ? (
                              <span className="text-slate-800">{log.to_process_name}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-black">
                                <i className="fa-solid fa-circle-check text-[11px]"></i>
                                Finished Goods
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-indigo-700">
                            {Number(log.quantity).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={log.remarks || ""}>
                            {log.remarks || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-medium">
                            {log.added_by_name || "Unknown"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteLog(
                                  log.id,
                                  log.quantity,
                                  log.from_process_name,
                                  log.to_process_name
                                )
                              }
                              disabled={deletingLogId === log.id}
                              title="Delete / Reverse Movement"
                              className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer mx-auto disabled:opacity-50"
                            >
                              {deletingLogId === log.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <i className="fa-regular fa-trash-can text-xs"></i>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Move Products Modal */}
            {moveModalOpen && selectedStage && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <i className="fa-solid fa-arrows-turn-to-dots text-indigo-600"></i>
                        <span>Move Product Quantity</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Stage {selectedStage.stageNumber}: {selectedStage.process_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseMoveModal}
                      disabled={movingProduction}
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                    >
                      <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                  </div>

                  {/* Modal Body Form */}
                  <form onSubmit={handleMoveSubmit} className="p-6 space-y-4 text-xs">
                    {/* Destination Banner */}
                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                          Moving To:
                        </span>
                        <span className="text-sm font-black text-indigo-950">
                          {selectedStage.nextStageName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Available in Queue
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {selectedStage.availableQty.toLocaleString()} Nos
                        </span>
                      </div>
                    </div>

                    {/* Quantity Input with Quick Presets */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700">
                        Quantity to Move (Nos) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        max={selectedStage.availableQty}
                        value={moveQuantity}
                        onChange={(e) => setMoveQuantity(e.target.value)}
                        placeholder={`Enter quantity (max ${selectedStage.availableQty})`}
                        required
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                      />

                      {/* Quick preset buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-semibold text-slate-400">Presets:</span>
                        <button
                          type="button"
                          onClick={() => setMoveQuantity(String(Math.floor(selectedStage.availableQty * 0.25) || 1))}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition cursor-pointer"
                        >
                          25%
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoveQuantity(String(Math.floor(selectedStage.availableQty * 0.5) || 1))}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition cursor-pointer"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoveQuantity(String(selectedStage.availableQty))}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                        >
                          All ({selectedStage.availableQty})
                        </button>
                      </div>
                    </div>

                    {/* Movement Date Input */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700">
                        Movement Date <span className="text-rose-500">*</span>
                      </label>
                      <DateInput
                        value={moveDate}
                        onChange={(e) => setMoveDate(e.target.value)}
                        required
                      />
                    </div>

                    {/* Remarks Input */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700">
                        Remarks / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        rows="2"
                        value={moveRemarks}
                        onChange={(e) => setMoveRemarks(e.target.value)}
                        placeholder="Enter any notes or remarks..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none"
                      ></textarea>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleCloseMoveModal}
                        disabled={movingProduction}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={movingProduction || !moveQuantity}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {movingProduction ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Moving...</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-check"></i>
                            <span>Confirm & Move</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BOM SPECS & PROCESSES */}
        {activeTab === "bom-specs" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Materials Section */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-boxes-stacked text-indigo-600 text-sm"></i>
                  <h2 className="text-sm font-bold text-slate-800">
                    BOM Raw Material Formulation
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {rawMaterials.length} {rawMaterials.length === 1 ? "Item" : "Items"}
                </span>
              </div>

              {rawMaterials.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <i className="fa-solid fa-box-open text-2xl mb-1.5 text-slate-300"></i>
                  <p className="text-xs font-medium">No BOM raw materials configured for this product.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse bg-white rounded-lg overflow-hidden border border-slate-200 text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="py-2 px-2.5">#</th>
                        <th className="py-2 px-2.5">Material Name</th>
                        <th className="py-2 px-2.5 text-right">BOM Qty</th>
                        <th className="py-2 px-2.5 text-right">Total Req.</th>
                        <th className="py-2 px-2.5 text-center">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawMaterials.map((rm, idx) => {
                        const bomQty = Number(rm.bom_quantity) || 0;
                        const totalReqQty = bomQty * prodQtyNumber;
                        return (
                          <tr key={rm.id || idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-2.5 font-semibold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                              <div>{rm.material_name}</div>
                              {rm.material_code && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  {rm.material_code}
                                </span>
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

            {/* Processes Routing Section */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-gears text-indigo-600 text-sm"></i>
                  <h2 className="text-sm font-bold text-slate-800">Processes Routing</h2>
                </div>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {processes.length} {processes.length === 1 ? "Step" : "Steps"}
                </span>
              </div>

              {processes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <i className="fa-solid fa-clock-rotate-left text-2xl mb-1.5 text-slate-300"></i>
                  <p className="text-xs font-medium">No BOM processes configured for this product.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse bg-white rounded-lg overflow-hidden border border-slate-200 text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="py-2 px-2.5">#</th>
                        <th className="py-2 px-2.5">Process Name</th>
                        <th className="py-2 px-2.5 text-right">Cycle Time</th>
                        <th className="py-2 px-2.5 text-center">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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
        )}
      </main>
    </div>
  );
}

function WorkshopRmIssueChit({ chit, materialName, itemCode, batch, workOrderNo, onPrint }) {
  const totalQty = chit.rows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);

  return (
    <div
      id={`chit-${chit.lot}`}
      className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs mx-auto text-xs font-sans text-slate-800 relative hover:border-slate-400 transition-all"
    >
      <div className="w-full border border-slate-400 rounded overflow-hidden">
        {/* Title */}
        <div className="border-b border-slate-400 text-center py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-100/80 text-slate-700">
          Raw Material Issue CHIT Label
        </div>

        {/* Header Grid */}
        <div className="grid grid-cols-12 border-b border-slate-400">
          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Item Name
          </div>
          <div className="col-span-3 border-r border-slate-400 p-2 font-semibold text-slate-800">
            {materialName || "—"}
          </div>

          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Item Code
          </div>
          <div className="col-span-3 p-2 font-mono font-semibold text-slate-800">
            {itemCode || "—"}
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-slate-400">
          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Date:
          </div>
          <div className="col-span-3 border-r border-slate-400 p-2 font-semibold text-slate-800">
            {chit.date}
          </div>

          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Batch No.
          </div>
          <div className="col-span-3 p-2 font-mono font-semibold text-slate-800">
            {batch || "—"}
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-slate-400">
          <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            Work Order No.
          </div>
          <div className="col-span-9 p-2 font-mono font-bold text-slate-900">
            {workOrderNo}
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-slate-400 bg-slate-100/50">
          <div className="col-span-6 border-r border-slate-400 p-2 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">
            Material Specifications
          </div>
          <div className="col-span-6 p-2 font-bold text-slate-700 text-center">
            Chit No: <span className="text-rose-600 font-extrabold text-sm ml-1.5">{Math.floor(Number(chit.lot))}</span>
          </div>
        </div>

        {/* Table Header */}
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-400 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">
              <th className="border-r border-slate-400 p-2 w-10 text-center">#</th>
              <th className="border-r border-slate-400 p-2 min-w-[150px]">RM Type</th>
              <th className="border-r border-slate-400 p-2 min-w-[150px]">Internal Batch</th>
              <th className="p-2 w-28 text-right">Qty (kg)</th>
            </tr>
          </thead>
          <tbody>
            {chit.rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-slate-300 hover:bg-slate-50/50 text-slate-700">
                <td className="border-r border-slate-400 p-2 text-center text-slate-400">{rIdx + 1}</td>
                <td className="border-r border-slate-400 p-2 font-bold text-slate-800">
                  {row.rm_type_name || row.material_name || "—"}
                </td>
                <td className="border-r border-slate-400 p-2 font-mono text-[11px] font-semibold text-slate-800">
                  {row.internal_batch_number}
                </td>
                <td className="p-2 font-bold text-right bg-emerald-50/20">
                  {Number(row.qty).toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-400">
              <td colSpan="3" className="border-r border-slate-400 p-2 text-left uppercase tracking-wider text-[10px] text-slate-500 font-bold">
                Total Quantity
              </td>
              <td className="p-2 font-bold text-right bg-emerald-50/30">
                {totalQty.toFixed(3)} kg
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Print Button */}
      <div className="flex justify-center mt-4 no-print">
        <button
          type="button"
          onClick={() => onPrint(chit.lot)}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer text-xs border-none"
        >
          <i className="fa-solid fa-print"></i>
          <span>Print Chit Label</span>
        </button>
      </div>
    </div>
  );
}
