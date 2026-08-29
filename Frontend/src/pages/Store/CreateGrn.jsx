import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
    createGrn,
    updateGrn,
    getGrnById,
    getJobPartiesForGrn,
    getVendorsForGrn,
    getMaterialTypes,
    getMaterialsByType,
    getNextBatchNumber,
} from "../../api/grnApi";
import { getBatchConfig } from "../../api/settingMasterApi";
import { getPurchaseOrderById } from "../../api/purchaseOrderApi";
import { getOrganizationDetails } from "../../api/organizationApi";
import { getTermsAndConditions } from "../../api/termsAndConditionsApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import { getLocations } from "../../api/locationApi";
import DateInput from "../../components/DateInput";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ITEM = {
    material_id: "",
    material_name: "",
    grade: "",
    hsn_code: "",
    unit: "",
    ordered_quantity: 0,
    received_quantity: "",
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
    supplier_batch_number: "",
    internal_batch_number: "",
    number_of_bags: "",
    kgs_per_bag_option: "",
    kgs_per_bag: "",
    total_kg: "",
    _locked: false, // true when pre-filled from PO
};

const EMPTY_HEADER = {
    name: "",
    vendor_id: "",
    grn_date: new Date().toISOString().split("T")[0],
    address: "",
    gstin: "",
    purchase_type: "",
    state: "",
    state_code: "",
    job_party_id: "",
    job_party_name: "",
    transportation_mode: "",
    vehicle_number: "",
    invoice_number: "",
    invoice_date: "",
    challan_number: "",
    challan_date: "",
    total_amount: 0,
    tc_id: "",
    tc_description: "",
    po_number: "",
    location_id: "",
    location_name: "",
    remarks: "",
    status: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v) => (v === "" || v === null || v === undefined ? 0 : parseFloat(v) || 0);

