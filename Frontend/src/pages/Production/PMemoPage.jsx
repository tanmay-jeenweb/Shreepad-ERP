import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getPMemoDetails, createPMemo, getAvailableBatches } from "../../api/pmemoApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

export default function PMemoPage() {
    const { workOrderItemId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // P Memo Header states
    const [pMemoNo, setPMemoNo] = useState("");
    const [date, setDate] = useState("");
    const [machineName, setMachineName] = useState("");
    const [materialName, setMaterialName] = useState("");
    const [rawMaterialName, setRawMaterialName] = useState("");
    const [unitWeight, setUnitWeight] = useState("");
    const [color, setColor] = useState("");
    const [batch, setBatch] = useState("");
    const [mouldCavity, setMouldCavity] = useState("");
    const [productionQuantity, setProductionQuantity] = useState("");

    // P Memo RM and Loss details states
    const [rmRequired, setRmRequired] = useState(0);
    const [rmMade, setRmMade] = useState(0);
    const [rmToBeMade, setRmToBeMade] = useState(0);
    const [lossKg, setLossKg] = useState(0);
    const [lossPercent, setLossPercent] = useState(0);
    const [rmReturn, setRmReturn] = useState(0);
    const [runningTotalKg, setRunningTotalKg] = useState(0);
    const [runningTotalPercent, setRunningTotalPercent] = useState(0);
    const [runningTotalNos, setRunningTotalNos] = useState("");

    // Flag indicating if it's already created
    const [isEditMode, setIsEditMode] = useState(false);
    const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);

    // RM Issue Module States
    const [mainRmFormulation, setMainRmFormulation] = useState("");
    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [rmIssues, setRmIssues] = useState([]);
    const [itemCode, setItemCode] = useState("");
    const [submittedChits, setSubmittedChits] = useState([]);
    const [submittedReturnChits, setSubmittedReturnChits] = useState([]);

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
    };

    const handlePrint = (lotId) => {
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

                    setIsFinalSubmitted(Number(data.is_final_submitted) === 1);

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

                    // Initialize global Lot and Date from existing issues if present
                    if (data.rmIssues && data.rmIssues.length > 0) {
                        const firstIssue = data.rmIssues[0];
                        setIssueLot(firstIssue.lot || "");
                        setIssueDate(firstIssue.date ? new Date(firstIssue.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
                    } else {
                        setIssueLot("");
                        setIssueDate(new Date().toISOString().split("T")[0]);
                    }

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
                    setSubmittedReturnChits(data.rmReturns || []);

                    // Load saved RM issues
                    const loadedIssues = (data.rmIssues || []).map(issue => ({
                        remark: issue.remark || "",
                        material_id: issue.material_id || "",
                        grade: issue.grade || "",
                        internal_batch_number: issue.internal_batch_number || "",
                        grn_item_id: issue.grn_item_id || null,
                        ma_item_id: issue.ma_item_id || null,
                        qty: issue.qty || "",
                        available_qty: Number(issue.total_quantity) || 0,
                        mfi: issue.mfi || "",
                        supplier_batch_number: issue.supplier_batch_number || "",
                        batches: [{
                            internal_batch_number: issue.internal_batch_number,
                            available_qty: Number(issue.total_quantity),
                            grn_item_id: issue.grn_item_id,
                            ma_item_id: issue.ma_item_id,
                            mfi: issue.mfi || "",
                            supplier_batch_number: issue.supplier_batch_number || ""
                        }],
                        loadingBatches: false
                    }));
                    setRmIssues(loadedIssues);
                }
                if (rmRes.data?.success) {
                    setRawMaterialsList(rmRes.data.data || []);
                }
            } catch (err) {
                console.error("Failed to load P Memo details:", err);
                toast.error("Failed to load P Memo details");
                navigate("/production/production-planning");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [workOrderItemId, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isFinalSubmitted) {
            return toast.error("This Production Memo has been finally submitted and cannot be modified.");
        }
        if (!date) {
            return toast.error("Please enter a valid Date.");
        }

        try {
            setSaving(true);
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
                is_final_submitted: isFinalSubmitted ? 1 : 0,
                rmIssues: rmIssues.map(item => ({
                    lot: Number(issueLot) || 0,
                    date: issueDate,
                    remark: item.remark,
                    material_id: Number(item.material_id),
                    grade: item.grade,
                    internal_batch_number: item.internal_batch_number,
                    grn_item_id: item.grn_item_id,
                    ma_item_id: item.ma_item_id,
                    qty: Number(item.qty)
                }))
            });
            toast.success(isEditMode ? "P Memo updated successfully" : "P Memo created successfully");
            navigate("/production/production-planning");
        } catch (err) {
            console.error("Failed to save P Memo:", err);
            toast.error(err?.response?.data?.message || "Failed to save P Memo");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#369ACF] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-slate-600 text-sm font-semibold">Loading Production Memo...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="Production Memo (P Memo)" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mx-auto space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {isEditMode ? "View/Edit Production Memo" : "Create Production Memo"}
                            </h1>
                        </div>
                        <button
                            onClick={() => navigate("/production/production-planning")}
                            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-2 cursor-pointer font-semibold"
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            Back to Planning
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
                                        This Production Memo has been finally submitted. Editing specifications and raw material issues is locked.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Production Memo Specifications Form */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <i className="fa-solid fa-circle-info text-[#369ACF] text-lg"></i>
                                <h2 className="text-lg font-bold text-slate-800">Production Memo Specifications</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                                {/* Date Field (Editable) */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Date
                                    </label>
                                    <DateInput
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        disabled={isFinalSubmitted}
                                        required
                                    />
                                </div>

                                {/* P Memo Number (Read-only) */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        P Memo Number
                                    </label>
                                    <div className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-slate-50 font-mono font-bold">
                                        {pMemoNo ? `PM-${String(pMemoNo).padStart(4, "0")}` : "N/A"}
                                    </div>
                                </div>

                                {/* Machine Name */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Machine Name
                                    </label>
                                    <input
                                        type="text"
                                        value={machineName}
                                        readOnly
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 bg-slate-50 focus:outline-none font-medium"
                                    />
                                </div>

                                {/* Material Name */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Material Name
                                    </label>
                                    <input
                                        type="text"
                                        value={materialName}
                                        readOnly
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 bg-slate-50 focus:outline-none font-medium"
                                    />
                                </div>

                                {/* RM Type */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        RM Type
                                    </label>
                                    <input
                                        type="text"
                                        value={rawMaterialName}
                                        readOnly
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 bg-slate-50 focus:outline-none font-medium"
                                    />
                                </div>

                                {/* Unit Weight */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Unit Weight
                                    </label>
                                    <input
                                        type="text"
                                        value={unitWeight !== "—" ? `${unitWeight} kg` : "—"}
                                        readOnly
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 bg-slate-50 focus:outline-none font-medium"
                                    />
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Color
                                    </label>
                                    <input
                                        type="text"
                                        value={color}
                                        readOnly
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 bg-slate-50 focus:outline-none font-medium"
                                    />
                                </div>

                                {/* Batch */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Batch
                                    </label>
                                    <input
                                        type="text"
                                        value={batch}
                                        readOnly
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 bg-slate-50 focus:outline-none font-medium"
                                    />
                                </div>

                                {/* Mould Cavity */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Mould Cavity
                                    </label>
                                    <input
                                        type="text"
                                        value={mouldCavity}
                                        readOnly
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 bg-slate-50 focus:outline-none font-medium"
                                    />
                                </div>

                                {/* Production Quantity */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Production Quantity
                                    </label>
                                    <input
                                        type="text"
                                        value={productionQuantity}
                                        readOnly
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 bg-slate-50 focus:outline-none font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Raw Material Formulation Details Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-flask text-[#369ACF] text-lg"></i>
                                    <h2 className="text-lg font-bold text-slate-800">Raw Material Formulation</h2>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-slate-200 rounded-lg text-sm text-slate-800">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200">
                                            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-xs w-1/3">
                                                Parameter
                                            </th>
                                            <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider text-xs">
                                                Value
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {/* 1. RM Required (kg) */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50/50">
                                                1. RM Required (kg)
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 w-full sm:w-64">
                                                    {Number(rmRequired || 0).toFixed(3)}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* 2. RM Made (kg) */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50/50">
                                                2. RM Made (kg)
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    min="0"
                                                    value={rmMade || ""}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setRmMade(val);
                                                    }}
                                                    disabled={isFinalSubmitted}
                                                    className="w-full sm:w-64 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white disabled:bg-slate-50 disabled:text-slate-400 font-semibold"
                                                    placeholder="Enter weight..."
                                                />
                                            </td>
                                        </tr>

                                        {/* 3. RM To be Made (kg) */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50/50">
                                                3. RM To be Made (kg)
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-rose-600 bg-slate-50 w-full sm:w-64">
                                                    {Number(rmRequired - rmMade).toFixed(3)}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* 4. Loss (kg) Loss (%) */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50/50">
                                                4. Loss
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            min="0"
                                                            value={lossKg || ""}
                                                            onChange={(e) => setLossKg(parseFloat(e.target.value) || 0)}
                                                            disabled={isFinalSubmitted}
                                                            className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white disabled:bg-slate-50 disabled:text-slate-400 font-semibold"
                                                            placeholder="Loss kg"
                                                        />
                                                        <span className="text-xs text-slate-500 font-semibold">kg</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max="100"
                                                            value={lossPercent || ""}
                                                            onChange={(e) => setLossPercent(parseFloat(e.target.value) || 0)}
                                                            disabled={isFinalSubmitted}
                                                            className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white disabled:bg-slate-50 disabled:text-slate-400 font-semibold"
                                                            placeholder="Loss %"
                                                        />
                                                        <span className="text-xs text-slate-500 font-semibold">%</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* 5. RM Return (kg) */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50/50">
                                                5. RM Return (kg)
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    min="0"
                                                    value={rmReturn || ""}
                                                    onChange={(e) => setRmReturn(parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalSubmitted}
                                                    className="w-full sm:w-64 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white disabled:bg-slate-50 disabled:text-slate-400 font-semibold"
                                                    placeholder="Enter return..."
                                                />
                                            </td>
                                        </tr>

                                        {/* 6. Running total Production (kg) = <input text> Nos */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50/50">
                                                6. Running total Production (kg)
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 w-28 text-center">
                                                        {Number(runningTotalKg || 0).toFixed(3)} kg
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-500">=</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            min="0"
                                                            value={runningTotalNos || ""}
                                                            onChange={(e) => {
                                                                const val = e.target.value === "" ? "" : (parseInt(e.target.value) || 0);
                                                                setRunningTotalNos(val);
                                                                const uWeight = parseFloat(unitWeight) || 0;
                                                                if (val === "") {
                                                                    setRunningTotalKg(0);
                                                                } else {
                                                                    setRunningTotalKg(Number((val * uWeight).toFixed(3)));
                                                                }
                                                            }}
                                                            disabled={isFinalSubmitted}
                                                            className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white disabled:bg-slate-50 disabled:text-slate-400 font-semibold"
                                                            placeholder="Enter Nos..."
                                                        />
                                                        <span className="text-xs text-slate-500 font-semibold">Nos</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(`/production/p-memo/${workOrderItemId}/rm-issue`)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-md font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm cursor-pointer"
                            >
                                <i className="fa-solid fa-arrow-up-from-bracket"></i>
                                Raw Material Issues {submittedChits.length > 0 ? `(${submittedChits.reduce((sum, chit) => sum + chit.rows.length, 0)})` : (rmIssues.length > 0 ? `(${rmIssues.length})` : "")}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(`/production/p-memo/${workOrderItemId}/rm-return`)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-md font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm cursor-pointer"
                            >
                                <i className="fa-solid fa-arrow-rotate-left"></i>
                                Raw Material Returns
                            </button>
                        </div>

                        {/* CSS for print mode */}
                        <style>{`
                            @media print {
                                body.printing-mode {
                                    background: white !important;
                                }
                                body.printing-mode * {
                                    visibility: hidden !important;
                                }
                                body.printing-mode .print-active,
                                body.printing-mode .print-active * {
                                    visibility: visible !important;
                                }
                                body.printing-mode .print-active {
                                    position: absolute !important;
                                    left: 0 !important;
                                    top: 0 !important;
                                    width: 100% !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                    padding: 0 !important;
                                    margin: 0 !important;
                                    display: block !important;
                                }
                                /* Prevent parent divs from clipping the printed element */
                                body.printing-mode div {
                                    overflow: visible !important;
                                    height: auto !important;
                                    max-height: none !important;
                                }
                                body.printing-mode .no-print {
                                    display: none !important;
                                }
                            }
                        `}</style>

                        {/* Submitted Chits Section (rendered below formulation section buttons) */}
                        {submittedChits.length > 0 && (
                            <div className="space-y-4 no-print mt-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                    <i className="fa-solid fa-receipt text-[#369ACF] text-base"></i>
                                    <h3 className="text-sm font-bold text-slate-800">Issued Raw Material Chit Labels ({submittedChits.length})</h3>
                                </div>
                                <div className="space-y-6">
                                    {submittedChits.map((chit, idx) => (
                                        <RmIssueChit
                                            key={idx}
                                            chit={chit}
                                            rawMaterialsList={rawMaterialsList}
                                            materialName={materialName}
                                            machineName={machineName}
                                            itemCode={itemCode}
                                            color={color}
                                            batch={batch}
                                            pMemoNo={pMemoNo}
                                            onPrint={handlePrint}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submitted Return Chits Section */}
                        {submittedReturnChits.length > 0 && (
                            <div className="space-y-4 no-print mt-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                    <i className="fa-solid fa-arrow-rotate-left text-[#369ACF] text-base"></i>
                                    <h3 className="text-sm font-bold text-slate-800">Returned Raw Material Chit Labels ({submittedReturnChits.length})</h3>
                                </div>
                                <div className="space-y-6">
                                    {submittedReturnChits.map((chit, idx) => (
                                        <RmReturnChit
                                            key={idx}
                                            chit={chit}
                                            onPrint={handlePrint}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="py-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate("/production/production-planning")}
                                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold bg-white hover:bg-slate-50 transition-colors cursor-pointer text-sm"
                            >
                                Cancel
                            </button>
                            {!isFinalSubmitted && (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 rounded-lg bg-[#369ACF] text-white font-semibold hover:bg-[#032a52] transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2 cursor-pointer text-sm"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-check"></i>
                                            {isEditMode ? "Update P Memo" : "Submit P Memo"}
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

function RmIssueChit({ chit, rawMaterialsList, materialName, machineName, itemCode, color, batch, pMemoNo, onPrint }) {
    // Helper to get raw material name by id
    const getRmName = (id) => {
        const found = rawMaterialsList.find(r => r.id === Number(id) || r.material_id === Number(id));
        return found ? found.material_name : "—";
    };

    // Calculate total quantities
    const totalQty = chit.rows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);
    const totalTotalRequired = chit.rows.reduce((sum, row) => {
        const lotVal = Math.floor(parseFloat(chit.lot) || 0);
        const qtyVal = parseFloat(row.qty) || 0;
        return sum + (lotVal * qtyVal);
    }, 0);

    return (
        <div id={`chit-${chit.lot}`} className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm mx-auto my-4 text-xs font-sans text-slate-800 relative hover:border-slate-400 transition-all">
            {/* Print button on top right of the card, hidden during print */}

            <div className="w-full border border-slate-400 rounded overflow-hidden">
                {/* Title */}
                <div className="border-b border-slate-400 text-center py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-100/80 text-slate-700">
                    Raw Material Issue CHIT Label
                </div>

                {/* Header Grid */}
                <div className="grid grid-cols-12 border-b border-slate-400">
                    {/* Item Name */}
                    <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">Item Name</div>
                    <div className="col-span-3 border-r border-slate-400 p-2 font-semibold text-slate-800">{materialName}</div>

                    {/* Machine Name */}
                    <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">Machine Name.</div>
                    <div className="col-span-3 p-2 font-semibold text-slate-800">{machineName}</div>
                </div>

                <div className="grid grid-cols-12 border-b border-slate-400">
                    {/* M/C No. */}
                    <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">M/C No.</div>
                    <div className="col-span-3 border-r border-slate-400 p-2 font-semibold text-slate-800">
                        {machineName?.split('&')?.[1]?.trim() || machineName || "—"}
                    </div>

                    {/* Item Code */}
                    <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">Item Code</div>
                    <div className="col-span-3 p-2 font-mono font-semibold text-slate-800">{itemCode}</div>
                </div>

                <div className="grid grid-cols-12 border-b border-slate-400">
                    {/* Date */}
                    <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">Date:</div>
                    <div className="col-span-3 border-r border-slate-400 p-2 font-semibold text-slate-800">{chit.date}</div>

                    {/* Batch No */}
                    <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">Batch No.</div>
                    <div className="col-span-3 p-2 font-mono font-semibold text-slate-800">{batch}</div>
                </div>

                <div className="grid grid-cols-12 border-b border-slate-400">
                    {/* Material Name / Colour */}
                    {/* <div className="col-span-6 border-r border-slate-400 p-2 bg-slate-50/50 font-semibold text-slate-700">
                        Material Name/COLOUR: <span className="font-bold text-slate-800 ml-1.5">{color}</span>
                    </div> */}
                    <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">Material Colour:</div>
                    <div className="col-span-3 border-r border-slate-400 p-2 font-mono font-semibold text-slate-800">{color}</div>
                    {/* RM Issue Sheet No. */}
                    <div className="col-span-3 border-r border-slate-400 p-2 font-bold bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">RM Issue Sheet No.</div>
                    <div className="col-span-3 p-2 font-mono font-semibold text-slate-800">
                        {pMemoNo ? `PM-${String(pMemoNo).padStart(4, "0")}` : "—"}
                    </div>
                </div>

                <div className="grid grid-cols-12 border-b border-slate-400 bg-slate-100/50">
                    <div className="col-span-6 border-r border-slate-400 p-2 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Material Specifications</div>
                    <div className="col-span-6 p-2 font-bold text-slate-700 text-center">Lot No: <span className="text-rose-600 font-extrabold text-sm ml-1.5">{Math.floor(Number(chit.lot))}</span></div>
                </div>

                {/* Table Header */}
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-400 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">
                            <th className="border-r border-slate-400 p-2 w-20">Qty/kg</th>
                            <th className="border-r border-slate-400 p-2 w-24">Total/kg</th>
                            <th className="border-r border-slate-400 p-2 min-w-[120px]">RM Type</th>
                            <th className="border-r border-slate-400 p-2 min-w-[150px]">Grade</th>
                            <th className="border-r border-slate-400 p-2 min-w-[120px]">S Batch</th>
                            <th className="border-r border-slate-400 p-2 min-w-[120px]">I Batch</th>
                            <th className="p-2 w-16">MFI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chit.rows.map((row, rIdx) => {
                            const totalRequired = Math.floor(parseFloat(chit.lot) || 0) * (parseFloat(row.qty) || 0);
                            return (
                                <tr key={rIdx} className="border-b border-slate-300 hover:bg-slate-50/50 text-slate-700">
                                    <td className="border-r border-slate-400 p-2 font-medium bg-emerald-50/20">{Number(row.qty).toFixed(3)}</td>
                                    <td className="border-r border-slate-400 p-2 font-bold bg-amber-50/20">{totalRequired.toFixed(3)}</td>
                                    <td className="border-r border-slate-400 p-2 font-bold text-slate-800">{getRmName(row.material_id)}</td>
                                    <td className="border-r border-slate-400 p-2 font-medium">{row.grade}</td>
                                    <td className="border-r border-slate-400 p-2 font-mono text-[11px]">{row.supplier_batch_number || "—"}</td>
                                    <td className="border-r border-slate-400 p-2 font-mono text-[11px] font-semibold text-slate-800">{row.internal_batch_number}</td>
                                    <td className="p-2 font-mono">{row.mfi || "0.00"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-400">
                            <td className="border-r border-slate-400 p-2 bg-emerald-50/30">{totalQty.toFixed(3)}</td>
                            <td className="border-r border-slate-400 p-2 bg-amber-50/30">{totalTotalRequired.toFixed(3)}</td>
                            <td colSpan="5" className="p-2 text-left uppercase tracking-wider text-[10px] text-slate-500 font-bold">
                                Total Quantity
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Centered Print Button at the bottom of the chit, green background */}
            <div className="flex justify-center mt-4 no-print">
                <button
                    type="button"
                    onClick={() => onPrint(chit.lot)}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer text-xs border-none"
                >
                    <i className="fa-solid fa-print"></i> Print Chit Label
                </button>
            </div>
        </div>
    );
}

function RmReturnChit({ chit, onPrint }) {
    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    return (
        <div id={`chit-${chit.return_no}`} className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm mx-auto my-4 text-xs font-sans text-slate-800 relative hover:border-slate-400 transition-all">
            <div className="w-full text-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wider">RM Return</h2>
            </div>

            <div className="w-full border border-slate-400 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-400 font-semibold text-slate-700">
                            <th className="border-r border-slate-400 p-2">Date</th>
                            <th className="border-r border-slate-400 p-2">Party</th>
                            <th className="border-r border-slate-400 p-2">RM Type</th>
                            <th className="border-r border-slate-400 p-2">Grade</th>
                            <th className="border-r border-slate-400 p-2">Location</th>
                            <th className="border-r border-slate-400 p-2">Ibatch</th>
                            <th className="p-2">kg</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="text-slate-800">
                            <td className="border-r border-slate-400 p-2">{formatDate(chit.return_date)}</td>
                            <td className="border-r border-slate-400 p-2 font-bold">{chit.job_party_name || "—"}</td>
                            <td className="border-r border-slate-400 p-2 font-bold">{chit.material_name || "—"}</td>
                            <td className="border-r border-slate-400 p-2 font-medium">{chit.grade || "—"}</td>
                            <td className="border-r border-slate-400 p-2 font-medium">{chit.location_name || "—"}</td>
                            <td className="border-r border-slate-400 p-2 font-mono font-semibold">{chit.internal_batch_number || "—"}</td>
                            <td className="p-2 font-bold text-slate-850">{Number(chit.quantity).toFixed(3)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Centered Print Button at the bottom of the chit, green background */}
            <div className="flex justify-center mt-4 no-print">
                <button
                    type="button"
                    onClick={() => onPrint(chit.return_no)}
                    className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-sm transition-all cursor-pointer text-xs border-none"
                >
                    Print
                </button>
            </div>
        </div>
    );
}
