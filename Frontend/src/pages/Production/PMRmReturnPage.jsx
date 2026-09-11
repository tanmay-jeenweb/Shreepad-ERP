import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getPMemoDetails } from "../../api/pmemoApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import { getLocations } from "../../api/locationApi";
import { createRmReturn } from "../../api/rmReturnApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

export default function PMRmReturnPage() {
    const { workOrderItemId } = useParams();
    const navigate = useNavigate();
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);

    const [pmemoId, setPmemoId] = useState(null);

    // Form inputs state
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
    const [workOrderNo, setWorkOrderNo] = useState("");
    const [selectedMaterialId, setSelectedMaterialId] = useState("");
    const [selectedLocationId, setSelectedLocationId] = useState("");
    const [quantity, setQuantity] = useState("");

    // Database master lists
    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                setLoadingData(true);
                const [pMemoRes, rmRes, locRes] = await Promise.all([
                    getPMemoDetails(workOrderItemId),
                    getRawMaterials(),
                    getLocations(false)    // Active only
                ]);

                const pMemoData = pMemoRes.data?.data;
                if (pMemoData) {
                    setPmemoId(pMemoData.id);
                    setWorkOrderNo(pMemoData.work_order_no);
                    setIsFinalSubmitted(false); // Keep return page unlocked
                } else {
                    toast.error("P Memo details not found.");
                }

                setRawMaterialsList(rmRes.data?.data || []);
                setLocations(locRes.data?.data || []);
            } catch (error) {
                console.error("Failed to load return page master data:", error);
                toast.error("Failed to load P Memo details, raw materials, or locations.");
            } finally {
                setLoadingData(false);
            }
        };

        if (workOrderItemId) {
            loadMasterData();
        }
    }, [workOrderItemId]);

    // Map selected material ID to raw material object
    const selectedMaterial = useMemo(() => {
        if (!selectedMaterialId) return null;
        return rawMaterialsList.find(
            rm => String(rm.material_id) === String(selectedMaterialId)
        ) || null;
    }, [selectedMaterialId, rawMaterialsList]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isFinalSubmitted) {
            return toast.error("This Production Memo has been finally submitted. Recording new raw material returns is locked.");
        }

        // Standard validation
        if (!selectedMaterialId) {
            return toast.error("Please select a Material Name.");
        }
        if (!selectedLocationId) {
            return toast.error("Please select a Location.");
        }
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            return toast.error("Please enter a valid return quantity greater than 0 kg.");
        }
        if (!selectedMaterial) {
            return toast.error("Matching raw material details not found in database.");
        }

        try {
            setSaving(true);
            await createRmReturn({
                pmemo_id: pmemoId,
                return_date: returnDate,
                material_id: selectedMaterial.material_id,
                location_id: Number(selectedLocationId),
                quantity: qty
            });

            toast.success("Raw Material Return recorded successfully!");
            // Reset form fields to allow consecutive submissions
            setSelectedMaterialId("");
            setSelectedLocationId("");
            setQuantity("");
            setReturnDate(new Date().toISOString().split("T")[0]);
        } catch (error) {
            console.error("RM Return Submission Error:", error);
            toast.error(error.response?.data?.message || "Failed to record RM Return.");
        } finally {
            setSaving(false);
        }
    };

    if (loadingData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#369ACF] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-slate-600 text-sm font-semibold">Loading Raw Material Return options...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="Raw Material Return" />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Raw Material Return</h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Register raw material returns from the production floor back into the stock book.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate(`/production/p-memo/${workOrderItemId}`)}
                        className="text-[#369ACF] hover:text-[#032a52] font-semibold text-sm flex items-center gap-2 cursor-pointer border-none bg-transparent"
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
                                    This Production Memo has been finally submitted. Recording new raw material returns is locked.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Return Form Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 w-full">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <i className="fa-solid fa-arrow-rotate-left text-[#369ACF] text-lg"></i>
                        <h2 className="text-base font-bold text-slate-800">Record Return Receipt</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Return Date */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Return Date *
                                </label>
                                <DateInput
                                    required
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    disabled={isFinalSubmitted}
                                />
                            </div>

                            {/* Work Order */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Work Order
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value={workOrderNo ? `WO-${String(workOrderNo).padStart(4, '0')}` : "—"}
                                    className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500 outline-none cursor-not-allowed font-semibold"
                                />
                            </div>

                            {/* RM Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    RM Name *
                                </label>
                                <select
                                    required
                                    value={selectedMaterialId}
                                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                                    disabled={isFinalSubmitted}
                                    className="h-10 px-3 border border-slate-355 rounded-lg text-sm bg-white text-slate-800 outline-none focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/10 transition-all cursor-pointer font-semibold disabled:bg-slate-50 disabled:text-slate-400"
                                >
                                    <option value="">— Select Material —</option>
                                    {rawMaterialsList.map(rm => (
                                        <option key={rm.material_id} value={rm.material_id}>
                                            {rm.material_name}{rm.material_code ? ` (${rm.material_code})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Location */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Location *
                                </label>
                                <select
                                    required
                                    value={selectedLocationId}
                                    onChange={(e) => setSelectedLocationId(e.target.value)}
                                    disabled={isFinalSubmitted}
                                    className="h-10 px-3 border border-slate-355 rounded-lg text-sm bg-white text-slate-800 outline-none focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/10 transition-all cursor-pointer font-semibold disabled:bg-slate-50 disabled:text-slate-400"
                                >
                                    <option value="">— Select Location —</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.location_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* RM kg */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    RM kg *
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    required
                                    min="0.0001"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    disabled={isFinalSubmitted}
                                    placeholder="Enter quantity in kg"
                                    className="h-10 px-3 border border-slate-355 rounded-lg text-sm bg-white text-slate-800 outline-none focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/10 transition-all font-semibold disabled:bg-slate-50 disabled:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => navigate(`/production/p-memo/${workOrderItemId}`)}
                                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold bg-white hover:bg-slate-50 transition-colors cursor-pointer text-sm"
                            >
                                {isFinalSubmitted ? "Back" : "Cancel"}
                            </button>
                            {!isFinalSubmitted && (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 rounded-lg bg-[#369ACF] hover:bg-[#032a52] text-white font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-check"></i>
                                            Final Submission
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
