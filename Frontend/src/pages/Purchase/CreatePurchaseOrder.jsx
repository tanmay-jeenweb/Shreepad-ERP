import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
    createPurchaseOrder,
    updatePurchaseOrder,
    revisePurchaseOrder,
    getPurchaseOrderById,
    getMaterialTypes,
    getMaterialsByType,
    getVendorsForPO,
} from "../../api/purchaseOrderApi";
import { getOrganizationDetails } from "../../api/organizationApi";
import { getTermsAndConditions } from "../../api/termsAndConditionsApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import DateInput from "../../components/DateInput";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ITEM = {
    material_id: "",
    material_name: "",
    grade: "",
    hsn_code: "",
    unit: "",
    quantity: "",
    rate: "",
    amount: 0,
    discount_percent: "",
    taxable_amount: 0,
    cgst_percent: "",
    cgst_amount: 0,
    sgst_percent: "",
    sgst_amount: 0,
    igst_percent: "",
    igst_amount: 0,
    total_amount: 0,
};

const EMPTY_HEADER = {
    name: "",
    vendor_id: "",
    po_date: new Date().toISOString().split("T")[0],
    address: "",
    gstin: "",
    purchase_type: "",
    state: "",
    state_code: "",
    transportation_mode: "",
    vehicle_number: "",
    revision_no: 0,
    total_amount: 0,
    tc_id: "",
    tc_description: "",
    status: "",
    po_number: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v) => (v === "" || v === null || v === undefined ? 0 : parseFloat(v) || 0);