const recalcItem = (item) => {
    const qty = n(item.received_quantity);
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

const incrementBatchNumber = (batchStr, incrementBy) => {
    if (!batchStr || incrementBy === 0) return batchStr;
    const len = batchStr.length;
    if (len < 4) return batchStr;
    const suffix = batchStr.slice(-4);
    if (/^\d+$/.test(suffix)) {
        const prefixOfBatch = batchStr.slice(0, -4);
        const num = parseInt(suffix, 10) + incrementBy;
        const paddedNum = String(num).padStart(4, '0');
        return prefixOfBatch + paddedNum;
    }
    return batchStr;
};

const getPreviewBatchNumber = (item, idx, itemsList, basePreviews) => {
    if (item.internal_batch_number) {
        return item.internal_batch_number;
    }
    if (!item.material_id) {
        return "—";
    }
    const baseVal = basePreviews[item.material_id];
    if (!baseVal) {
        return "—";
    }
    if (baseVal === "loading") {
        return "—";
    }
    // Count how many new items before idx have the same material_id
    let countBefore = 0;
    for (let i = 0; i < idx; i++) {
        const other = itemsList[i];
        if (
            other.material_id === item.material_id &&
            !other.internal_batch_number
        ) {
            countBefore++;
        }
    }
    return incrementBatchNumber(baseVal, countBefore);
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateGrn() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const poIdFromUrl = searchParams.get("po_id");
    const isEdit = Boolean(id);

    const inputCls = "w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors text-slate-800 bg-white text-sm";
    const readOnlyCls = "w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-600 bg-slate-50 focus:outline-none cursor-default";
    const labelCls = "block text-sm font-medium text-slate-700 mb-1";

    const [header, setHeader] = useState({ ...EMPTY_HEADER, po_id: poIdFromUrl || "" });
    const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
    const [materialTypes, setMaterialTypes] = useState([]);
    const [materialsMap, setMaterialsMap] = useState({});
    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [vendorsList, setVendorsList] = useState([]);
    const [jobPartiesList, setJobPartiesList] = useState([]);
    const [tcList, setTcList] = useState([]);
    const [locationsList, setLocationsList] = useState([]);
    const [orgStateCode, setOrgStateCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null);
    const [linkedPoNumber, setLinkedPoNumber] = useState("");
    const [batchSettings, setBatchSettings] = useState(null);
    const [baseBatchPreviews, setBaseBatchPreviews] = useState({});

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ─── Fetch materials ──────────────────────────────────────────────────────

    const fetchMaterialsForType = useCallback(async (type) => {
        if (!type || materialsMap[type]) return;
        try {
            const res = await getMaterialsByType(type);
            setMaterialsMap(prev => ({ ...prev, [type]: res.data?.data || [] }));
        } catch {
            console.error("Failed to load materials for type:", type);
        }
    }, [materialsMap]);

    // ─── GST mode ─────────────────────────────────────────────────────────────

    const isIntraState = header.state_code && orgStateCode &&
        header.state_code.trim().toLowerCase() === orgStateCode.trim().toLowerCase();

    // ─── Grand total ──────────────────────────────────────────────────────────

    const grandTotal = items.reduce((sum, it) => sum + n(it.total_amount), 0);

    // ─── Initial load ─────────────────────────────────────────────────────────

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const [typesRes, orgRes, tcRes, rawMatRes, vendorsRes, jobPartiesRes, locationsRes, batchRes] = await Promise.all([
                    getMaterialTypes(),
                    getOrganizationDetails(),
                    getTermsAndConditions(),
                    getRawMaterials(),
                    getVendorsForGrn(),
                    getJobPartiesForGrn(),
                    getLocations(),
                    getBatchConfig()
                ]);
                setMaterialTypes(typesRes.data?.data || []);
                setOrgStateCode(orgRes.data?.data?.state_code || "");
                setTcList(tcRes.data?.data || []);
                setRawMaterialsList(rawMatRes.data?.data || []);
                setVendorsList(vendorsRes.data?.data || []);
                setJobPartiesList(jobPartiesRes.data?.data || []);
                setLocationsList(locationsRes.data?.data || []);
                setBatchSettings(batchRes.data?.data || null);

                // ── EDIT mode: load existing GRN ──────────────────────────────
                if (isEdit) {
                    const grnRes = await getGrnById(id);
                    const grn = grnRes.data?.data;
                    if (grn) {
                        setLinkedPoNumber(grn.po_number || "");
                        setHeader({
                            name: grn.name || "",
                            vendor_id: grn.vendor_id || "",
                            grn_date: grn.grn_date ? grn.grn_date.split("T")[0] : new Date().toISOString().split("T")[0],
                            address: grn.address || "",
                            gstin: grn.gstin || "",
                            purchase_type: grn.purchase_type || "",
                            state: grn.state || "",
                            state_code: grn.state_code || "",
                            job_party_id: grn.job_party_id || "",
                            job_party_name: grn.job_party_name || "",
                            transportation_mode: grn.transportation_mode || "",
                            vehicle_number: grn.vehicle_number || "",
                            invoice_number: grn.invoice_number || "",
                            invoice_date: grn.invoice_date ? grn.invoice_date.split("T")[0] : "",
                            challan_number: grn.challan_number || "",
                            challan_date: grn.challan_date ? grn.challan_date.split("T")[0] : "",
                            total_amount: grn.total_amount || 0,
                            tc_id: grn.tc_id || "",
                            tc_description: grn.tc_description || "",
                            po_id: grn.po_id || "",
                            po_number: grn.po_number || "",
                            location_id: grn.location_id || "",
                            location_name: grn.location_name || "",
                            remarks: grn.remarks || "",
                            status: grn.status || "",
                        });
                        if (grn.purchase_type) await fetchMaterialsForType(grn.purchase_type);
                        if (grn.items?.length > 0) {
                            setItems(grn.items.map(item => ({
                                id: item.id || null,
                                material_id: item.material_id || "",
                                material_name: item.material_name || "",
                                grade: item.grade || "",
                                hsn_code: item.hsn_code || "",
                                unit: item.unit || "",
                                ordered_quantity: item.ordered_quantity || 0,
                                already_received: item.already_received || 0,
                                received_quantity: item.received_quantity || "",
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
                                supplier_batch_number: item.supplier_batch_number || "",
                                internal_batch_number: item.internal_batch_number || "",
                                number_of_bags: item.number_of_bags || "",
                                kgs_per_bag_option: [15, 20, 25, 30].includes(Number(item.kgs_per_bag)) ? String(Number(item.kgs_per_bag)) : (item.kgs_per_bag ? "oth" : ""),
                                kgs_per_bag: item.kgs_per_bag || "",
                                total_kg: item.total_kg || "",
                                _locked: Boolean(grn.po_id),
                            })));
                        }
                    }
                // ── PO-LINKED create mode ─────────────────────────────────────
                } else if (poIdFromUrl) {
                    const poRes = await getPurchaseOrderById(poIdFromUrl);
                    const po = poRes.data?.data;
                    if (po) {
                        setLinkedPoNumber(po.po_number || "");
                        const vendorsList2 = vendorsRes.data?.data || [];
                        const matchedVendor = vendorsList2.find(v => String(v.id) === String(po.vendor_id));

                        setHeader(prev => ({
                            ...prev,
                            name: po.name || "",
                            vendor_id: po.vendor_id || "",
                            address: po.address || "",
                            gstin: po.gstin || "",
                            purchase_type: po.purchase_type || "",
                            state: po.state || "",
                            state_code: po.state_code || "",
                            tc_id: po.tc_id || "",
                            tc_description: po.tc_description || "",
                            po_id: poIdFromUrl,
                            po_number: po.po_number || "",
                        }));

                        if (po.purchase_type) await fetchMaterialsForType(po.purchase_type);

                        if (po.items?.length > 0) {
                            const initialItems = po.items.map(item => {
                                const pending = Math.max(0, (item.quantity || 0) - (item.already_received || 0));
                                const grnItem = {
                                    material_id: item.material_id || "",
                                    material_name: item.material_name || "",
                                    grade: item.grade || "",
                                    hsn_code: item.hsn_code || "",
                                    unit: item.unit || "",
                                    ordered_quantity: item.quantity || 0,
                                    already_received: item.already_received || 0,
                                    received_quantity: pending > 0 ? pending : "",
                                    rate: item.rate || "",
                                    amount: 0,
                                    discount_percent: item.discount_percent || "",
                                    taxable_amount: 0,
                                    cgst_percent: item.cgst_percent || "",
                                    cgst_amount: 0,
                                    sgst_percent: item.sgst_percent || "",
                                    sgst_amount: 0,
                                    igst_percent: item.igst_percent || "",
                                    igst_amount: 0,
                                    total_amount: 0,
                                    supplier_batch_number: "",
                                    internal_batch_number: "",
                                    number_of_bags: "",
                                    kgs_per_bag_option: "",
                                    kgs_per_bag: "",
                                    total_kg: "",
                                    _locked: true,
                                };
                                return recalcItem(grnItem);
                            });
                            setItems(initialItems);
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

    // ─── Fetch batch preview for materials dynamically ─────────────────────────
    useEffect(() => {
        const missingMatIds = items
            .map(it => it.material_id)
            .filter(id => id && baseBatchPreviews[id] === undefined);

        if (missingMatIds.length > 0) {
            // Mark them as loading immediately to prevent duplicate fetches
            setBaseBatchPreviews(prev => {
                const next = { ...prev };
                missingMatIds.forEach(id => {
                    next[id] = "loading";
                });
                return next;
            });

            // Fetch each missing material preview
            missingMatIds.forEach(async (matId) => {
                try {
                    const res = await getNextBatchNumber(matId);
                    const val = res.data?.data || "";
                    setBaseBatchPreviews(prev => ({ ...prev, [matId]: val }));
                } catch (err) {
                    console.error("Failed to load batch preview for material", matId, err);
                    setBaseBatchPreviews(prev => {
                        const next = { ...prev };
                        delete next[matId];
                        return next;
                    });
                }
            });
        }
    }, [items, baseBatchPreviews]);

    // ─── GST split update for all items ──────────────────────────────────────

    const updateItemsGstSplit = (targetStateCode) => {
        const nextIntra = targetStateCode && orgStateCode &&
            String(targetStateCode).trim().toLowerCase() === String(orgStateCode).trim().toLowerCase();
        setItems(prev => prev.map(item => {
            if (!item.material_id) return item;
            const mats = materialsMap[header.purchase_type] || [];
            const mat = mats.find(m => String(m.id) === String(item.material_id));
            if (!mat) return item;
            const gstVal = n(mat.gst_percent);
            let updated = { ...item };
            if (nextIntra) {
                updated.cgst_percent = gstVal / 2;
                updated.sgst_percent = gstVal / 2;
                updated.igst_percent = 0;
            } else {
                updated.cgst_percent = 0;
                updated.sgst_percent = 0;
                updated.igst_percent = gstVal;
            }
            return recalcItem(updated);
        }));
    };

    // ─── Header change ────────────────────────────────────────────────────────

    const handleHeaderChange = async (field, value) => {
        setHeader(prev => {
            let nextHeader = { ...prev, [field]: value };
            return nextHeader;
        });
        setErrors(prev => ({ ...prev, [field]: "" }));

        if (field === "purchase_type") {
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
                setHeader(prev => ({ ...prev, vendor_id: "", name: "", gstin: "", state: "", state_code: "", address: "" }));
                updateItemsGstSplit("");
            }
        }
        if (field === "job_party_id") {
            const party = jobPartiesList.find(p => String(p.id) === String(value));
            setHeader(prev => ({
                ...prev,
                job_party_id: value,
                job_party_name: party ? (party.party_name || "") : "",
            }));
        }
        if (field === "location_id") {
            const loc = locationsList.find(l => String(l.id) === String(value));
            setHeader(prev => ({
                ...prev,
                location_id: value,
                location_name: loc ? (loc.location_name || "") : "",
            }));
        }
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
        setErrors(prev => ({ ...prev, [`item_${idx}_received_quantity`]: "" }));
        setItems(prev => {
            const updated = [...prev];
            let item = { ...updated[idx], [field]: value };

            if (field === "kgs_per_bag_option") {
                if (value !== "oth" && value !== "") {
                    item.kgs_per_bag = value;
                } else if (value === "oth") {
                    item.kgs_per_bag = "";
                }
            }

            if (field === "received_quantity" || field === "kgs_per_bag" || field === "kgs_per_bag_option") {
                const received = n(field === "received_quantity" ? value : item.received_quantity);
                const size = n(item.kgs_per_bag);
                if (size > 0) {
                    item.number_of_bags = Math.floor(received / size);
                    item.total_kg = +(received - (item.number_of_bags * size)).toFixed(4); // remainder
                } else {
                    item.number_of_bags = "";
                    item.total_kg = "";
                }
            }

            if (field === "material_id") {
                const mats = materialsMap[header.purchase_type] || [];
                const mat = mats.find(m => String(m.id) === String(value));
                if (mat) {
                    item.material_name = mat.material_name;
                    item.grade = "";
                    item.hsn_code = mat.hsn_code || "";
                    item.unit = mat.unit_name || "";
                    
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
        if (!header.grn_date) e.grn_date = "GRN Date is required";
        if (!header.job_party_id) e.job_party_id = "Job Party is required";

        items.forEach((item, idx) => {
            const received = n(item.received_quantity);
            if (received < 0) {
                e[`item_${idx}_received_quantity`] = "Received qty cannot be negative";
            }
        });

        const validItems = items.filter(item => n(item.received_quantity) > 0);
        if (validItems.length === 0) {
            e.general = "At least one item must have a received quantity greater than 0";
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async (e, overrideStatus) => {
        if (e) e.preventDefault();
        if (!validate()) {
            showToast("Please fix the errors before saving", "error");
            return;
        }
        setSaving(true);
        try {
            const finalStatus = overrideStatus !== undefined ? overrideStatus : header.status;
            const payload = {
                header: {
                    ...header,
                    status: finalStatus || null,
                    total_amount: grandTotal,
                    tc_id: header.tc_id || null,
                    tc_description: header.tc_description || null,
                    po_id: header.po_id || null,
                    job_party_id: header.job_party_id || null,
                    invoice_date: header.invoice_date || null,
                    challan_date: header.challan_date || null,
                    location_id: header.location_id || null,
                    location_name: header.location_name || null,
                },
                items: items
                    .filter(item => n(item.received_quantity) > 0)
                    .map(item => ({
                    ...item,
                    id: item.id || null,
                    ordered_quantity: n(item.ordered_quantity),
                    received_quantity: n(item.received_quantity),
                    rate: n(item.rate),
                    discount_percent: n(item.discount_percent),
                    cgst_percent: isIntraState ? n(item.cgst_percent) : 0,
                    sgst_percent: isIntraState ? n(item.sgst_percent) : 0,
                    igst_percent: !isIntraState ? n(item.igst_percent) : 0,
                    supplier_batch_number: item.supplier_batch_number || null,
                    internal_batch_number: item.internal_batch_number || null,
                    number_of_bags: item.number_of_bags || null,
                    kgs_per_bag: item.kgs_per_bag || null,
                    total_kg: item.total_kg || null,
                })),
            };

            if (isEdit) {
                await updateGrn(id, payload);
                showToast("GRN updated successfully");
            } else {
                await createGrn(payload);
                showToast("GRN created successfully");
            }
            setTimeout(() => navigate("/purchase/grn"), 1200);
        } catch (err) {
            const msg = err?.response?.data?.message || "Failed to save GRN";
            showToast(msg, "error");
        } finally {
            setSaving(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar title={isEdit ? "Edit GRN" : "Create GRN"} />
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
    const isPoLinked = Boolean(header.po_id);
    const isClosed = header.status === "closed";
    const hasPendingQty = isPoLinked && items.some(item => n(item.ordered_quantity) > 0 && n(item.received_quantity) < n(item.ordered_quantity));

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar title={isEdit ? "Edit GRN" : "Create GRN"} />

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-3 ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
                    <i className={`fa-solid ${toast.type === "error" ? "fa-circle-xmark" : "fa-circle-check"}`}></i>
                    {toast.message}
                </div>
            )}

            <form onSubmit={(e) => handleSubmit(e)} className="mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Page Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#369ACF]/10 text-[#369ACF]">
                                <i className="fa-solid fa-truck-ramp-box text-sm"></i>
                            </span>
                            {isEdit ? "Edit GRN" : "Create GRN"}
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">
                            {isPoLinked
                                ? `Linked to Purchase Order: `
                                : "Fill in the details to create a new Goods Receipt Note."}
                            {isPoLinked && (
                                <span className="font-mono font-semibold text-[#369ACF] bg-[#369ACF]/8 px-2 py-0.5 rounded-md border border-[#369ACF]/15 text-xs ml-1">
                                    {linkedPoNumber || header.po_number}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => navigate("/purchase/grn")}
                            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer">
                            <i className="fa-solid fa-arrow-left"></i> Back to List
                        </button>
                        {!isClosed && (
                            <>
                                {isPoLinked && hasPendingQty && (
                                    <button type="button" onClick={(e) => handleSubmit(e, "partially_closed")} disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg cursor-pointer transition-all shadow-sm disabled:opacity-60 ml-2">
                                        <i className="fa-solid fa-folder-open text-slate-500 text-xs"></i> Partially Close
                                    </button>
                                )}
                                {(!isPoLinked || !hasPendingQty) && (
                                    <button type="button" onClick={(e) => handleSubmit(e, "closed")} disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-all shadow-sm disabled:opacity-60 ml-1">
                                        <i className="fa-solid fa-lock text-xs"></i> Close GRN
                                    </button>
                                )}
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#369ACF] rounded-lg hover:bg-[#032a52] cursor-pointer transition-all shadow-sm disabled:opacity-60 ml-1">
                                    {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-xs"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk text-xs"></i> {isEdit ? "Update GRN" : "Save GRN"}</>}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {isClosed && (
                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold mb-6 animate-in fade-in duration-200">
                        <i className="fa-solid fa-lock text-rose-600 text-base"></i>
                        <span>This Goods Receipt Note is Closed. Editing is disabled.</span>
                    </div>
                )}

                <fieldset disabled={isClosed} className="space-y-6 block w-full border-none p-0 m-0 min-w-0">

                {/* ── GRN HEADER SECTION ── */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-file-lines text-[#369ACF]"></i>
                            GRN Details
                        </h2>
                        <div className="flex items-center gap-2">
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
                            {isPoLinked && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                                    <i className="fa-solid fa-link text-[10px]"></i> PO Linked
                                </span>
                            )}
                        </div>
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

                        {/* GRN Date */}
                        <div>
                            <label className={labelCls}>GRN Date <span className="text-red-500">*</span></label>
                            <DateInput value={header.grn_date} onChange={e => handleHeaderChange("grn_date", e.target.value)} />
                            {errors.grn_date && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><i className="fa-solid fa-circle-exclamation text-[10px]"></i> {errors.grn_date}</p>}
                        </div>

                        {/* Linked PO (read-only, only when linked) */}
                        {isPoLinked && (
                            <div>
                                <label className={labelCls}>Linked Purchase Order</label>
                                <div className={readOnlyCls}>
                                    <span className="font-mono font-semibold text-[#369ACF]">
                                        {linkedPoNumber || header.po_number}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* GSTIN */}
                        <div>
                            <label className={labelCls}>GSTIN</label>
                            <input type="text" value={header.gstin} onChange={e => handleHeaderChange("gstin", e.target.value)}
                                placeholder="e.g. 22AAAAA0000A1Z5"
                                className={`${inputCls} border-slate-300 uppercase`} />
                        </div>

                        {/* Purchase Type */}
                        <div>
                            <label className={labelCls}>Purchase Type</label>
                            <select value={header.purchase_type}
                                onChange={e => handleHeaderChange("purchase_type", e.target.value)}
                                disabled={isPoLinked}
                                className={`${inputCls} border-slate-300 cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-default`}>
                                <option value="">— Select Type —</option>
                                {materialTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* State */}
                        <div>
                            <label className={labelCls}>State</label>
                            <input type="text" value={header.state} onChange={e => handleHeaderChange("state", e.target.value)}
                                placeholder="e.g. Maharashtra"
                                className={`${inputCls} border-slate-300`} />
                        </div>

                        {/* State Code */}
                        <div>
                            <label className={labelCls}>
                                State Code
                                {orgStateCode && <span className="ml-1.5 text-slate-400 normal-case font-normal">(Org: {orgStateCode})</span>}
                            </label>
                            <input type="text" value={header.state_code} onChange={e => handleHeaderChange("state_code", e.target.value)}
                                placeholder="e.g. 27"
                                className={`${inputCls} border-slate-300`} />
                        </div>

                        {/* Job Party Name */}
                        <div>
                            <label className={labelCls}>Job Party Name <span className="text-red-500">*</span></label>
                            <select
                                value={header.job_party_id}
                                onChange={e => handleHeaderChange("job_party_id", e.target.value)}
                                className={`${inputCls} ${errors.job_party_id ? "border-red-400 bg-red-50" : "border-slate-300"} cursor-pointer`}
                            >
                                <option value="">— Select Job Party —</option>
                                {jobPartiesList.map(p => (
                                    <option key={p.id} value={p.id}>{p.party_name}</option>
                                ))}
                            </select>
                            {errors.job_party_id && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><i className="fa-solid fa-circle-exclamation text-[10px]"></i> {errors.job_party_id}</p>}
                        </div>

                        {/* Location Dropdown */}
                        <div>
                            <label className={labelCls}>Location</label>
                            <select
                                value={header.location_id}
                                onChange={e => handleHeaderChange("location_id", e.target.value)}
                                className={`${inputCls} border-slate-300 cursor-pointer`}
                            >
                                <option value="">— Select Location —</option>
                                {locationsList.map(l => (
                                    <option key={l.id} value={l.id}>{l.location_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Removed global total_quantity, bag_size, number_of_bags */}

                        {/* Address */}
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Address</label>
                            <textarea value={header.address} onChange={e => handleHeaderChange("address", e.target.value)}
                                placeholder="Enter delivery/billing address"
                                rows={2}
                                className={`${inputCls} border-slate-300 resize-none`} />
                        </div>

                        {/* Remarks */}
                        <div className="sm:col-span-1">
                            <label className={labelCls}>Remarks</label>
                            <textarea value={header.remarks} onChange={e => handleHeaderChange("remarks", e.target.value)}
                                placeholder="Enter any notes or remarks"
                                rows={2}
                                className={`${inputCls} border-slate-300 resize-none`} />
                        </div>
                    </div>

                    {/* ── Logistics Section ── */}
                    <div className="mt-6 pt-5 border-t border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-truck text-slate-400"></i>
                            Logistics & Invoice Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {/* Transportation Mode */}
                            <div>
                                <label className={labelCls}>Transportation Mode</label>
                                <input type="text" value={header.transportation_mode}
                                    onChange={e => handleHeaderChange("transportation_mode", e.target.value)}
                                    placeholder="e.g. Road, Rail, Air"
                                    className={`${inputCls} border-slate-300`} />
                            </div>

                            {/* Vehicle Number */}
                            <div>
                                <label className={labelCls}>Vehicle Number</label>
                                <input type="text" value={header.vehicle_number}
                                    onChange={e => handleHeaderChange("vehicle_number", e.target.value)}
                                    placeholder="e.g. MH12AB1234"
                                    className={`${inputCls} border-slate-300 uppercase`} />
                            </div>

                            {/* Invoice Number */}
                            <div>
                                <label className={labelCls}>Invoice Number</label>
                                <input type="text" value={header.invoice_number}
                                    onChange={e => handleHeaderChange("invoice_number", e.target.value)}
                                    placeholder="Vendor invoice no."
                                    className={`${inputCls} border-slate-300`} />
                            </div>

                            {/* Invoice Date */}
                            <div>
                                <label className={labelCls}>Invoice Date</label>
                                <DateInput value={header.invoice_date}
                                    onChange={e => handleHeaderChange("invoice_date", e.target.value)} />
                            </div>

                            {/* Challan Number */}
                            <div>
                                <label className={labelCls}>Challan Number</label>
                                <input type="text" value={header.challan_number}
                                    onChange={e => handleHeaderChange("challan_number", e.target.value)}
                                    placeholder="Delivery challan no."
                                    className={`${inputCls} border-slate-300`} />
                            </div>

                            {/* Challan Date */}
                            <div>
                                <label className={labelCls}>Challan Date</label>
                                <DateInput value={header.challan_date}
                                    onChange={e => handleHeaderChange("challan_date", e.target.value)} />
                            </div>
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
                        {isPoLinked && (
                            <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                                <i className="fa-solid fa-lock text-[10px]"></i>
                                Items pre-filled from PO — enter Received Qty
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
                                    <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[130px]">Supplier Batch No.</th>
                                    <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[130px]">Internal Batch No.</th>
                                    {header.purchase_type?.toLowerCase().includes("raw material") && (
                                        <>
                                            <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[80px]">Bags</th>
                                            <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[120px]">Kgs/Bag</th>
                                            <th className="px-3 py-3 text-left font-semibold text-slate-500 whitespace-nowrap min-w-[90px]">Remainder Qty (Kg)</th>
                                        </>
                                    )}
                                    <th className="px-3 py-3 text-left font-semibold text-slate-400 whitespace-nowrap min-w-[80px]">Ordered Qty</th>
                                    {isPoLinked && (
                                        <th className="px-3 py-3 text-left font-semibold text-amber-600 whitespace-nowrap min-w-[80px]">Pending Qty</th>
                                    )}
                                    <th className="px-3 py-3 text-left font-semibold text-[#369ACF] whitespace-nowrap min-w-[100px]">Received Qty <span className="text-red-500">*</span></th>
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
                                    {!isPoLinked && <th className="px-3 py-3 text-center font-semibold text-slate-500 whitespace-nowrap w-10"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const recvErr = errors[`item_${idx}_received_quantity`];
                                    const locked = item._locked;
                                    return (
                                        <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors group ${recvErr ? "bg-red-50/40" : ""}`}>
                                            {/* # */}
                                            <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                                            {/* Material Name */}
                                            <td className="px-3 py-2.5">
                                                {locked ? (
                                                    <div className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 font-medium truncate">
                                                        {item.material_name || "—"}
                                                    </div>
                                                ) : (
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
                                                )}
                                            </td>

                                            {/* Grade (Conditional) */}
                                            {header.purchase_type?.toLowerCase().includes("raw material") && (
                                                <td className="px-3 py-2.5">
                                                    {locked ? (
                                                        <div className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700">{item.grade || "—"}</div>
                                                    ) : (() => {
                                                        if (!item.material_id) return (
                                                            <input type="text" disabled value="Select Material First"
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-400 focus:outline-none" />
                                                        );
                                                        const availableGrades = rawMaterialsList.filter(rm => String(rm.material_id) === String(item.material_id));
                                                        if (availableGrades.length === 0) return (
                                                            <span className="block px-2.5 py-2 text-[10px] text-amber-600 bg-amber-50 rounded-lg border border-amber-200 truncate">
                                                                Grade not available
                                                            </span>
                                                        );
                                                        return (
                                                            <select
                                                                value={item.grade}
                                                                onChange={e => handleItemChange(idx, "grade", e.target.value)}
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white cursor-pointer"
                                                            >
                                                                <option value="">— Grade —</option>
                                                                {availableGrades.map(g => (
                                                                    <option key={g.id} value={g.grade}>{g.grade}</option>
                                                                ))}
                                                            </select>
                                                        );
                                                    })()}
                                                </td>
                                            )}

                                            {/* HSN */}
                                            <td className="px-3 py-2.5">
                                                <input type="text" value={item.hsn_code} readOnly
                                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 focus:outline-none" placeholder="Auto" />
                                            </td>

                                            {/* Unit */}
                                            <td className="px-3 py-2.5">
                                                <input type="text" value={item.unit} readOnly
                                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 focus:outline-none" placeholder="Auto" />
                                            </td>

                                            {/* Supplier Batch Number */}
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="text"
                                                    value={item.supplier_batch_number || ""}
                                                    onChange={e => handleItemChange(idx, "supplier_batch_number", e.target.value)}
                                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white"
                                                    placeholder="Supplier Batch"
                                                />
                                            </td>

                                            {/* Internal Batch Number */}
                                            <td className="px-3 py-2.5">
                                                {item.internal_batch_number ? (
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1.5 bg-[#369ACF]/10 text-[#369ACF] border border-[#369ACF]/20 rounded font-mono font-bold text-[11px]">
                                                        {item.internal_batch_number}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded font-mono text-[11px] whitespace-nowrap">
                                                        {getPreviewBatchNumber(item, idx, items, baseBatchPreviews)}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Bags & Kgs/Bag (Raw Materials Only) */}
                                            {header.purchase_type?.toLowerCase().includes("raw material") && (
                                                <>
                                                    <td className="px-3 py-2.5">
                                                        <input
                                                            type="number" value={item.number_of_bags} readOnly
                                                            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-500 focus:outline-none tabular-nums"
                                                            placeholder="Auto"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <select
                                                                value={item.kgs_per_bag_option || ""}
                                                                onChange={e => handleItemChange(idx, "kgs_per_bag_option", e.target.value)}
                                                                className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white cursor-pointer"
                                                            >
                                                                <option value="">— Select —</option>
                                                                <option value="15">15</option>
                                                                <option value="20">20</option>
                                                                <option value="25">25</option>
                                                                <option value="30">30</option>
                                                                <option value="oth">Other</option>
                                                            </select>
                                                            {item.kgs_per_bag_option === "oth" && (
                                                                <input
                                                                    type="number" min="0" step="any"
                                                                    value={item.kgs_per_bag}
                                                                    onChange={e => handleItemChange(idx, "kgs_per_bag", e.target.value)}
                                                                    className="w-full px-2.5 py-2 border border-[#369ACF]/40 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white"
                                                                    placeholder="Custom Kgs"
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <input
                                                            type="number" value={item.total_kg} readOnly
                                                            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-500 focus:outline-none tabular-nums"
                                                            placeholder="Auto"
                                                        />
                                                    </td>
                                                </>
                                            )}

                                            {/* Ordered Qty (read-only) */}
                                            <td className="px-3 py-2.5">
                                                <input type="number" value={item.ordered_quantity} readOnly
                                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-500 focus:outline-none tabular-nums" />
                                            </td>

                                            {/* Pending Qty (read-only, only for PO-linked) */}
                                            {isPoLinked && (
                                                <td className="px-3 py-2.5">
                                                    <input type="number" value={Math.max(0, item.ordered_quantity - (item.already_received || 0))} readOnly
                                                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-amber-50/50 text-amber-700 font-semibold focus:outline-none tabular-nums" />
                                                </td>
                                            )}

                                            {/* Received Qty (editable) */}
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="number" min={0} step="any"
                                                    value={item.received_quantity}
                                                    onChange={e => handleItemChange(idx, "received_quantity", e.target.value)}
                                                    className={`w-full px-2.5 py-2 border rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 bg-white font-semibold ${recvErr ? "border-red-400 ring-2 ring-red-200" : "border-[#369ACF]/40 focus:ring-[#369ACF]/20"}`}
                                                    placeholder="Enter qty"
                                                />
                                                {recvErr && (
                                                    <p className="text-red-500 text-[10px] mt-0.5 flex items-center gap-1">
                                                        <i className="fa-solid fa-circle-exclamation text-[9px]"></i>
                                                        {recvErr}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Rate */}
                                            <td className="px-3 py-2.5">
                                                <input type="number" min={0} step="any" value={item.rate}
                                                    onChange={e => handleItemChange(idx, "rate", e.target.value)}
                                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white" placeholder="0.00" />
                                            </td>

                                            {/* Amount */}
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-700 tabular-nums">
                                                {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </td>

                                            {/* Disc % */}
                                            <td className="px-3 py-2.5">
                                                <input type="number" min={0} max={100} step="any" value={item.discount_percent}
                                                    onChange={e => handleItemChange(idx, "discount_percent", e.target.value)}
                                                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#369ACF]/20 bg-white" placeholder="0" />
                                            </td>

                                            {/* Taxable */}
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-700 tabular-nums">
                                                {item.taxable_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </td>

                                            {/* GST */}
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

                                            {/* Remove (only for standalone) */}
                                            {!isPoLinked && (
                                                <td className="px-3 py-2.5 text-center">
                                                    <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-20 cursor-pointer transition-all mx-auto">
                                                        <i className="fa-solid fa-xmark text-xs"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Item Row */}
                    {!isPoLinked && (
                        <div className="mt-4 flex items-center justify-between">
                            <button type="button" onClick={addItem}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#369ACF] border border-[#369ACF]/20 bg-white rounded-xl hover:bg-[#369ACF]/5 cursor-pointer transition-all shadow-sm">
                                <i className="fa-solid fa-plus text-[10px]"></i> Add Row
                            </button>
                            <div className="text-right">
                                <span className="text-xs text-slate-500">Grand Total</span>
                                <div className="text-lg font-bold text-slate-900 tabular-nums">
                                    ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Grand Total for PO-linked */}
                    {isPoLinked && (
                        <div className="mt-4 flex justify-end">
                            <div className="text-right">
                                <span className="text-xs text-slate-500">Grand Total (based on received qty)</span>
                                <div className="text-lg font-bold text-slate-900 tabular-nums">
                                    ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── TERMS & CONDITIONS SECTION ── */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
                        <i className="fa-solid fa-scroll text-[#369ACF]"></i>
                        Terms &amp; Conditions
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label className={labelCls}>Select T&amp;C Template</label>
                            <select value={header.tc_id} onChange={e => handleHeaderChange("tc_id", e.target.value)}
                                className={`${inputCls} border-slate-300 cursor-pointer`}>
                                <option value="">— None —</option>
                                {tcList.map(tc => (
                                    <option key={tc.id} value={tc.id}>{tc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Description</label>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <ReactQuill
                                theme="snow"
                                value={header.tc_description}
                                onChange={(val) => setHeader(prev => ({ ...prev, tc_description: val }))}
                                style={{ minHeight: "160px" }}
                                readOnly={isClosed}
                                modules={{
                                    toolbar: [
                                        [{ header: [1, 2, 3, false] }],
                                        ['bold', 'italic', 'underline'],
                                        [{ list: 'ordered' }, { list: 'bullet' }],
                                        ['clean'],
                                    ]
                                }}
                            />
                        </div>
                    </div>
                </div>

                </fieldset>
 
                {/* ── SUBMIT FOOTER ── */}
                <div className="flex items-center justify-end gap-3 pb-8 mt-6">
                    <button type="button" onClick={() => navigate("/purchase/grn")}
                        className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                        {isClosed ? "Back to List" : "Cancel"}
                    </button>
                    {!isClosed && (
                        <>
                            {isPoLinked && hasPendingQty && (
                                <button type="button" onClick={(e) => handleSubmit(e, "partially_closed")} disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg cursor-pointer transition-all shadow-sm disabled:opacity-60">
                                    <i className="fa-solid fa-folder-open text-slate-500 text-xs"></i> Partially Close
                                </button>
                            )}
                            {(!isPoLinked || !hasPendingQty) && (
                                <button type="button" onClick={(e) => handleSubmit(e, "closed")} disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-all shadow-sm disabled:opacity-60">
                                    <i className="fa-solid fa-lock text-xs"></i> Close GRN
                                </button>
                            )}
                            <button type="submit" disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#369ACF] rounded-lg hover:bg-[#032a52] cursor-pointer transition-all shadow-sm disabled:opacity-60">
                                {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-xs"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk text-xs"></i> {isEdit ? "Update GRN" : "Save GRN"}</>}
                            </button>
                        </>
                    )}
                </div>

            </form>
        </div>
    );
}
