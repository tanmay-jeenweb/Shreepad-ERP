import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import {
    createMaterialAdd,
    updateMaterialAdd,
    getMaterialAddById,
    getMaterialTypes,
    getMaterialsByType,
    getNextBatchNumber
} from "../../api/materialAddApi";
import { getLocations } from "../../api/locationApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ITEM = {
    material_id: "",
    material_name: "",
    material_type: "",
    unit: "",
    quantity: "",
    internal_batch_number: ""
};

const EMPTY_HEADER = {
    ma_date: new Date().toISOString().split("T")[0],
    location_id: "",
    location_name: "",
    remark: "",
    particular: "",
    status: "received"
};

const n = (v) => (v === "" || v === null || v === undefined ? 0 : parseFloat(v) || 0);

export default function CreateMaterialAdd() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    // ─── State ────────────────────────────────────────────────────────────────
    const [headerData, setHeaderData] = useState(EMPTY_HEADER);
    const [items, setItems] = useState([EMPTY_ITEM]);

    // Masters
    const [locations, setLocations] = useState([]);
    const [materialTypes, setMaterialTypes] = useState([]);
    const [materialsByType, setMaterialsByType] = useState({});

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ─── Fetch Masters ────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const [locsRes, typesRes] = await Promise.all([
                    getLocations(),
                    getMaterialTypes()
                ]);

                setLocations(locsRes.data?.data || []);
                setMaterialTypes(typesRes.data?.data || []);
            } catch (error) {
                console.error("Failed to fetch masters", error);
                toast.error("Failed to load initial data.");
            }
        };
        fetchMasters();
    }, []);

    // ─── Fetch Edit Data ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!isEdit) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const res = await getMaterialAddById(id);
                const data = res.data?.data;
                if (!data) throw new Error("No data found");

                setHeaderData({
                    ma_date: data.ma_date ? new Date(data.ma_date).toISOString().split("T")[0] : "",
                    location_id: data.location_id || "",
                    location_name: data.location_name || "",
                    remark: data.remark || "",
                    particular: data.particular || "",
                    status: data.status || "received"
                });

                if (data.items && data.items.length > 0) {
                    const formattedItems = data.items.map(it => {
                        // Pre-fetch materials for this type if needed
                        if (it.material_type && !materialsByType[it.material_type]) {
                            fetchMaterialsForType(it.material_type);
                        }

                        return {
                            ...it,
                            quantity: it.quantity
                        };
                    });
                    setItems(formattedItems);
                } else {
                    setItems([EMPTY_ITEM]);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load Material Add data.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [isEdit, id]);

    // ─── Dynamic Lookups ──────────────────────────────────────────────────────
    const fetchMaterialsForType = async (type) => {
        if (!type || materialsByType[type]) return;
        try {
            const res = await getMaterialsByType(type);
            setMaterialsByType(prev => ({ ...prev, [type]: res.data?.data || [] }));
        } catch (error) {
            console.error("Failed to fetch materials for type", error);
        }
    };

    const fetchNextBatch = async (index, materialId) => {
        if (!materialId || isEdit) return; // Only preview on create
        try {
            const res = await getNextBatchNumber(materialId);
            const batchNum = res.data?.data || "";
            setItems(prev => {
                const updated = [...prev];
                updated[index].internal_batch_number = batchNum;
                return updated;
            });
        } catch (error) {
            console.error("Failed to fetch batch preview", error);
        }
    };

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleHeaderChange = (e) => {
        const { name, value } = e.target;
        const newData = { ...headerData, [name]: value };

        if (name === "location_id") {
            const loc = locations.find(l => l.id === parseInt(value));
            newData.location_name = loc ? loc.location_name : "";
        }
        setHeaderData(newData);
    };

    const handleItemChange = (index, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            const item = { ...updated[index] };

            if (field === "material_type") {
                item.material_type = value;
                item.material_id = "";
                item.material_name = "";
                item.unit = "";
                item.internal_batch_number = "";
                fetchMaterialsForType(value);
            } else if (field === "material_id") {
                item.material_id = value;
                const matList = materialsByType[item.material_type] || [];
                const mat = matList.find(m => m.id === parseInt(value));
                if (mat) {
                    item.material_name = mat.material_name;
                    item.unit = mat.unit_name || "";
                    fetchNextBatch(index, value);
                } else {
                    item.material_name = "";
                    item.unit = "";
                    item.internal_batch_number = "";
                }
            } else {
                item[field] = value;
            }

            updated[index] = item;
            return updated;
        });
    };

    const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic Validation
        if (!headerData.location_id) return toast.error("Please select a Location.");
        
        const validItems = items.filter(i => i.material_id);
        if (validItems.length === 0) return toast.error("Please add at least one valid material item.");

        for (const item of validItems) {
            if (n(item.quantity) <= 0) return toast.error(`Quantity must be > 0 for material: ${item.material_name}`);
        }

        const payload = {
            header: headerData,
            items: validItems.map(i => ({
                ...i,
                internal_batch_number: isEdit ? i.internal_batch_number : null // Let backend generate new if not edit
            }))
        };

        setSubmitting(true);
        try {
            if (isEdit) {
                await updateMaterialAdd(id, payload);
                toast.success("Material Add updated successfully.");
            } else {
                await createMaterialAdd(payload);
                toast.success("Material Add created successfully.");
            }
            navigate("/store/material-add");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save Material Add.");
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls =
        "w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-sm bg-slate-50 transition-colors duration-150";
    const readonlyInputCls =
        "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed";
    const labelCls = "block text-sm font-semibold text-slate-700 mb-2";

    const itemInputCls =
        "w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-sm bg-slate-50 transition-colors duration-150";
    const itemReadonlyInputCls =
        "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed";
    const itemLabelCls = "block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider";

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
                <Navbar title={isEdit ? "Edit Material Add" : "New Material Add"} />
                <div className="flex-1 flex items-center justify-center">
                    <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#369ACF]"></i>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
            <Navbar title={isEdit ? "Edit Material Add" : "New Material Add"} />
            
            <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between w-full">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <i className="fa-solid fa-box-open text-[#369ACF]"></i>
                            {isEdit ? "Edit Material Add" : "New Material Add"}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            {isEdit ? "Update details for the selected record." : "Create a new direct material receipt."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate("/store/material-add")}
                        className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        Back to Material Add List
                    </button>
                </div>

                <div className="w-full pb-20">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Header Details */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                                <h2 className="text-lg font-semibold text-slate-800">General Information</h2>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelCls}>Date <span className="text-rose-500">*</span></label>
                                        <DateInput
                                            name="ma_date"
                                            required
                                            value={headerData.ma_date}
                                            onChange={handleHeaderChange}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Location <span className="text-rose-500">*</span></label>
                                        <select
                                            name="location_id"
                                            required
                                            value={headerData.location_id}
                                            onChange={handleHeaderChange}
                                            className={inputCls}
                                        >
                                            <option value="">Select Location</option>
                                            {locations.map(l => (
                                                <option key={l.id} value={l.id}>{l.location_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelCls}>Particulars</label>
                                        <textarea
                                            name="particular"
                                            value={headerData.particular}
                                            onChange={handleHeaderChange}
                                            placeholder="Add particular details..."
                                            rows={3}
                                            className={`${inputCls} resize-none`}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Remarks</label>
                                        <textarea
                                            name="remark"
                                            value={headerData.remark}
                                            onChange={handleHeaderChange}
                                            placeholder="Add general remarks..."
                                            rows={3}
                                            className={`${inputCls} resize-none`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-slate-800">Material Details</h2>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="px-4 py-2 bg-[#369ACF]/10 hover:bg-[#369ACF]/20 text-[#369ACF] text-xs font-bold rounded-xl border border-[#369ACF]/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Add Row
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {items.map((item, idx) => (
                                    <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 relative group transition-all hover:border-[#369ACF]/30">
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer"
                                                title="Remove Item"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                            <div>
                                                <label className={itemLabelCls}>Material Type <span className="text-rose-500">*</span></label>
                                                <select
                                                    value={item.material_type}
                                                    required
                                                    onChange={(e) => handleItemChange(idx, "material_type", e.target.value)}
                                                    className={itemInputCls}
                                                >
                                                    <option value="">Select Type</option>
                                                    {materialTypes.map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className={itemLabelCls}>Material <span className="text-rose-500">*</span></label>
                                                <select
                                                    value={item.material_id}
                                                    required
                                                    disabled={!item.material_type}
                                                    onChange={(e) => handleItemChange(idx, "material_id", e.target.value)}
                                                    className={itemInputCls}
                                                >
                                                    <option value="">Select Material</option>
                                                    {(materialsByType[item.material_type] || []).map(m => (
                                                        <option key={m.id} value={m.id}>{m.material_name}</option>
                                                    ))}
                                                </select>
                                                {item.unit && <p className="text-[10px] text-slate-400 mt-1.5">Unit: <span className="font-bold text-[#369ACF]">{item.unit}</span></p>}
                                            </div>

                                            <div>
                                                <label className={itemLabelCls}>Batch #</label>
                                                <input
                                                    type="text"
                                                    value={item.internal_batch_number || (isEdit ? "Loading..." : "")}
                                                    disabled
                                                    placeholder={item.material_id && !isEdit ? "Fetching..." : "Auto-generated"}
                                                    className={itemReadonlyInputCls}
                                                />
                                            </div>

                                            <div>
                                                <label className={itemLabelCls}>Total Qty <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    min="0.001"
                                                    required
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                                    className={`${itemInputCls} font-bold text-[#369ACF] bg-indigo-50/30 border-indigo-100`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 flex justify-end gap-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => navigate("/store/material-add")}
                                className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer flex items-center gap-1.5"
                            >
                                {submitting ? "Saving..." : isEdit ? "Update Material Add" : "Save Material Add"}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
