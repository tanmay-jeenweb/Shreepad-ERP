import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DateInput from "../../components/DateInput";
import toast from "react-hot-toast";
import { getAvailableStockBatches, createDispatch } from "../../api/dispatchApi";

export default function CreateDispatch() {
    const navigate = useNavigate();

    // Data fetching
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Form states
    const [selectedBatchNumber, setSelectedBatchNumber] = useState("");
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
    const [quantity, setQuantity] = useState("");
    const [packingMethod, setPackingMethod] = useState("");
    const [partyName, setPartyName] = useState("");
    const [vehicleNo, setVehicleNo] = useState("");
    const [remarks, setRemarks] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Searchable dropdown states
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    // Auto-focus search input when dropdown opens
    useEffect(() => {
        if (isDropdownOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isDropdownOpen]);

    useEffect(() => {
        const fetchBatches = async () => {
            setLoadingBatches(true);
            try {
                const res = await getAvailableStockBatches();
                setBatches(res.data?.data || []);
            } catch (err) {
                console.error("Failed to load available batches:", err);
                toast.error("Failed to load available stock status batches");
            } finally {
                setLoadingBatches(false);
            }
        };
        fetchBatches();
    }, []);

    const handleBatchSelect = (batchNumber) => {
        setSelectedBatchNumber(batchNumber);
        if (!batchNumber) {
            setSelectedBatch(null);
            setPartyName("");
            return;
        }

        const found = batches.find(b => String(b.internal_batch_number) === String(batchNumber));
        if (found) {
            setSelectedBatch(found);
            if (found.party) {
                setPartyName(found.party);
            }
        }
    };

    const availableQty = selectedBatch ? parseFloat(selectedBatch.available_quantity || 0) : 0;
    const enteredQty = parseFloat(quantity || 0);
    const remainingAfterDispatch = selectedBatch ? Math.max(0, availableQty - (isNaN(enteredQty) ? 0 : enteredQty)) : 0;

    const filteredBatches = batches.filter(b => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            (b.material_name && b.material_name.toLowerCase().includes(term)) ||
            (b.internal_batch_number && b.internal_batch_number.toLowerCase().includes(term)) ||
            (b.material_type && b.material_type.toLowerCase().includes(term)) ||
            (b.party && b.party.toLowerCase().includes(term))
        );
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedBatch) {
            toast.error("Please select a material from Stock Status.");
            return;
        }

        if (isNaN(enteredQty) || enteredQty <= 0) {
            toast.error("Please enter a valid dispatch quantity greater than 0.");
            return;
        }

        if (enteredQty > availableQty) {
            toast.error(`Cannot dispatch ${enteredQty}! Only ${availableQty} ${selectedBatch.unit} available.`);
            return;
        }

        if (!packingMethod.trim()) {
            toast.error("Please enter a packing method.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                stock_status_id: selectedBatch.stock_status_id,
                material_id: selectedBatch.material_id,
                internal_batch_number: selectedBatch.internal_batch_number,
                quantity: enteredQty,
                packing_method: packingMethod.trim(),
                dispatch_date: dispatchDate,
                party_name: partyName.trim() || null,
                vehicle_no: vehicleNo.trim() || null,
                remarks: remarks.trim() || null
            };

            const res = await createDispatch(payload);
            toast.success(res.data?.message || "Material dispatched successfully!");
            navigate("/dispatch");
        } catch (err) {
            console.error("Dispatch submission error:", err);
            const msg = err.response?.data?.message || err.message || "Failed to create dispatch";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const labelCls = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2";
    const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-sm bg-white transition-colors duration-150";

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
            <Navbar title="Material Dispatch" />

            <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#369ACF]/10 text-[#369ACF]">
                                <i className="fa-solid fa-truck-fast text-lg"></i>
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">New Material Dispatch</h1>
                                <p className="text-slate-500 text-sm mt-0.5">
                                    Deduct material from Stock Status and log outward ledger movement in Stock Book.
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate("/dispatch")}
                        className="text-slate-600 hover:text-slate-900 font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-slate-200/60"
                    >
                        <i className="fa-solid fa-arrow-left text-xs"></i>
                        Dispatch History
                    </button>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <i className="fa-solid fa-boxes-packing text-[#369ACF]"></i>
                            Dispatch Details
                        </h2>
                    </div>

                    <div className="p-6 sm:p-8 space-y-6">
                        {/* Material Selection from Stock Status with Search inside Dropdown */}
                        <div className="space-y-2 relative" ref={dropdownRef}>
                            <label className={labelCls}>
                                Material from Stock Status <span className="text-rose-500">*</span>
                            </label>

                            {/* Dropdown Trigger Button */}
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                disabled={loadingBatches}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-sm bg-white transition-all duration-150 flex items-center justify-between gap-3 text-left cursor-pointer shadow-sm hover:border-slate-400"
                            >
                                <div className="flex-1 truncate">
                                    {selectedBatch ? (
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded border border-blue-200 shrink-0">
                                                {selectedBatch.internal_batch_number}
                                            </span>
                                            <span className="font-semibold text-slate-800 truncate">
                                                {selectedBatch.material_name}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                ({selectedBatch.material_type || "Item"})
                                            </span>
                                            <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                                Available: {parseFloat(selectedBatch.available_quantity).toFixed(2)} {selectedBatch.unit}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">
                                            {loadingBatches ? "Loading stock status batches..." : "— Select Material & Batch —"}
                                        </span>
                                    )}
                                </div>
                                <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200 shrink-0 ${isDropdownOpen ? "rotate-180 text-[#369ACF]" : ""}`}></i>
                            </button>

                            {/* Searchable Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                    {/* Search Input Inside Dropdown */}
                                    <div className="p-3 border-b border-slate-100 bg-slate-50/80">
                                        <div className="relative">
                                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Type to search material, batch, type, or party..."
                                                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-slate-800 placeholder-slate-400 transition-colors"
                                            />
                                            {searchTerm && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchTerm("")}
                                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded text-xs cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Options List */}
                                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                                        {filteredBatches.length > 0 ? (
                                            filteredBatches.map((b) => {
                                                const isSelected = selectedBatchNumber === b.internal_batch_number;
                                                return (
                                                    <button
                                                        key={b.internal_batch_number}
                                                        type="button"
                                                        onClick={() => {
                                                            handleBatchSelect(b.internal_batch_number);
                                                            setIsDropdownOpen(false);
                                                            setSearchTerm("");
                                                        }}
                                                        className={`w-full p-3 text-left transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                                                            isSelected
                                                                ? "bg-blue-50/80 text-blue-900 font-medium"
                                                                : "hover:bg-slate-50 text-slate-700"
                                                        }`}
                                                    >
                                                        <div className="space-y-1 truncate">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <span className="font-semibold text-slate-800 text-sm truncate">
                                                                    {b.material_name}
                                                                </span>
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                                                    {b.material_type || "Item"}
                                                                </span>
                                                                {b.location && (
                                                                    <span className="text-[11px] text-slate-400 shrink-0">
                                                                        • {b.location}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                                                                    {b.internal_batch_number}
                                                                </span>
                                                                {b.party && (
                                                                    <span className="text-slate-500 text-[11px] truncate">
                                                                        Party: {b.party}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-right shrink-0 flex items-center gap-3">
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Available</span>
                                                                <span className="font-extrabold text-emerald-600 text-sm">
                                                                    {parseFloat(b.available_quantity).toFixed(2)} {b.unit}
                                                                </span>
                                                            </div>
                                                            {isSelected && (
                                                                <i className="fa-solid fa-check text-blue-600 text-sm"></i>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="p-6 text-center text-xs text-slate-400">
                                                <i className="fa-solid fa-box-open text-xl text-slate-300 block mb-2"></i>
                                                No materials matching <span className="font-semibold text-slate-600">"{searchTerm}"</span> found in Stock Status.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Selected Batch Details Preview Card */}
                        {selectedBatch && (
                            <div className="p-5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-2xl border border-blue-200/70 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Stock Status Snapshot
                                        </h3>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100/80 text-blue-800">
                                        {selectedBatch.material_type || "Material"}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <span className="text-slate-500 font-medium block">Material Name</span>
                                        <span className="font-bold text-slate-800 text-sm">{selectedBatch.material_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium block">Internal Batch</span>
                                        <span className="font-mono font-bold text-indigo-700 text-sm">{selectedBatch.internal_batch_number}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium block">Current Available Stock</span>
                                        <span className="font-extrabold text-emerald-700 text-sm">
                                            {availableQty} {selectedBatch.unit}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium block">Location / Store</span>
                                        <span className="font-semibold text-slate-700">{selectedBatch.location || "—"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quantity & Date Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Quantity */}
                            <div className="space-y-1">
                                <label className={labelCls}>
                                    Quantity to Dispatch <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.0001"
                                        min="0.0001"
                                        max={selectedBatch ? availableQty : ""}
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder={selectedBatch ? `Max ${availableQty} ${selectedBatch.unit}` : "Enter dispatch quantity"}
                                        className={inputCls}
                                        required
                                    />
                                    {selectedBatch && (
                                        <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                                            {selectedBatch.unit}
                                        </span>
                                    )}
                                </div>

                                {/* Live remaining balance preview */}
                                {selectedBatch && quantity && (
                                    <p className={`text-xs mt-1.5 font-medium flex items-center gap-1.5 ${
                                        enteredQty > availableQty ? "text-rose-600" : "text-slate-600"
                                    }`}>
                                        <i className={`fa-solid ${enteredQty > availableQty ? "fa-circle-xmark" : "fa-circle-info"} text-[11px]`}></i>
                                        {enteredQty > availableQty
                                            ? `Cannot dispatch more than ${availableQty} ${selectedBatch.unit}!`
                                            : `Stock balance after dispatch: ${remainingAfterDispatch.toFixed(4)} ${selectedBatch.unit}`}
                                    </p>
                                )}
                            </div>

                            {/* Dispatch Date */}
                            <div className="space-y-1">
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

                        {/* Packing Method Section */}
                        <div className="space-y-1">
                            <label className={labelCls}>
                                Packing Method <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={packingMethod}
                                onChange={(e) => setPackingMethod(e.target.value)}
                                placeholder="Enter packing method (e.g. Boxes, PP Bags, Wooden Crates, Pallets, Loose)..."
                                className={inputCls}
                                required
                            />
                        </div>

                        {/* Additional Logistics Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            {/* Party / Customer */}
                            <div className="space-y-1">
                                <label className={labelCls}>Customer / Consignee / Party</label>
                                <input
                                    type="text"
                                    value={partyName}
                                    onChange={(e) => setPartyName(e.target.value)}
                                    placeholder="Enter customer or recipient party name"
                                    className={inputCls}
                                />
                            </div>

                            {/* Vehicle / Transporter */}
                            <div className="space-y-1">
                                <label className={labelCls}>Vehicle No. / Transporter</label>
                                <input
                                    type="text"
                                    value={vehicleNo}
                                    onChange={(e) => setVehicleNo(e.target.value)}
                                    placeholder="e.g. MH-12-AB-1234 or Blue Dart"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-1">
                            <label className={labelCls}>Remarks / Notes</label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                rows={2}
                                placeholder="Any special instructions or dispatch notes..."
                                className={`${inputCls} resize-none`}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-6 flex justify-end items-center gap-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => navigate("/dispatch")}
                                className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || loadingBatches || !selectedBatch || enteredQty <= 0 || enteredQty > availableQty}
                                className="bg-[#369ACF] hover:bg-[#2884b2] text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow disabled:cursor-not-allowed disabled:bg-slate-300 flex items-center gap-2 cursor-pointer"
                            >
                                <i className={`fa-solid ${submitting ? "fa-spinner fa-spin" : "fa-check"}`}></i>
                                {submitting ? "Processing Dispatch..." : "Confirm & Dispatch"}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
