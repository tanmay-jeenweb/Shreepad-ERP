import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getPMemoDetails, createPMemo, getAvailableBatches } from "../../api/pmemoApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

export default function PMRmIssuePage() {
    const { workOrderItemId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // P Memo Header details (needed to preserve when saving)
    const [pMemoNo, setPMemoNo] = useState("");
    const [date, setDate] = useState("");
    const [machineName, setMachineName] = useState("");
    const [materialName, setMaterialName] = useState("");
    const [itemCode, setItemCode] = useState("");
    const [rawMaterialName, setRawMaterialName] = useState("");
    const [unitWeight, setUnitWeight] = useState("");
    const [color, setColor] = useState("");
    const [batch, setBatch] = useState("");
    const [mouldCavity, setMouldCavity] = useState("");
    const [productionQuantity, setProductionQuantity] = useState("");

    // P Memo RM and Loss details
    const [rmRequired, setRmRequired] = useState(0);
    const [rmMade, setRmMade] = useState(0);
    const [rmToBeMade, setRmToBeMade] = useState(0);
    const [lossKg, setLossKg] = useState(0);
    const [lossPercent, setLossPercent] = useState(0);
    const [rmReturn, setRmReturn] = useState(0);
    const [runningTotalKg, setRunningTotalKg] = useState(0);
    const [runningTotalPercent, setRunningTotalPercent] = useState(0);
    const [runningTotalNos, setRunningTotalNos] = useState("");

    const [isEditMode, setIsEditMode] = useState(false);
    const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);

    // RM Issue Module States
    const [mainRmFormulation, setMainRmFormulation] = useState("");
    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [rmIssues, setRmIssues] = useState([]);

    // New state for submitted chits
    const [submittedChits, setSubmittedChits] = useState([]);

    // Global Lot and Date for all RM issues
    const [issueLot, setIssueLot] = useState("");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);

    const handleLotChange = (val) => {
        setIssueLot(val);
        const lotVal = parseFloat(val) || 0;

        setRmIssues(prev => prev.map((item, idx) => {
            const rowQty = parseFloat(item.qty) || 0;
            const totalRequired = lotVal * rowQty;
            if (totalRequired > item.available_qty) {
                toast.error(`Row ${idx + 1}: Total quantity (${totalRequired.toFixed(3)} kg) exceeds available stock (${item.available_qty} kg). Adjusting row quantity.`);
                return {
                    ...item,
                    qty: lotVal > 0 ? (item.available_qty / lotVal).toFixed(3) : ""
                };
            }
            return item;
        }));
    };    const handlePrint = (lotId) => {
        const element = document.getElementById(`chit-${lotId}`);
        if (!element) return;

        // Clone the element to preserve the original state
        const clone = element.cloneNode(true);
        
        // Remove the print button container from the printed output
        const printBtn = clone.querySelector('.no-print');
        if (printBtn) {
            printBtn.remove();
        }

        // Apply a wrapper style to center it on the printed page
        clone.style.margin = '0 auto';
        clone.style.border = 'none';
        clone.style.boxShadow = 'none';
        clone.style.padding = '0';
        
        // Get the root container
        const root = document.getElementById('root');
        
        // Create a temporary print container
        const printContainer = document.createElement('div');
        printContainer.id = 'print-container';
        printContainer.appendChild(clone);
        
        // Hide the main root and append print container
        if (root) root.style.display = 'none';
        document.body.appendChild(printContainer);
        
        // Print
        window.print();
        
        // Clean up
        document.body.removeChild(printContainer);
        if (root) root.style.display = '';
    };

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const [res, rmRes] = await Promise.all([
                    getPMemoDetails(workOrderItemId),
                    getRawMaterials()
                ]);
                if (res.data?.success && res.data.data) {
                    const data = res.data.data;

                    // Keep page unlocked so user can issue again and again
                    setIsFinalSubmitted(false);

                    if (data.p_memo_no) {
                        setPMemoNo(data.p_memo_no);
                        setIsEditMode(true);
                        const formattedDate = data.p_memo_date ? new Date(data.p_memo_date).toISOString().split("T")[0] : "";
                        setDate(formattedDate);
                    } else {
                        setPMemoNo(data.proposed_p_memo_no || "");
                        setIsEditMode(false);
                        setDate(new Date().toISOString().split("T")[0]);
                    }

                    setMachineName(data.machine_name || "—");
                    setMaterialName(data.material_name || "—");
                    setItemCode(data.item_code || "—");
                    setRawMaterialName(data.raw_material_name || "—");
                    setUnitWeight(data.unit_weight || "—");
                    setColor(data.color || "—");
                    setBatch(data.batch || "—");
                    setMouldCavity(data.mould_cavity || "—");
                    setProductionQuantity(data.production_quantity || "—");
                    setMainRmFormulation(data.rm_formulation || "");

                    const uWeight = parseFloat(data.unit_weight) || 0;
                    const prodQty = parseFloat(data.production_quantity) || 0;
                    const computedRequired = uWeight * prodQty;

                    const backendRequired = data.rm_required !== null && data.rm_required !== undefined ? parseFloat(data.rm_required) : null;
                    const finalRequired = backendRequired !== null ? backendRequired : computedRequired;

                    setRmRequired(finalRequired);
                    const valRmMade = data.rm_made !== null && data.rm_made !== undefined ? parseFloat(data.rm_made) : 0;
                    setRmMade(valRmMade);
                    setRmToBeMade(data.rm_to_be_made !== null && data.rm_to_be_made !== undefined ? parseFloat(data.rm_to_be_made) : finalRequired);
                    setLossKg(data.loss_kg !== null && data.loss_kg !== undefined ? parseFloat(data.loss_kg) : 0);
                    setLossPercent(data.loss_percent !== null && data.loss_percent !== undefined ? parseFloat(data.loss_percent) : 0);
                    setRmReturn(data.rm_return !== null && data.rm_return !== undefined ? parseFloat(data.rm_return) : 0);
                    setRunningTotalKg(data.running_total_kg !== null && data.running_total_kg !== undefined ? parseFloat(data.running_total_kg) : 0);
                    setRunningTotalPercent(data.running_total_percent !== null && data.running_total_percent !== undefined ? parseFloat(data.running_total_percent) : 0);
                    
                    const valRunningTotalNos = data.running_total_nos !== null && data.running_total_nos !== undefined
                        ? parseFloat(data.running_total_nos)
                        : (data.running_total_kg && uWeight > 0 ? Math.round(parseFloat(data.running_total_kg) / uWeight) : "");
                    setRunningTotalNos(valRunningTotalNos);

                    // Form starts blank, so we don't pre-populate the inputs
                    setIssueLot("");
                    setIssueDate(new Date().toISOString().split("T")[0]);

                    // Group saved RM issues by lot to construct submittedChits
                    const grouped = {};
                    (data.rmIssues || []).forEach(issue => {
                        const lotNum = issue.lot || 1;
                        if (!grouped[lotNum]) {
                            grouped[lotNum] = {
                                lot: lotNum,
                                date: issue.date ? new Date(issue.date).toISOString().split("T")[0] : "",
                                remark: issue.remark || "",
                                rows: []
                            };
                        }
                        grouped[lotNum].rows.push({
                            remark: issue.remark || "",
                            material_id: issue.material_id || "",
                            grade: issue.grade || "",
                            internal_batch_number: issue.internal_batch_number || "",
                            grn_item_id: issue.grn_item_id || null,
                            ma_item_id: issue.ma_item_id || null,
                            rm_return_id: issue.rm_return_id || null,
                            qty: issue.qty || "",
                            available_qty: Number(issue.total_quantity) || 0,
                            mfi: issue.mfi || "",
                            supplier_batch_number: issue.supplier_batch_number || "",
                            batches: [{
                                internal_batch_number: issue.internal_batch_number,
                                available_qty: Number(issue.total_quantity),
                                grn_item_id: issue.grn_item_id,
                                ma_item_id: issue.ma_item_id,
                                rm_return_id: issue.rm_return_id || null,
                                mfi: issue.mfi || "",
                                supplier_batch_number: issue.supplier_batch_number || ""
                            }],
                            loadingBatches: false
                        });
                    });
                    const chits = Object.values(grouped).sort((a, b) => a.lot - b.lot);
                    setSubmittedChits(chits);
                    setRmIssues([]); // Start the active form blank!
                }
                if (rmRes.data?.success) {
                    setRawMaterialsList(rmRes.data.data || []);
                }
            } catch (err) {
                console.error("Failed to load P Memo details:", err);
                toast.error("Failed to load P Memo details");
                navigate(`/production/p-memo/${workOrderItemId}`);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [workOrderItemId, navigate]);

    // Cascading options helper
    const uniqueRmTypes = useMemo(() => {
        return Array.from(
            new Map(rawMaterialsList.map(item => [item.material_id, item.material_name])).entries()
        ).map(([id, name]) => ({ material_id: id, material_name: name }));
    }, [rawMaterialsList]);

    const handleAddRow = () => {
        setRmIssues(prev => [
            ...prev,
            {
                remark: mainRmFormulation || "",
                material_id: "",
                grade: "",
                internal_batch_number: "",
                grn_item_id: null,
                ma_item_id: null,
                rm_return_id: null,
                qty: "",
                available_qty: 0,
                mfi: "",
                supplier_batch_number: "",
                batches: [],
                loadingBatches: false
            }
        ]);
    };

    const removeItem = (idx) => {
        setRmIssues(prev => prev.filter((_, i) => i !== idx));
        toast.success("Row removed");
    };

    const handleRowChange = async (idx, field, value) => {
        const updated = [...rmIssues];
        const item = { ...updated[idx] };
        item[field] = value;

        if (field === "material_id") {
            item.grade = "";
            item.internal_batch_number = "";
            item.grn_item_id = null;
            item.ma_item_id = null;
            item.rm_return_id = null;
            item.qty = "";
            item.available_qty = 0;
            item.mfi = "";
            item.supplier_batch_number = "";
            item.batches = [];
        }

        if (field === "grade") {
            item.internal_batch_number = "";
            item.grn_item_id = null;
            item.ma_item_id = null;
            item.rm_return_id = null;
            item.qty = "";
            item.available_qty = 0;
            item.mfi = "";
            item.supplier_batch_number = "";
            item.batches = [];

            if (item.material_id && value) {
                item.loadingBatches = true;
                updated[idx] = item;
                setRmIssues([...updated]);
                try {
                    const res = await getAvailableBatches(item.material_id, value);
                    if (res.data?.success) {
                        item.batches = res.data.data || [];
                    }
                } catch (err) {
                    console.error("Failed to fetch available batches:", err);
                } finally {
                    item.loadingBatches = false;
                }
            }
        }

        if (field === "internal_batch_number") {
            const batchExists = rmIssues.some((it, i) => i !== idx && it.internal_batch_number === value && value !== "");
            if (batchExists) {
                toast.error(`Batch "${value}" has already been selected in another row.`);
                item.internal_batch_number = "";
                item.grn_item_id = null;
                item.ma_item_id = null;
                item.rm_return_id = null;
                item.available_qty = 0;
                item.mfi = "";
                item.supplier_batch_number = "";
                item.qty = "";
            } else {
                const batch = item.batches.find(b => b.internal_batch_number === value);
                if (batch) {
                    item.grn_item_id = batch.grn_item_id || null;
                    item.ma_item_id = batch.ma_item_id || null;
                    item.rm_return_id = batch.rm_return_id || null;
                    item.available_qty = Number(batch.available_qty) || 0;
                    item.mfi = batch.mfi || "";
                    item.supplier_batch_number = batch.supplier_batch_number || "";
                } else {
                    item.grn_item_id = null;
                    item.ma_item_id = null;
                    item.rm_return_id = null;
                    item.available_qty = 0;
                    item.mfi = "";
                    item.supplier_batch_number = "";
                }
                item.qty = "";
            }
        }

        if (field === "qty") {
            const val = parseFloat(value) || 0;
            const currentLot = parseFloat(issueLot) || 0;
            const totalRequired = currentLot * val;
            if (totalRequired > item.available_qty) {
                toast.error(`Total quantity (${totalRequired.toFixed(3)} kg) exceeds available stock (${item.available_qty} kg)`);
                item.qty = currentLot > 0 ? (item.available_qty / currentLot).toFixed(3) : "";
            } else {
                item.qty = value;
            }
        }

        updated[idx] = item;
        setRmIssues(updated);
    };

    const validateRmIssues = () => {
        if (!issueLot || isNaN(parseFloat(issueLot)) || parseFloat(issueLot) <= 0) {
            toast.error("Please enter a valid Issue Lot.");
            return false;
        }
        if (!issueDate) {
            toast.error("Please enter a valid Issue Date.");
            return false;
        }

        const selectedBatches = new Set();
        for (let i = 0; i < rmIssues.length; i++) {
            const item = rmIssues[i];
            if (!item.material_id) {
                toast.error(`Row ${i + 1}: Please select an RM Type.`);
                return false;
            }
            if (!item.grade) {
                toast.error(`Row ${i + 1}: Please select a Grade.`);
                return false;
            }
            if (!item.internal_batch_number) {
                toast.error(`Row ${i + 1}: Please select an I-Batch.`);
                return false;
            }
            if (selectedBatches.has(item.internal_batch_number)) {
                toast.error(`Row ${i + 1}: Batch "${item.internal_batch_number}" is duplicate. Each row must have a unique batch.`);
                return false;
            }
            selectedBatches.add(item.internal_batch_number);
            if (!item.qty || isNaN(parseFloat(item.qty)) || parseFloat(item.qty) <= 0) {
                toast.error(`Row ${i + 1}: Please enter a valid Qty.`);
                return false;
            }
            const totalRequired = (parseFloat(issueLot) || 0) * (parseFloat(item.qty) || 0);
            if (totalRequired > parseFloat(item.available_qty)) {
                toast.error(`Row ${i + 1}: Total Quantity (${totalRequired.toFixed(3)} kg) exceeds available stock (${item.available_qty} kg).`);
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e, target = "rm-issue") => {
        if (e && e.preventDefault) e.preventDefault();
        
        if (rmIssues.length === 0) {
            if (target === "rm-issue") {
                navigate(`/production/p-memo/${workOrderItemId}`);
                return;
            }
            return toast.error("Please add at least one RM issue row.");
        }

        if (!date) {
            return toast.error("Date is missing. Please make sure P Memo specifications are loaded.");
        }

        if (!validateRmIssues()) {
            return;
        }

        try {
            setSaving(true);

            // Build cumulative list: previous chits' issues + current active form issues
            const previousIssues = submittedChits.flatMap(chit => 
                chit.rows.map(row => ({
                    lot: Number(chit.lot),
                    date: chit.date,
                    remark: row.remark,
                    material_id: Number(row.material_id),
                    grade: row.grade,
                    internal_batch_number: row.internal_batch_number,
                    grn_item_id: row.grn_item_id,
                    ma_item_id: row.ma_item_id,
                    rm_return_id: row.rm_return_id,
                    qty: Number(row.qty)
                }))
            );

            const intLot = Math.floor(Number(issueLot));
            const existingForLot = submittedChits.filter(c => Math.floor(Number(c.lot)) === intLot);
            const nextSuffix = (existingForLot.length + 1) * 0.0001;
            const uniqueLot = Number((intLot + nextSuffix).toFixed(4));

            const newIssues = rmIssues.map(item => ({
                lot: uniqueLot,
                date: issueDate,
                remark: item.remark,
                material_id: Number(item.material_id),
                grade: item.grade,
                internal_batch_number: item.internal_batch_number,
                grn_item_id: item.grn_item_id,
                ma_item_id: item.ma_item_id,
                rm_return_id: item.rm_return_id,
                qty: Number(item.qty)
            }));

            const combinedIssues = [...previousIssues, ...newIssues];

            await createPMemo({
                workOrderItemId: Number(workOrderItemId),
                date,
                rm_required: Number(rmRequired) || 0,
                rm_made: Number(rmMade) || 0,
                rm_to_be_made: Number(rmRequired - rmMade) || 0,
                loss_kg: Number(lossKg) || 0,
                loss_percent: Number(lossPercent) || 0,
                rm_return: Number(rmReturn) || 0,
                running_total_kg: Number(runningTotalKg) || 0,
                running_total_percent: Number(runningTotalPercent) || 0,
                running_total_nos: runningTotalNos === "" ? null : Number(runningTotalNos),
                is_final_submitted: 0, // Keep production memo unlocked
                rmIssues: combinedIssues
            });

            if (target === "final") {
                toast.success(`Chit for Lot ${intLot} issued successfully!`);
                // Append new chit to state
                setSubmittedChits(prev => [
                    ...prev,
                    {
                        lot: uniqueLot,
                        date: issueDate,
                        remark: rmIssues[0]?.remark || "",
                        rows: rmIssues.map(item => ({ ...item }))
                    }
                ]);
                // Reset form fields
                setRmIssues([]);
                setIssueLot("");
                setIssueDate(new Date().toISOString().split("T")[0]);
            } else {
                toast.success("Raw Material Issues updated successfully");
                navigate(`/production/p-memo/${workOrderItemId}`);
            }
        } catch (err) {
            console.error("Failed to save RM Issues:", err);
            toast.error(err?.response?.data?.message || "Failed to save RM Issues");
        } finally {
            setSaving(false);
        }
    };

    const grandTotalIssuedQty = rmIssues.reduce((sum, item) => sum + ((parseFloat(issueLot) || 0) * (parseFloat(item.qty) || 0)), 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#369ACF] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-slate-600 text-sm font-semibold">Loading Raw Material Issue...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="Raw Material Issue" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mx-auto space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Raw Material Issue
                            </h1>
                            <p className="text-xs text-slate-500 mt-1">
                                Issue raw materials for P Memo Number: <span className="font-mono font-bold text-slate-700">{pMemoNo ? `PM-${String(pMemoNo).padStart(4, "0")}` : "N/A"}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => navigate(`/production/p-memo/${workOrderItemId}`)}
                            className="text-[#369ACF] hover:text-[#032a52] font-semibold text-sm flex items-center gap-2 cursor-pointer"
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            Back to P Memo Details
                        </button>
                    </div>

                    {isFinalSubmitted && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <i className="fa-solid fa-lock text-amber-600 text-lg"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-amber-800 font-semibold">
                                        This Production Memo has been finally submitted. Editing and deleting items is locked.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Read-Only Header Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Item Name</span>
                            <span className="text-xs font-semibold text-slate-700">{materialName}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Machine</span>
                            <span className="text-xs font-semibold text-slate-700">{machineName}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">RM Formulation (Master)</span>
                            <span className="text-xs font-semibold text-slate-700">{rawMaterialName}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Qty (Required)</span>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block mt-0.5">{Number(rmRequired || 0).toFixed(3)} kg</span>
                        </div>
                    </div>                    <form onSubmit={(e) => handleSubmit(e, "rm-issue")} className="space-y-6">
                        {/* Raw Material Issue Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-list-ul text-[#369ACF] text-lg"></i>
                                    <h2 className="text-lg font-bold text-slate-800">Raw Material Issues List</h2>
                                </div>
                                {rmIssues.length === 0 && (
                                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                                        <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                                        No items added. Click "+ Add Row" below to log RM issues.
                                    </span>
                                )}
                            </div>

                            {/* Global Lot and Date Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Issue Lot
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={issueLot}
                                        onChange={(e) => handleLotChange(e.target.value)}
                                        disabled={isFinalSubmitted}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                        placeholder="Enter Lot quantity"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Issue Date
                                    </label>
                                    <DateInput
                                        value={issueDate}
                                        min={new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setIssueDate(e.target.value)}
                                        disabled={isFinalSubmitted}
                                        required
                                    />
                                </div>
                            </div>

                            {rmIssues.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-blue-900 border-b border-blue-800">
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap w-6">#</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap min-w-[150px]">Remark</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap min-w-[180px]">RM Type</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap min-w-[120px]">Grade</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap min-w-[150px]">I-Batch</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap min-w-[120px]">S-Batch</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap min-w-[90px]">MFI</th>
                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap min-w-[100px]">Qty (kg)</th>
                                                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap min-w-[110px]">Total Qty</th>
                                                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rmIssues.map((item, idx) => {
                                                const grades = rawMaterialsList
                                                    .filter(rm => rm.material_id === Number(item.material_id))
                                                    .map(rm => rm.grade);

                                                const totalQty = (parseFloat(issueLot) || 0) * (parseFloat(item.qty) || 0);

                                                return (
                                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                                        <td className="px-3 py-2.5">
                                                            <input
                                                                type="text"
                                                                value={item.remark}
                                                                onChange={(e) => handleRowChange(idx, "remark", e.target.value)}
                                                                readOnly={isFinalSubmitted}
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none font-medium disabled:bg-slate-50 disabled:text-slate-600"
                                                                placeholder="Remark"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <select
                                                                value={item.material_id}
                                                                onChange={(e) => handleRowChange(idx, "material_id", e.target.value)}
                                                                disabled={isFinalSubmitted}
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                                                                required
                                                            >
                                                                <option value="">— Select —</option>
                                                                {uniqueRmTypes.map(rm => (
                                                                    <option key={rm.material_id} value={rm.material_id}>
                                                                        {rm.material_name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <select
                                                                value={item.grade}
                                                                onChange={(e) => handleRowChange(idx, "grade", e.target.value)}
                                                                disabled={isFinalSubmitted || !item.material_id}
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                                                                required
                                                            >
                                                                <option value="">— Grade —</option>
                                                                {grades.map((grade, gIdx) => (
                                                                    <option key={gIdx} value={grade}>
                                                                        {grade}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="relative">
                                                                <select
                                                                    value={item.internal_batch_number}
                                                                    onChange={(e) => handleRowChange(idx, "internal_batch_number", e.target.value)}
                                                                    disabled={isFinalSubmitted || !item.material_id || !item.grade || item.loadingBatches}
                                                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                                                                    required
                                                                >
                                                                    {item.loadingBatches ? (
                                                                        <option value="">Loading...</option>
                                                                    ) : item.batches.length === 0 ? (
                                                                        <option value="">No stock</option>
                                                                    ) : (
                                                                        <>
                                                                            <option value="">— Batch —</option>
                                                                            {item.batches.map((batch, bIdx) => (
                                                                                <option key={bIdx} value={batch.internal_batch_number}>
                                                                                    {batch.internal_batch_number} ({Number(batch.available_qty).toFixed(3)} kg)
                                                                                </option>
                                                                            ))}
                                                                        </>
                                                                    )}
                                                                </select>
                                                                {item.material_id && item.grade && !item.loadingBatches && item.batches.length === 0 && (
                                                                    <span className="absolute -bottom-4 left-0.5 text-[9px] text-rose-500 font-semibold">
                                                                        Not Available in Stock
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <input
                                                                type="text"
                                                                value={item.supplier_batch_number}
                                                                readOnly
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 focus:outline-none font-medium"
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <input
                                                                type="text"
                                                                value={item.mfi}
                                                                readOnly
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 focus:outline-none font-medium"
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <input
                                                                type="number"
                                                                step="0.001"
                                                                min="0"
                                                                value={item.qty}
                                                                onChange={(e) => handleRowChange(idx, "qty", e.target.value)}
                                                                disabled={isFinalSubmitted || !item.internal_batch_number}
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                                                placeholder={item.available_qty ? `Max ${Number(item.available_qty).toFixed(3)}` : "Qty"}
                                                                required
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right font-bold text-slate-800 tabular-nums">
                                                            {totalQty.toFixed(3)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            {!isFinalSubmitted && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeItem(idx)}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 cursor-pointer transition-all mx-auto"
                                                                >
                                                                    <i className="fa-solid fa-xmark text-xs"></i>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Footer with Add Row and Grand Total */}
                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                                {!isFinalSubmitted ? (
                                    <button
                                        type="button"
                                        onClick={handleAddRow}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#369ACF] border border-[#369ACF]/20 bg-white rounded-xl hover:bg-[#369ACF]/5 cursor-pointer transition-all shadow-sm"
                                    >
                                        <i className="fa-solid fa-plus text-[10px]"></i> Add Row
                                    </button>
                                ) : (
                                    <div></div>
                                )}
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 font-semibold">Grand Total Issued Qty</span>
                                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                                        {grandTotalIssuedQty.toFixed(3)} kg
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="py-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate(`/production/p-memo/${workOrderItemId}`)}
                                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold bg-white hover:bg-slate-50 transition-colors cursor-pointer text-sm"
                            >
                                {isFinalSubmitted ? "Back" : "Cancel"}
                            </button>
                            {!isFinalSubmitted && (
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e, "final")}
                                    disabled={saving}
                                    className="px-6 py-2.5 rounded-lg bg-[#369ACF] text-white font-semibold hover:bg-[#032a52] transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2 cursor-pointer text-sm font-bold"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                                            Final Submission
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}



