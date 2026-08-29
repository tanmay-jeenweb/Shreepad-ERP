import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getBOMProducts, createBOM, updateBOM } from "../../api/bomApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import { getAllMoulds } from "../../api/mouldApi";
import { getProcesses } from "../../api/processMasterApi";
import { getBOMs } from "../../api/bomApi";
import toast from "react-hot-toast";

const emptyForm = {
    materialId: "",
    productInsert: "",
    rawMaterialId: "",
    productCountingType: "",
    unitWeightTolerance: "",
    mouldId: "",
    mouldIds: [],
    color: "",
    processId: "",
    productWeight: "",
    rmFormulation: "",
    price: "",
    productWeightForSale: "",
    packingMethod: "",
    difference: ""
};

export default function CreateBOM() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const materialIdParam = searchParams.get("material_id");
    const [editId, setEditId] = useState(null);
    const isEditMode = Boolean(editId);

    const [bomDetails, setBomDetails] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Dropdown data
    const [products, setProducts] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [moulds, setMoulds] = useState([]);
    const [processes, setProcesses] = useState([]);

    const [mouldDropdownOpen, setMouldDropdownOpen] = useState(false);
    const mouldDropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (mouldDropdownRef.current && !mouldDropdownRef.current.contains(e.target)) {
                setMouldDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const [prodRes, rmRes, mouldRes, processRes] = await Promise.all([
                    getBOMProducts(),
                    getRawMaterials(),
                    getAllMoulds(),
                    getProcesses()
                ]);

                setProducts(prodRes.data?.data || []);
                setRawMaterials(rmRes.data?.data || []);
                setMoulds(mouldRes.data?.data || []);
                setProcesses(processRes.data?.data || []);

                if (materialIdParam) {
                    const bomRes = await getBOMs();
                    const boms = bomRes.data?.data || [];
                    const bomToEdit = boms.find(b => b.material_id === Number(materialIdParam));

                    if (bomToEdit) {
                        setBomDetails(bomToEdit);
                        if (bomToEdit.id) {
                            setEditId(bomToEdit.id);
                        }

                        const parsedMouldIds = bomToEdit.mould_ids
                            ? bomToEdit.mould_ids.split(',').map(Number)
                            : (bomToEdit.mould_id ? [Number(bomToEdit.mould_id)] : []);

                        setForm({
                            materialId: bomToEdit.material_id || "",
                            productInsert: bomToEdit.product_insert || "",
                            rawMaterialId: bomToEdit.raw_material_id || "",
                            productCountingType: bomToEdit.product_counting_type || "",
                            unitWeightTolerance: bomToEdit.unit_weight_tolerance || "",
                            mouldId: bomToEdit.mould_id || "",
                            mouldIds: parsedMouldIds,
                            color: bomToEdit.color || "",
                            processId: bomToEdit.process_id || "",
                            productWeight: bomToEdit.product_weight || "",
                            rmFormulation: bomToEdit.rm_formulation || "",
                            price: bomToEdit.price || "",
                            productWeightForSale: bomToEdit.product_weight_for_sale || "",
                            packingMethod: bomToEdit.packing_method || "",
                            difference: bomToEdit.difference || ""
                        });
                    } else {
                        toast.error("BOM config not found for this material");
                        navigate("/production/bom");
                    }
                } else {
                    navigate("/production/bom");
                }
            } catch (err) {
                console.error("Failed to load BOM form data", err);
                toast.error("Failed to load necessary data");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [materialIdParam, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const toggleMould = (id) => {
        setForm(prev => {
            const currentIds = prev.mouldIds || [];
            const newIds = currentIds.includes(id)
                ? currentIds.filter(mId => mId !== id)
                : [...currentIds, id];
            return {
                ...prev,
                mouldIds: newIds,
                mouldId: newIds.length > 0 ? newIds[0] : ""
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.materialId) {
            return toast.error("Please select a Product (Finished / Semi-Finished Good).");
        }

        try {
            setSaving(true);
            if (isEditMode) {
                await updateBOM(editId, form);
                toast.success("BOM updated successfully");
            } else {
                await createBOM(form);
                toast.success("BOM created successfully");
            }
            navigate("/production/bom");
        } catch (err) {
            console.error("Failed to save BOM", err);
            toast.error(err?.response?.data?.message || "Failed to save BOM");
        } finally {
            setSaving(false);
        }
    };

    const inputCls = "w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors text-slate-800 bg-white text-sm";
    const labelCls = "block text-sm font-semibold text-slate-700 mb-1";

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar title={isEditMode ? "Edit BOM" : "Create BOM"} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-[#369ACF] border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar title={isEditMode ? "Edit BOM" : "Create BOM"} />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className=" mx-auto space-y-6">

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {isEditMode ? "Edit Bill of Material" : "Configure Bill of Material"}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">
                                {isEditMode ? "Update existing production parameters" : "Fill in the form to configure production parameters for this product"}
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/production/bom")}
                            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-2"
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            Back to List
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                            <div className="md:col-span-2 pb-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-solid fa-box text-indigo-500"></i>
                                    Primary Information
                                </h2>
                            </div>

                            <div>
                                <label className={labelCls}>Product (FG / SFG)</label>
                                <div className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold">
                                    {bomDetails ? `${bomDetails.material_name} ${bomDetails.material_code ? `(${bomDetails.material_code})` : ''} - ${bomDetails.material_type}` : 'Loading...'}
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Product Insert</label>
                                <input
                                    type="text"
                                    name="productInsert"
                                    value={form.productInsert}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. Brass Insert"
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Raw Material</label>
                                <select
                                    name="rawMaterialId"
                                    value={form.rawMaterialId}
                                    onChange={handleChange}
                                    className={inputCls}
                                >
                                    <option value="">-- Select Raw Material --</option>
                                    {rawMaterials.map(rm => (
                                        <option key={rm.id} value={rm.id}>
                                            {rm.material_name} - {rm.grade}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Product Counting Type</label>
                                <input
                                    type="text"
                                    name="productCountingType"
                                    value={form.productCountingType}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. Pcs, Kg, Set, Nos"
                                />
                            </div>

                            <div className="md:col-span-2 pt-4 pb-4 border-b border-slate-100 mt-2">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-solid fa-gears text-teal-500"></i>
                                    Production Settings
                                </h2>
                            </div>

                            <div ref={mouldDropdownRef}>
                                <label className={labelCls}>Compatible Mould</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setMouldDropdownOpen(o => !o)}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                                    >
                                        <span className={(!form.mouldIds || form.mouldIds.length === 0) ? "text-slate-400 text-sm" : "text-slate-800 font-medium text-sm truncate"}>
                                            {(!form.mouldIds || form.mouldIds.length === 0)
                                                ? "-- Select Moulds --"
                                                : `${moulds.filter(m => form.mouldIds.includes(m.id)).map(m => m.mould_name).join(", ")}`}
                                        </span>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 text-slate-400 transition-transform duration-150 shrink-0 ${mouldDropdownOpen ? "rotate-180" : ""}`}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </button>

                                    {mouldDropdownOpen && (
                                        <div className="absolute left-0 top-full mt-1 z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                            {moulds.length === 0 ? (
                                                <p className="px-4 py-3 text-sm text-slate-400">No moulds available</p>
                                            ) : (
                                                moulds.map(m => (
                                                    <label
                                                        key={m.id}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={(form.mouldIds || []).includes(m.id)}
                                                            onChange={() => toggleMould(m.id)}
                                                            className="h-4 w-4 rounded text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                                                        />
                                                        <div className="flex flex-col leading-tight">
                                                            <span className="font-medium text-slate-800">{m.mould_name}</span>
                                                        </div>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                {form.mouldIds && form.mouldIds.length > 0 && (
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        {`${form.mouldIds.length} mould${form.mouldIds.length > 1 ? "s" : ""} selected`}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelCls}>Process</label>
                                <select
                                    name="processId"
                                    value={form.processId}
                                    onChange={handleChange}
                                    className={inputCls}
                                >
                                    <option value="">-- Select Process --</option>
                                    {processes.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.process_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Color</label>
                                <input
                                    type="text"
                                    name="color"
                                    value={form.color}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. Red, Blue, Clear"
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Packing Method</label>
                                <input
                                    type="text"
                                    name="packingMethod"
                                    value={form.packingMethod}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. Box, Shrink Wrap"
                                />
                            </div>

                            <div className="md:col-span-2 pt-4 pb-4 border-b border-slate-100 mt-2">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-solid fa-scale-balanced text-amber-500"></i>
                                    Measurements & Valuation
                                </h2>
                            </div>

                            <div>
                                <label className={labelCls}>Product Weight</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    name="productWeight"
                                    value={form.productWeight}
                                    onChange={handleChange}
                                    className={inputCls}
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Unit Weight Tolerance [+/-]</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    name="unitWeightTolerance"
                                    value={form.unitWeightTolerance}
                                    onChange={handleChange}
                                    className={inputCls}
                                />
                            </div>

                            <div>
                                <label className={labelCls}>RM Formulation</label>
                                <input
                                    type="text"
                                    name="rmFormulation"
                                    value={form.rmFormulation}
                                    onChange={handleChange}
                                    className={inputCls}
                                    placeholder="e.g. 100% Raw Material"
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Product Weight For Sale</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    name="productWeightForSale"
                                    value={form.productWeightForSale}
                                    onChange={handleChange}
                                    className={inputCls}
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Price</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-slate-400">₹</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="price"
                                        value={form.price}
                                        onChange={handleChange}
                                        className={`${inputCls} pl-8`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Difference</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    name="difference"
                                    value={form.difference}
                                    onChange={handleChange}
                                    className={inputCls}
                                />
                            </div>

                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate("/production/bom")}
                                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold bg-white hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 rounded-lg bg-[#369ACF] text-white font-semibold hover:bg-[#032a52] transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-check"></i>
                                        {isEditMode ? "Update BOM" : "Save BOM"}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
}
