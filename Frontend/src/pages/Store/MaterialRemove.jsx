import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getActiveBatches, removeMaterialStock } from "../../api/stockBookApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

export default function MaterialRemove() {
    const navigate = useNavigate();                 

    // Data fetching states
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(true);

    // Form states
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedBatchNumber, setSelectedBatchNumber] = useState("");
    const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
    const [removalQuantity, setRemovalQuantity] = useState("");
    const [removalType, setRemovalType] = useState("reject");
    const [remarks, setRemarks] = useState("");
    const [saving, setSaving] = useState(false);

    // Fetch active batches with stock > 0
    useEffect(() => {
        const fetchActiveBatches = async () => {
            try {
                const res = await getActiveBatches();
                setBatches(res.data?.data || []);
            } catch (err) {
                console.error("Failed to fetch active batches:", err);
                toast.error("Failed to load active batch list.");
            } finally {
                setLoadingBatches(false);
            }
        };
        fetchActiveBatches();
    }, []);

    // Handle batch selection changes to autofill details
    const handleBatchChange = (e) => {
        const batchNumber = e.target.value;
        setSelectedBatchNumber(batchNumber);

        if (!batchNumber) {
            setSelectedBatchDetails(null);
            return;
        }

        const batch = batches.find(b => String(b.internal_batch_number) === String(batchNumber));
        if (batch) {
            setSelectedBatchDetails({
                grn_item_id: batch.grn_item_id || null,
                ma_item_id: batch.ma_item_id || null,
                job_party_name: batch.job_party_name || "—",
                material_type: batch.material_type || "—",
                grade: batch.grade || "—",
                balance_quantity: parseFloat(batch.balance_quantity || 0)
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedBatchNumber || !selectedBatchDetails) {
            toast.error("Please select an internal batch number.");
            return;
        }

        if (!date) {
            toast.error("Please select a date.");
            return;
        }

        const qty = parseFloat(removalQuantity);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Please enter a valid removal quantity greater than zero.");
            return;
        }

        if (qty > selectedBatchDetails.balance_quantity) {
            toast.error(`Insufficient stock! Cannot remove more than the available balance of ${selectedBatchDetails.balance_quantity}.`);
            return;
        }

        setSaving(true);
        try {
            const payload = {
                grn_item_id: selectedBatchDetails.grn_item_id ? Number(selectedBatchDetails.grn_item_id) : null,
                ma_item_id: selectedBatchDetails.ma_item_id ? Number(selectedBatchDetails.ma_item_id) : null,
                removal_quantity: qty,
                removal_type: removalType,
                date,
                remarks
            };

            await removeMaterialStock(payload);
            toast.success("Material removed and stock book updated successfully!");
            navigate(selectedBatchDetails?.material_type === "Raw Materials" ? "/purchase/rm-stock-book" : "/purchase/general-stock-book");
        } catch (err) {
            console.error("Failed to remove material stock:", err);
            const errMsg = err.response?.data?.message || "Failed to log material removal.";
            toast.error(errMsg);
        } finally {
            setSaving(false);
        }
    };

    const inputCls =
        "w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-sm bg-slate-50 transition-colors duration-150";
    const readonlyInputCls =
        "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed";
    const labelCls = "block text-sm font-semibold text-slate-700 mb-2";

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
            <Navbar title="Material Removal Form" />

            <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between w-full">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Remove Material Stock</h1>
                        <p className="text-slate-500 mt-1">Deduct stock balance from a specific internal batch number.</p>
                    </div>
                    <button
                        onClick={() => navigate(selectedBatchDetails?.material_type === "Raw Materials" ? "/purchase/rm-stock-book" : "/purchase/general-stock-book")}
                        className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        Back to Stock Book
                    </button>
                </div>

                <div className="w-full pb-20">
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">Removal Details</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Date and Batch Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Date */}
                                <div className="space-y-1">
                                    <label className={labelCls}>
                                        Removal Date <span className="text-rose-500">*</span>
                                    </label>
                                    <DateInput
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Internal Batch Number Dropdown */}
                                <div className="space-y-1">
                                    <label className={labelCls}>
                                        Internal Batch Number <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={selectedBatchNumber}
                                        onChange={handleBatchChange}
                                        disabled={loadingBatches}
                                        className={inputCls}
                                        required
                                    >
                                        <option value="">
                                            {loadingBatches ? "Loading batches..." : "— Select Batch —"}
                                        </option>
                                        {batches.map((b) => (
                                            <option key={b.internal_batch_number} value={b.internal_batch_number}>
                                                {b.internal_batch_number} ({b.product})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Autofilled Fields Section */}
                            <div className="p-5 bg-slate-50/60 rounded-2xl border border-slate-150 space-y-6">
                                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">
                                    Selected Batch Details (Autofilled)
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Job Of Party Name */}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Job Of Party Name
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedBatchDetails?.job_party_name || ""}
                                            readOnly
                                            className={readonlyInputCls}
                                            placeholder="—"
                                        />
                                    </div>

                                    {/* Type */}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Material Type
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedBatchDetails?.material_type || ""}
                                            readOnly
                                            className={readonlyInputCls}
                                            placeholder="—"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Grade */}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Grade {selectedBatchDetails?.material_type === "Raw Materials" && <span className="text-indigo-600 font-bold">(RM)</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedBatchDetails?.grade || ""}
                                            readOnly
                                            className={readonlyInputCls}
                                            placeholder="—"
                                        />
                                    </div>

                                    {/* Stock */}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Current Stock (Available Qty)
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedBatchDetails ? `${selectedBatchDetails.balance_quantity}` : ""}
                                            readOnly
                                            className={`${readonlyInputCls} ${selectedBatchDetails ? "font-bold text-[#369ACF] bg-indigo-50/50 border-indigo-100" : ""}`}
                                            placeholder="—"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Quantity to remove, type, and remark */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Quantity to Remove */}
                                <div className="space-y-1">
                                    <label className={labelCls}>
                                        Quantity to Remove <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        min="0.0001"
                                        max={selectedBatchDetails?.balance_quantity || ""}
                                        value={removalQuantity}
                                        onChange={(e) => setRemovalQuantity(e.target.value)}
                                        placeholder={selectedBatchDetails ? `Max ${selectedBatchDetails.balance_quantity}` : "Enter quantity"}
                                        className={inputCls}
                                        required
                                    />
                                </div>

                                {/* Removal Type */}
                                <div className="space-y-1">
                                    <label className={labelCls}>
                                        Removal Type <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={removalType}
                                        onChange={(e) => setRemovalType(e.target.value)}
                                        className={inputCls}
                                        required
                                    >
                                        <option value="reject">Reject</option>
                                        <option value="sell">Sell</option>
                                        <option value="loan">Loan</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Remarks */}
                            <div className="space-y-1">
                                <label className={labelCls}>Remark</label>
                                <textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    rows={3}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Enter reason or additional comments..."
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => navigate(selectedBatchDetails?.material_type === "Raw Materials" ? "/purchase/rm-stock-book" : "/purchase/general-stock-book")}
                                    className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || loadingBatches || !selectedBatchNumber}
                                    className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
                                >
                                    {saving ? "Removing..." : "Submit Removal"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
