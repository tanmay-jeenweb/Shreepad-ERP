import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getBOMProducts, createBOM, updateBOM, getBOMByMaterialId } from "../../api/bomApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import { getProcesses } from "../../api/processMasterApi";
import { getMaterials } from "../../api/materialApi";
import { getUnits } from "../../api/unitApi";
import toast from "react-hot-toast";

const emptyForm = {
    materialId: "",
    rawMaterialId: "",
    unitWeightTolerance: "",
    productWeight: "",
    productWeightForSale: "",
    bomMaterials: [{ materialId: "", quantity: "", unitName: "" }],
    bomProcesses: [{ processId: "", time: "", unitId: "" }]
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
    const [rawAndSemiMaterials, setRawAndSemiMaterials] = useState([]);
    const [processes, setProcesses] = useState([]);
    const [units, setUnits] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const [prodRes, processRes, materialsRes, unitsRes] = await Promise.all([
                    getBOMProducts(),
                    getProcesses(),
                    getMaterials(),
                    getUnits()
                ]);

                setProducts(prodRes.data?.data || []);
                setProcesses(processRes.data?.data || []);
                setUnits(unitsRes.data?.data || []);

                const allMats = materialsRes.data?.data || [];
                const filteredMats = allMats.filter(m => ['Raw Materials', 'Semi Finished Goods'].includes(m.material_type));
                setRawAndSemiMaterials(filteredMats);

                if (materialIdParam) {
                    try {
                        const bomRes = await getBOMByMaterialId(Number(materialIdParam));
                        const bomToEdit = bomRes.data?.data;

                        if (bomToEdit) {
                            setBomDetails(bomToEdit);
                            if (bomToEdit.id) {
                                setEditId(bomToEdit.id);
                            }

                            const parsedMaterials = bomToEdit.bomMaterials && bomToEdit.bomMaterials.length > 0
                                ? bomToEdit.bomMaterials.map(m => ({
                                    materialId: m.materialId || "",
                                    quantity: m.quantity || "",
                                    unitName: m.unitName || ""
                                }))
                                : [{ materialId: "", quantity: "", unitName: "" }];

                            const parsedProcesses = bomToEdit.bomProcesses && bomToEdit.bomProcesses.length > 0
                                ? bomToEdit.bomProcesses.map(p => ({
                                    processId: p.processId || "",
                                    time: p.time || "",
                                    unitId: p.unitId || ""
                                }))
                                : [{ processId: "", time: "", unitId: "" }];

                            setForm({
                                materialId: bomToEdit.material_id || "",
                                rawMaterialId: bomToEdit.raw_material_id || "",
                                unitWeightTolerance: bomToEdit.unit_weight_tolerance || "",
                                productWeight: bomToEdit.product_weight || "",
                                productWeightForSale: bomToEdit.product_weight_for_sale || "",
                                bomMaterials: parsedMaterials,
                                bomProcesses: parsedProcesses
                            });
                        } else {
                            toast.error("BOM config not found for this material");
                            navigate("/production/bom");
                        }
                    } catch (err) {
                        console.error("Failed to load edit BOM:", err);
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

    const handleBOMMaterialChange = (index, val) => {
        const selectedMat = rawAndSemiMaterials.find(m => String(m.id) === String(val));
        const unitName = selectedMat ? selectedMat.unit_name : "";

        setForm(prev => {
            const newList = [...(prev.bomMaterials || [])];
            newList[index] = {
                ...newList[index],
                materialId: val,
                unitName: unitName
            };
            return { ...prev, bomMaterials: newList };
        });
    };

    const handleBOMQuantityChange = (index, val) => {
        setForm(prev => {
            const newList = [...(prev.bomMaterials || [])];
            newList[index] = {
                ...newList[index],
                quantity: val
            };
            return { ...prev, bomMaterials: newList };
        });
    };

    const addBOMMaterialRow = () => {
        setForm(prev => ({
            ...prev,
            bomMaterials: [...(prev.bomMaterials || []), { materialId: "", quantity: "", unitName: "" }]
        }));
    };

    const removeBOMMaterialRow = (index) => {
        setForm(prev => {
            const newList = (prev.bomMaterials || []).filter((_, idx) => idx !== index);
            return {
                ...prev,
                bomMaterials: newList.length > 0 ? newList : [{ materialId: "", quantity: "", unitName: "" }]
            };
        });
    };

    const handleBOMProcessChange = (index, field, val) => {
        setForm(prev => {
            const newList = [...(prev.bomProcesses || [])];
            newList[index] = {
                ...newList[index],
                [field]: val
            };
            return { ...prev, bomProcesses: newList };
        });
    };

    const addBOMProcessRow = () => {
        setForm(prev => ({
            ...prev,
            bomProcesses: [...(prev.bomProcesses || []), { processId: "", time: "", unitId: "" }]
        }));
    };

    const removeBOMProcessRow = (index) => {
        setForm(prev => {
            const newList = (prev.bomProcesses || []).filter((_, idx) => idx !== index);
            return {
                ...prev,
                bomProcesses: newList.length > 0 ? newList : [{ processId: "", time: "", unitId: "" }]
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.materialId) {
            return toast.error("Please select a Product (Finished / Semi-Finished Good).");
        }

        const hasValidMaterial = form.bomMaterials && form.bomMaterials.some(m => m.materialId && m.quantity);
        if (!hasValidMaterial) {
            return toast.error("Please add at least one valid Raw/Semi-Finished material with quantity.");
        }

        const hasValidProcess = form.bomProcesses && form.bomProcesses.some(p => p.processId && p.time && p.unitId);
        if (!hasValidProcess) {
            return toast.error("Please add at least one valid Process with time and unit.");
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

                            <div className="md:col-span-2 space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                    <label className="text-sm font-semibold text-slate-700">Raw / Semi-Finished Materials</label>
                                    <button
                                        type="button"
                                        onClick={addBOMMaterialRow}
                                        className="px-3 py-1.5 bg-[#369ACF]/10 hover:bg-[#369ACF]/20 text-[#369ACF] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <i className="fa-solid fa-plus"></i>
                                        Add Material
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {(form.bomMaterials || []).map((row, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row items-end sm:items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                                            <div className="flex-1 w-full">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden">Material</label>
                                                <select
                                                    value={row.materialId}
                                                    onChange={(e) => handleBOMMaterialChange(idx, e.target.value)}
                                                    className={inputCls}
                                                    required
                                                >
                                                    <option value="">-- Select Material --</option>
                                                    {rawAndSemiMaterials.map(m => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.material_name} {m.material_code ? `(${m.material_code})` : ''} - {m.material_type}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="w-full sm:w-44">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden">Quantity</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    placeholder="Quantity"
                                                    value={row.quantity}
                                                    onChange={(e) => handleBOMQuantityChange(idx, e.target.value)}
                                                    className={inputCls}
                                                    required
                                                />
                                            </div>

                                            <div className="w-24">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden">Unit</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    placeholder="Unit"
                                                    value={row.unitName || "—"}
                                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-100 text-slate-500 text-sm font-semibold select-none"
                                                />
                                            </div>

                                            {(form.bomMaterials || []).length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBOMMaterialRow(idx)}
                                                    className="h-10 w-10 flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                                                    title="Remove Row"
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-4 mt-2">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                    <label className="text-sm font-semibold text-slate-700">Processes</label>
                                    <button
                                        type="button"
                                        onClick={addBOMProcessRow}
                                        className="px-3 py-1.5 bg-[#369ACF]/10 hover:bg-[#369ACF]/20 text-[#369ACF] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <i className="fa-solid fa-plus"></i>
                                        Add Process
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {(form.bomProcesses || []).map((row, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row items-end sm:items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                                            <div className="flex-1 w-full">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden">Process</label>
                                                <select
                                                    value={row.processId}
                                                    onChange={(e) => handleBOMProcessChange(idx, "processId", e.target.value)}
                                                    className={inputCls}
                                                    required
                                                >
                                                    <option value="">-- Select Process --</option>
                                                    {processes.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.process_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="w-full sm:w-44">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden">Time</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    placeholder="Time"
                                                    value={row.time}
                                                    onChange={(e) => handleBOMProcessChange(idx, "time", e.target.value)}
                                                    className={inputCls}
                                                    required
                                                />
                                            </div>

                                            <div className="w-44">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 sm:hidden">Unit</label>
                                                <select
                                                    value={row.unitId}
                                                    onChange={(e) => handleBOMProcessChange(idx, "unitId", e.target.value)}
                                                    className={inputCls}
                                                    required
                                                >
                                                    <option value="">-- Select Unit --</option>
                                                    {units.map(u => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.unit_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {(form.bomProcesses || []).length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBOMProcessRow(idx)}
                                                    className="h-10 w-10 flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                                                    title="Remove Row"
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2 pt-4 pb-4 border-b border-slate-100 mt-2">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-solid fa-scale-balanced text-amber-500"></i>
                                    Measurements & Valuation
                                </h2>
                            </div>

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
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