const recalcItem = (item) => {
    const qty = n(item.quantity);
    const rate = n(item.rate);
    const amount = +(qty * rate).toFixed(2);
    const disc = n(item.discount_percent);
    const taxable = +(amount - (amount * disc) / 100).toFixed(2);
    const cgstAmt = +(taxable * n(item.cgst_percent) / 100).toFixed(2);
    const sgstAmt = +(taxable * n(item.sgst_percent) / 100).toFixed(2);
    const igstAmt = +(taxable * n(item.igst_percent) / 100).toFixed(2);
    const total = +(taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2);
    return { ...item, amount, taxable_amount: taxable, cgst_amount: cgstAmt, sgst_amount: sgstAmt, igst_amount: igstAmt, total_amount: total };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreatePurchaseOrder() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const isReviseMode = searchParams.get('mode') === 'revise';
    const isEdit = Boolean(id);

    const inputCls = "w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors text-slate-800 bg-white text-sm";
    const labelCls = "block text-sm font-medium text-slate-700 mb-1";

    const [header, setHeader] = useState(EMPTY_HEADER);
    const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
    const [materialTypes, setMaterialTypes] = useState([]);
    const [materialsMap, setMaterialsMap] = useState({}); // type → [{id, material_name, hsn_code, unit_name}]
    const [rawMaterialsList, setRawMaterialsList] = useState([]); // Array of { id, material_id, grade, ... }
    const [vendorsList, setVendorsList] = useState([]); // Vendors list
    const [tcList, setTcList] = useState([]); // Terms & Conditions list
    const [orgStateCode, setOrgStateCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ─── Initial data load ────────────────────────────────────────────────────

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const [typesRes, orgRes, tcRes, rawMatRes, vendorsRes] = await Promise.all([
                    getMaterialTypes(),
                    getOrganizationDetails(),
                    getTermsAndConditions(),
                    getRawMaterials(),
                    getVendorsForPO(),
                ]);
                setMaterialTypes(typesRes.data?.data || []);
                setOrgStateCode(orgRes.data?.data?.state_code || "");
                setTcList(tcRes.data?.data || []);
                setRawMaterialsList(rawMatRes.data?.data || []);
                setVendorsList(vendorsRes.data?.data || []);

                if (isEdit) {
                    const poRes = await getPurchaseOrderById(id);
                    const po = poRes.data?.data;
                    if (po) {
                        if (po.status === 'closed') {
                            showToast("This Purchase Order is closed (fully received) and cannot be edited or revised.", "error");
                            setTimeout(() => navigate("/purchase/purchase-orders"), 1500);
                            return;
                        }
                        setHeader({
                            name: po.name || "",
                            vendor_id: po.vendor_id || "",
                            po_date: po.po_date ? po.po_date.split("T")[0] : new Date().toISOString().split("T")[0],
                            address: po.address || "",
                            gstin: po.gstin || "",
                            purchase_type: po.purchase_type || "",
                            state: po.state || "",
                            state_code: po.state_code || "",
                            transportation_mode: po.transportation_mode || "",
                            vehicle_number: po.vehicle_number || "",
                            revision_no: po.revision_no ?? 0,
                            total_amount: po.total_amount || 0,
                            tc_id: po.tc_id || "",
                            tc_description: po.tc_description || "",
                            status: po.status || "",
                            po_number: po.po_number || "",
                        });

                        if (po.purchase_type) {
                            await fetchMaterialsForType(po.purchase_type);
                        }

                        if (po.items && po.items.length > 0) {
                            setItems(po.items.map(item => ({
                                material_id: item.material_id || "",
                                material_name: item.material_name || "",
                                grade: item.grade || "",
                                hsn_code: item.hsn_code || "",
                                unit: item.unit || "",
                                quantity: item.quantity || "",
                                rate: item.rate || "",
                                amount: item.amount || 0,
                                discount_percent: item.discount_percent || "",
                                taxable_amount: item.taxable_amount || 0,
                                cgst_percent: item.cgst_percent || "",
                                cgst_amount: item.cgst_amount || 0,
                                sgst_percent: item.sgst_percent || "",
                                sgst_amount: item.sgst_amount || 0,
                                igst_percent: item.igst_percent || "",
                                igst_amount: item.igst_amount || 0,
                                total_amount: item.total_amount || 0,
                            })));
                        }
                    }
                }
            } catch (err) {
                showToast("Failed to load data", "error");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [id]);

    // ─── Fetch materials for selected type ────────────────────────────────────

    const fetchMaterialsForType = useCallback(async (type) => {
        if (!type || materialsMap[type]) return;
        try {
            const res = await getMaterialsByType(type);
            setMaterialsMap(prev => ({ ...prev, [type]: res.data?.data || [] }));
        } catch {
            console.error("Failed to load materials for type:", type);
        }
    }, [materialsMap]);

    // ─── GST mode: intra-state if PO state_code === org state_code ───────────

    const isIntraState = header.state_code && orgStateCode &&
        header.state_code.trim().toLowerCase() === orgStateCode.trim().toLowerCase();

    // ─── Grand total ──────────────────────────────────────────────────────────

    const grandTotal = items.reduce((sum, it) => sum + n(it.total_amount), 0);

    // ─── Header change ────────────────────────────────────────────────────────

    // ─── Re-calculate GST splits for all items based on state code ───────────

    const updateItemsGstSplit = (targetStateCode) => {
        const nextIntraState = targetStateCode && orgStateCode &&
            String(targetStateCode).trim().toLowerCase() === String(orgStateCode).trim().toLowerCase();

        setItems(prev => {
            return prev.map(item => {
                if (!item.material_id) return item;
                const mats = materialsMap[header.purchase_type] || [];
                const mat = mats.find(m => String(m.id) === String(item.material_id));
                if (!mat) return item;

                const gstVal = n(mat.gst_percent);
                let updated = { ...item };
                if (nextIntraState) {
                    updated.cgst_percent = gstVal / 2;
                    updated.sgst_percent = gstVal / 2;
                    updated.igst_percent = 0;
                } else {
                    updated.cgst_percent = 0;
                    updated.sgst_percent = 0;
                    updated.igst_percent = gstVal;
                }
                return recalcItem(updated);
            });
        });
    };

    const handleHeaderChange = async (field, value) => {
        setHeader(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: "" }));

        if (field === "purchase_type") {
            // Reset item materials when type changes
            setItems([{ ...EMPTY_ITEM }]);
            if (value) await fetchMaterialsForType(value);
        }

        if (field === "state_code") {
            updateItemsGstSplit(value);
        }

        if (field === "vendor_id") {
            const selectedVendor = vendorsList.find(v => String(v.id) === String(value));
            if (selectedVendor) {
                const firstAddr = selectedVendor.addresses?.[0];
                const addressParts = [];
                if (firstAddr) {
                    if (firstAddr.address) addressParts.push(firstAddr.address);
                    if (firstAddr.city) addressParts.push(firstAddr.city);
                    if (firstAddr.state) addressParts.push(firstAddr.state);
                    if (firstAddr.country) addressParts.push(firstAddr.country);
                    if (firstAddr.zip_code) addressParts.push(firstAddr.zip_code);
                }
                const formattedAddress = addressParts.filter(Boolean).join(", ");
                const targetStateCode = selectedVendor.state_code || "";

                setHeader(prev => ({
                    ...prev,
                    vendor_id: value,
                    name: selectedVendor.vendor_name || "",
                    gstin: selectedVendor.gst_no || "",
                    state: firstAddr?.state || "",
                    state_code: targetStateCode,
                    address: formattedAddress,
                }));
                updateItemsGstSplit(targetStateCode);
            } else {
                setHeader(prev => ({
                    ...prev,
                    vendor_id: "",
                    name: "",
                    gstin: "",
                    state: "",
                    state_code: "",
                    address: "",
                }));
                updateItemsGstSplit("");
            }
        }

        // Auto-populate T&C description from master
        if (field === "tc_id") {
            const selected = tcList.find(tc => String(tc.id) === String(value));
            setHeader(prev => ({
                ...prev,
                tc_id: value,
                tc_description: selected ? (selected.description || "") : "",
            }));
        }
    };

    // ─── Item change ──────────────────────────────────────────────────────────

    const handleItemChange = (idx, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            let item = { ...updated[idx], [field]: value };

            if (field === "material_id") {
                const mats = materialsMap[header.purchase_type] || [];
                const mat = mats.find(m => String(m.id) === String(value));
                if (mat) {
                    item.material_name = mat.material_name;
                    item.grade = ""; // reset grade on material change
                    item.hsn_code = mat.hsn_code || "";
                    item.unit = mat.unit_name || "";

                    // Auto-populate GST
                    const gstVal = n(mat.gst_percent);
                    if (isIntraState) {
                        item.cgst_percent = gstVal / 2;
                        item.sgst_percent = gstVal / 2;
                        item.igst_percent = 0;
                    } else {
                        item.cgst_percent = 0;
                        item.sgst_percent = 0;
                        item.igst_percent = gstVal;
                    }
                } else {
                    item.material_name = "";
                    item.grade = "";
                    item.hsn_code = "";
                    item.unit = "";
                    item.cgst_percent = "";
                    item.sgst_percent = "";
                    item.igst_percent = "";
                }
            }

            updated[idx] = recalcItem(item);
            return updated;
        });
    };

    const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);

    const removeItem = (idx) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    // ─── Validation ───────────────────────────────────────────────────────────

    const validate = () => {
        const e = {};
        if (!header.vendor_id) e.vendor_id = "Vendor Name is required";
        if (!header.po_date) e.po_date = "PO Date is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        try {
            const payload = {
                header: {
                    ...header,
                    total_amount: grandTotal,
                    tc_id: header.tc_id || null,
                    tc_description: header.tc_description || null,
                },
                items: items.map(item => ({
                    ...item,
                    quantity: n(item.quantity),
                    rate: n(item.rate),
                    discount_percent: n(item.discount_percent),
                    cgst_percent: isIntraState ? n(item.cgst_percent) : 0,
                    sgst_percent: isIntraState ? n(item.sgst_percent) : 0,
                    igst_percent: !isIntraState ? n(item.igst_percent) : 0,
                })),
            };

            if (isReviseMode) {
                await revisePurchaseOrder(id, payload);
                showToast("Purchase Order revised successfully");
            } else if (isEdit) {
                await updatePurchaseOrder(id, payload);
                showToast("Purchase Order updated successfully");
            } else {
                await createPurchaseOrder(payload);
                showToast("Purchase Order created successfully");
            }
            setTimeout(() => navigate("/purchase/purchase-orders"), 1200);
        } catch (err) {
            const msg = err?.response?.data?.message || "Failed to save Purchase Order";
            showToast(msg, "error");
        } finally {
            setSaving(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar title={isReviseMode ? "Revise Purchase Order" : isEdit ? "Edit Purchase Order" : "Create Purchase Order"} />
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="text-center">
                        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#369ACF]/50 mb-3 block"></i>
                        <p className="text-slate-500 font-medium">Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentMaterials = materialsMap[header.purchase_type] || [];

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar title={isReviseMode ? "Revise Purchase Order" : isEdit ? "Edit Purchase Order" : "Create Purchase Order"} />

            {/* Revise Mode Banner */}
            {isReviseMode && header.po_number && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="mx-auto flex items-center gap-3 text-blue-800 text-sm font-semibold">
                        <i className="fa-solid fa-code-merge"></i>
                        <span>Revising <strong>{header.po_number}</strong> (Rev {header.revision_no} → Rev {header.revision_no + 1}) — A new PO entry will be created.</span>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-3 ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
                    <i className={`fa-solid ${toast.type === "error" ? "fa-circle-xmark" : "fa-circle-check"}`}></i>
                    {toast.message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Page Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {isReviseMode ? "Revise Purchase Order" : isEdit ? "Edit Purchase Order" : "Create Purchase Order"}
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">
                            {isReviseMode ? `Revising existing PO · Revision ${header.revision_no}` : isEdit ? `Updating existing PO · Revision ${header.revision_no}` : "Fill in the details to create a new Purchase Order."}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => navigate("/purchase/purchase-orders")}
                            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer">
                            <i className="fa-solid fa-arrow-left"></i> Back to List
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#369ACF] rounded-lg hover:bg-[#032a52] cursor-pointer transition-all shadow-sm disabled:opacity-60 ml-2">
                            {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-xs"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk text-xs"></i> {isReviseMode ? "Revise PO" : isEdit ? "Update PO" : "Save PO"}</>}
                        </button>
                    </div>
                </div>

                {/* ── HEADER SECTION ── */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-file-invoice text-[#369ACF]"></i>
                            Purchase Order Details
                        </h2>
                        {isIntraState && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                                <i className="fa-solid fa-circle-check text-[10px]"></i> Intra-State · CGST + SGST
                            </span>
                        )}
                        {!isIntraState && header.state_code && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                                <i className="fa-solid fa-arrow-right-arrow-left text-[10px]"></i> Inter-State · IGST
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                        {/* Vendor Name */}
                        <div>
                            <label className={labelCls}>Vendor Name <span className="text-red-500">*</span></label>
                            <select
                                value={header.vendor_id}
                                onChange={e => handleHeaderChange("vendor_id", e.target.value)}
                                className={`${inputCls} ${errors.vendor_id ? "border-red-400 bg-red-50" : "border-slate-300"} cursor-pointer`}
                            >
                                <option value="">— Select Vendor —</option>
                                {vendorsList.map(v => (
                                    <option key={v.id} value={v.id}>{v.vendor_name}</option>
                                ))}
                            </select>
                            {errors.vendor_id && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><i className="fa-solid fa-circle-exclamation text-[10px]"></i> {errors.vendor_id}</p>}
                        </div>

                        {/* PO Date */}
                        <div>
                            <label className={labelCls}>PO Date <span className="text-red-500">*</span></label>
                            <DateInput value={header.po_date} onChange={e => handleHeaderChange("po_date", e.target.value)} />
                            {errors.po_date && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><i className="fa-solid fa-circle-exclamation text-[10px]"></i> {errors.po_date}</p>}
                        </div>

                        {/* GSTIN */}
                        <div>
                            <label className={labelCls}>GSTIN</label>
                            <input type="text" value={header.gstin} onChange={e => handleHeaderChange("gstin", e.target.value)}
                                placeholder="e.g. 22AAAAA0000A1Z5"
                                className={`${inputCls} uppercase`} />
                        </div>

                        {/* Purchase Type */}
                        <div>
                            <label className={labelCls}>Purchase Type</label>
                            <select value={header.purchase_type} onChange={e => handleHeaderChange("purchase_type", e.target.value)}
                                className={`${inputCls} cursor-pointer`}>
                                <option value="">— Select Type —</option>
                                {materialTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* State */}
                        <div>
                            <label className={labelCls}>State</label>
                            <input type="text" value={header.state} onChange={e => handleHeaderChange("state", e.target.value)}
                                placeholder="e.g. Maharashtra"
                                className={inputCls} />
                        </div>

                        {/* State Code */}
                        <div>
                            <label className={labelCls}>
                                State Code
                                {orgStateCode && <span className="ml-1.5 text-slate-400 normal-case font-normal">(Org: {orgStateCode})</span>}
                            </label>
                            <input type="text" value={header.state_code} onChange={e => handleHeaderChange("state_code", e.target.value)}
                                placeholder="e.g. 27"
                                className={inputCls} />
                        </div>

                        {/* Address */}
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Address</label>
                            <textarea value={header.address} onChange={e => handleHeaderChange("address", e.target.value)}
                                placeholder="Enter delivery/billing address"
                                rows={2}
                                className={`${inputCls} resize-none`} />
                        </div>



                    </div>
                </div>

                {/* ── ITEMS SECTION ── */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-list-ul text-[#369ACF]"></i>
                            <h2 className="text-lg font-bold text-slate-800">Items</h2>
                            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">{items.length} row{items.length !== 1 ? "s" : ""}</span>
                        </div>
                        {!header.purchase_type && (
                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                                <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                                Select Purchase Type first
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap w-6">#</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[160px]">Material Name</th>
                                    {header.purchase_type?.toLowerCase().includes("raw material") && (
                                        <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[120px]">Grade</th>
                                    )}
                                    <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[90px]">HSN</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[70px]">Unit</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[80px]">Qty</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[90px]">Rate</th>
                                    <th className="px-3 py-3 text-right font-semibold text-slate-500 whitespace-nowrap min-w-[90px]">Amount</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[70px]">Disc %</th>
                                    <th className="px-3 py-3 text-right font-semibold text-slate-500 whitespace-nowrap min-w-[100px]">Taxable Amt</th>
                                    {isIntraState ? (
                                        <>
                                            <th className="px-3 py-3 text-left font-semibold text-emerald-600 whitespace-nowrap min-w-[70px]">CGST %</th>
                                            <th className="px-3 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap min-w-[90px]">CGST Amt</th>
                                            <th className="px-3 py-3 text-left font-semibold text-emerald-600 whitespace-nowrap min-w-[70px]">SGST %</th>
                                            <th className="px-3 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap min-w-[90px]">SGST Amt</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-3 py-3 text-left font-semibold text-blue-600 whitespace-nowrap min-w-[70px]">IGST %</th>
                                            <th className="px-3 py-3 text-right font-semibold text-blue-600 whitespace-nowrap min-w-[90px]">IGST Amt</th>
                                        </>
                                    )}
                                    <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap min-w-[100px]">Total</th>
                                    <th className="px-3 py-3 text-center font-semibold text-slate-500 whitespace-nowrap w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                        {/* # */}
                                        <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                                        {/* Material Name */}
                                        <td className="px-3 py-2.5">
                                            <select
                                                value={item.material_id}
                                                onChange={e => handleItemChange(idx, "material_id", e.target.value)}
                                                disabled={!header.purchase_type}
                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                                            >
                                                <option value="">— Select —</option>
                                                {currentMaterials.map(m => (
                                                    <option key={m.id} value={m.id}>{m.material_name}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Grade (Conditional) */}
                                        {header.purchase_type?.toLowerCase().includes("raw material") && (
                                            <td className="px-3 py-2.5">
                                                {(() => {
                                                    if (!item.material_id) {
                                                        return (
                                                            <input type="text" disabled value="Select Material First" 
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-400 focus:outline-none" />
                                                        );
                                                    }
                                                    const availableGrades = rawMaterialsList.filter(rm => String(rm.material_id) === String(item.material_id));
                                                    if (availableGrades.length === 0) {
                                                        return (
                                                            <span className="block px-2.5 py-2 text-[10px] text-amber-600 bg-amber-50 rounded-lg border border-amber-200 truncate">
                                                                Material grade not available
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <select
                                                            value={item.grade}
                                                            onChange={e => handleItemChange(idx, "grade", e.target.value)}
                                                            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white cursor-pointer"
                                                        >
                                                            <option value="">— Select Grade —</option>
                                                            {availableGrades.map(g => (
                                                                <option key={g.id} value={g.grade}>{g.grade}</option>
                                                            ))}
                                                        </select>
                                                    );
                                                })()}
                                            </td>
                                        )}

                                        {/* HSN (auto-filled) */}
                                        <td className="px-3 py-2.5">
                                            <input type="text" value={item.hsn_code} readOnly
                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 focus:outline-none" placeholder="Auto" />
                                        </td>

                                        {/* Unit (auto-filled) */}
                                        <td className="px-3 py-2.5">
                                            <input type="text" value={item.unit} readOnly
                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 focus:outline-none" placeholder="Auto" />
                                        </td>

                                        {/* Qty */}
                                        <td className="px-3 py-2.5">
                                            <input type="number" min={0} step="any" value={item.quantity}
                                                onChange={e => handleItemChange(idx, "quantity", e.target.value)}
                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white" placeholder="0" />
                                        </td>

                                        {/* Rate */}
                                        <td className="px-3 py-2.5">
                                            <input type="number" min={0} step="any" value={item.rate}
                                                onChange={e => handleItemChange(idx, "rate", e.target.value)}
                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white" placeholder="0.00" />
                                        </td>

                                        {/* Amount (calc) */}
                                        <td className="px-3 py-2.5 text-right font-semibold text-slate-700 tabular-nums">
                                            {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>

                                        {/* Discount % */}
                                        <td className="px-3 py-2.5">
                                            <input type="number" min={0} max={100} step="any" value={item.discount_percent}
                                                onChange={e => handleItemChange(idx, "discount_percent", e.target.value)}
                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white" placeholder="0" />
                                        </td>

                                        {/* Taxable Amount */}
                                        <td className="px-3 py-2.5 text-right font-semibold text-slate-700 tabular-nums">
                                            {item.taxable_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>

                                        {/* GST Columns */}
                                        {isIntraState ? (
                                            <>
                                                <td className="px-3 py-2.5">
                                                    <input type="number" min={0} max={100} step="any" value={item.cgst_percent}
                                                        onChange={e => handleItemChange(idx, "cgst_percent", e.target.value)}
                                                        className="w-full px-2.5 py-2 border border-emerald-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 bg-white" placeholder="0" />
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 tabular-nums">
                                                    {item.cgst_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <input type="number" min={0} max={100} step="any" value={item.sgst_percent}
                                                        onChange={e => handleItemChange(idx, "sgst_percent", e.target.value)}
                                                        className="w-full px-2.5 py-2 border border-emerald-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 bg-white" placeholder="0" />
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 tabular-nums">
                                                    {item.sgst_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2.5">
                                                    <input type="number" min={0} max={100} step="any" value={item.igst_percent}
                                                        onChange={e => handleItemChange(idx, "igst_percent", e.target.value)}
                                                        className="w-full px-2.5 py-2 border border-blue-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300/40 bg-white" placeholder="0" />
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-semibold text-blue-700 tabular-nums">
                                                    {item.igst_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </td>
                                            </>
                                        )}

                                        {/* Row Total */}
                                        <td className="px-3 py-2.5 text-right font-bold text-slate-800 tabular-nums">
                                            ₹ {item.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>

                                        {/* Remove */}
                                        <td className="px-3 py-2.5 text-center">
                                            <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-20 cursor-pointer transition-all mx-auto">
                                                <i className="fa-solid fa-xmark text-xs"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Row + Grand Total Footer */}
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                        <button type="button" onClick={addItem}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#369ACF] border border-[#369ACF]/20 bg-white rounded-xl hover:bg-[#369ACF]/5 cursor-pointer transition-all shadow-sm">
                            <i className="fa-solid fa-plus text-[10px]"></i> Add Item
                        </button>

                        <div className="flex items-center gap-6">
                            {isIntraState && (
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Tax (CGST + SGST)</p>
                                    <p className="text-sm font-bold text-emerald-700">
                                        ₹ {items.reduce((s, it) => s + n(it.cgst_amount) + n(it.sgst_amount), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            )}
                            {!isIntraState && header.state_code && (
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Total IGST</p>
                                    <p className="text-sm font-bold text-blue-700">
                                        ₹ {items.reduce((s, it) => s + n(it.igst_amount), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            )}
                            <div className="text-right bg-[#369ACF] text-white px-5 py-2.5 rounded-xl shadow-sm">
                                <p className="text-[10px] uppercase font-semibold opacity-70">Grand Total</p>
                                <p className="text-base font-bold tabular-nums">
                                    ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TERMS & CONDITIONS SECTION ── */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <i className="fa-solid fa-file-contract text-[#369ACF]"></i>
                        <h2 className="text-lg font-bold text-slate-800">Terms &amp; Conditions</h2>
                    </div>

                    <div className="space-y-4">
                        {/* T&C Selector */}
                        <div>
                            <label className={labelCls}>
                                Select Terms &amp; Conditions Template
                            </label>
                            <select
                                value={header.tc_id}
                                onChange={e => handleHeaderChange("tc_id", e.target.value)}
                                className={`${inputCls} cursor-pointer`}
                            >
                                <option value="">— None / Select Template —</option>
                                {tcList.map(tc => (
                                    <option key={tc.id} value={tc.id}>{tc.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                <i className="fa-solid fa-circle-info text-[10px]"></i>
                                Selecting a template auto-fills the description below. You can then edit it for this PO without affecting the master template.
                            </p>
                        </div>

                        {/* Editable Description */}
                        <div className="rich-text-editor">
                            <label className={labelCls}>
                                Description
                                <span className="ml-2 normal-case font-normal text-slate-400">(editable for this PO)</span>
                            </label>
                            <style>{`
                                .rich-text-editor .ql-container {
                                    border-bottom-left-radius: 0.5rem;
                                    border-bottom-right-radius: 0.5rem;
                                    min-height: 180px;
                                    font-family: inherit;
                                }
                                .rich-text-editor .ql-toolbar {
                                    border-top-left-radius: 0.5rem;
                                    border-top-right-radius: 0.5rem;
                                    border-color: #e2e8f0 !important;
                                    background-color: #f8fafc;
                                }
                                .rich-text-editor .ql-container.ql-snow {
                                    border-color: #e2e8f0 !important;
                                }
                                .rich-text-editor .ql-editor.ql-blank::before {
                                    font-style: normal;
                                    color: #94a3b8;
                                    font-size: 14px;
                                }
                                .rich-text-editor .ql-editor {
                                    font-size: 14px;
                                    color: #1e293b;
                                    line-height: 1.6;
                                }
                            `}</style>
                            <ReactQuill
                                theme="snow"
                                value={header.tc_description || ""}
                                onChange={content => setHeader(prev => ({ ...prev, tc_description: content }))}
                                placeholder="Terms and conditions description will appear here after selecting a template, or type directly..."
                                modules={{
                                    toolbar: [
                                        [{ 'header': [1, 2, 3, false] }],
                                        ['bold', 'italic', 'underline', 'strike'],
                                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                        ['clean']
                                    ]
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Save Button */}
                <div className="flex justify-end">
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-white bg-[#369ACF] rounded-xl hover:bg-[#032a52] cursor-pointer transition-all shadow-md disabled:opacity-60">
                        {saving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk"></i> {isReviseMode ? "Revise Purchase Order" : isEdit ? "Update Purchase Order" : "Save Purchase Order"}</>}
                    </button>
                </div>

            </form>
        </div>
    );
}
