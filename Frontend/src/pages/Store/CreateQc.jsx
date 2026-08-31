import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { getGrnById } from "../../api/grnApi";
import { getMaterialAddById } from "../../api/materialAddApi";
import { getPendingQcItemsByGrnId, getPendingQcItemsByMaId, createQcDocument } from "../../api/qcApi";
import toast from "react-hot-toast";

export default function CreateQc() {
    const { sourceType = "grn", sourceId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [sourceData, setSourceData] = useState(null);
    const [items, setItems] = useState([]);

    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        const fetchSourceAndItems = async () => {
            setLoading(true);
            try {
                let headerRes, itemsRes;
                if (sourceType === "ma") {
                    [headerRes, itemsRes] = await Promise.all([
                        getMaterialAddById(sourceId),
                        getPendingQcItemsByMaId(sourceId)
                    ]);
                } else {
                    [headerRes, itemsRes] = await Promise.all([
                        getGrnById(sourceId),
                        getPendingQcItemsByGrnId(sourceId)
                    ]);
                }

                setSourceData(headerRes.data?.data || null);

                const fetchedItems = itemsRes.data?.data || [];
                // Initialize form values
                const initItems = fetchedItems.map(item => ({
                    ...item,
                    approved_now: item.pending_qc_quantity,
                    rejected_now: 0,
                    rejection_type: "reject",
                    qc_remarks: ""
                }));
                setItems(initItems);
            } catch (error) {
                console.error("Failed to load QC data", error);
                toast.error(`Failed to load ${sourceType.toUpperCase()} details for QC.`);
            } finally {
                setLoading(false);
            }
        };
        fetchSourceAndItems();
    }, [sourceType, sourceId]);

    const handleItemChange = useCallback((itemId, field, value) => {
        setItems(prevItems => {
            const newItems = [...prevItems];
            const idx = newItems.findIndex(i => (sourceType === "ma" ? i.ma_item_id : i.grn_item_id) === itemId);
            if (idx === -1) return prevItems;

            let val = (field === "qc_remarks" || field === "rejection_type") ? value : parseFloat(value) || 0;

            if (field === "approved_now" || field === "rejected_now") {
                if (val < 0) val = 0;
                newItems[idx][field] = val;

                // Auto-balance if they exceed pending
                const pending = parseFloat(newItems[idx].pending_qc_quantity);
                const approved = parseFloat(newItems[idx].approved_now) || 0;
                const rejected = parseFloat(newItems[idx].rejected_now) || 0;

                if (approved + rejected > pending) {
                    if (field === "approved_now") {
                        newItems[idx].rejected_now = pending - approved;
                        if (newItems[idx].rejected_now < 0) {
                            newItems[idx].approved_now = pending;
                            newItems[idx].rejected_now = 0;
                        }
                    } else {
                        newItems[idx].approved_now = pending - rejected;
                        if (newItems[idx].approved_now < 0) {
                            newItems[idx].rejected_now = pending;
                            newItems[idx].approved_now = 0;
                        }
                    }
                }
            } else {
                newItems[idx][field] = val;
            }
            return newItems;
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const hasValidItem = items.some(item => (item.approved_now > 0 || item.rejected_now > 0));
        if (!hasValidItem) {
            toast.error("Please approve or reject at least one item quantity.");
            return;
        }

        const payload = {
            headerData: {
                qc_date: new Date().toISOString().split('T')[0],
                grn_id: sourceType === "grn" ? sourceData.id : null,
                grn_number: sourceType === "grn" ? sourceData.grn_number : null,
                ma_id: sourceType === "ma" ? sourceData.id : null,
                ma_number: sourceType === "ma" ? sourceData.ma_number : null,
                source: sourceType === "ma" ? "material_add" : "grn",
                status: "completed",
                remarks: remarks
            },
            itemsData: items
                .filter(item => item.approved_now > 0 || item.rejected_now > 0)
                .map(item => ({
                    grn_item_id: sourceType === "grn" ? item.grn_item_id : null,
                    ma_item_id: sourceType === "ma" ? item.ma_item_id : null,
                    material_id: item.material_id,
                    material_name: item.material_name,
                    received_quantity: item.received_quantity,
                    approved_quantity: item.approved_now,
                    rejected_quantity: item.rejected_now,
                    rejection_type: item.rejected_now > 0 ? (item.rejection_type || "reject") : null,
                    qc_remarks: item.qc_remarks
                }))
        };

        setSubmitting(true);
        try {
            await createQcDocument(payload);
            toast.success("QC Document created successfully.");
            navigate("/purchase/qc");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to create QC Document.");
        } finally {
            setSubmitting(false);
        }
    };

    const columns = useMemo(() => [
        {
            key: "material_name",
            label: "Material",
            minWidth: "150px",
            render: (row) => <div className="font-semibold text-slate-800">{row.material_name}</div>
        },
        {
            key: "supplier_batch_number",
            label: "Supplier Batch",
            minWidth: "130px",
            render: (row) => <div className="text-slate-600 font-mono text-xs">{row.supplier_batch_number || "—"}</div>
        },
        {
            key: "internal_batch_number",
            label: "Internal Batch",
            minWidth: "130px",
            render: (row) => row.internal_batch_number ? (
                <span className="inline-flex items-center justify-center px-2.5 py-1 bg-[#369ACF]/8 text-[#369ACF] border border-[#369ACF]/15 rounded font-mono font-bold text-xs">
                    {row.internal_batch_number}
                </span>
            ) : (
                <span className="text-slate-400 font-mono text-xs">—</span>
            )
        },
        {
            key: "received_quantity",
            label: "Received",
            minWidth: "100px",
            render: (row) => <div className="font-medium text-slate-600 text-right">{row.received_quantity}</div>
        },
        {
            key: "prev_appr_rej",
            label: "Prev. Appr/Rej",
            minWidth: "120px",
            render: (row) => <div className="text-slate-500 text-xs text-right">{row.previously_approved} / {row.previously_rejected}</div>
        },
        {
            key: "pending_qc_quantity",
            label: "Pending QC",
            minWidth: "120px",
            render: (row) => <div className="font-bold text-indigo-600 text-right">{row.pending_qc_quantity}</div>
        },
        {
            key: "approved_now",
            label: "Approve Now",
            minWidth: "140px",
            sortable: false,
            render: (row) => (
                <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max={row.pending_qc_quantity}
                    value={row.approved_now}
                    onChange={(e) => handleItemChange(sourceType === "ma" ? row.ma_item_id : row.grn_item_id, "approved_now", e.target.value)}
                    className="w-full px-2 py-1.5 text-right font-semibold text-emerald-700 bg-emerald-50/50 border border-emerald-200 rounded focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
            )
        },
        {
            key: "rejected_now",
            label: "Reject Now",
            minWidth: "140px",
            sortable: false,
            render: (row) => (
                <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max={row.pending_qc_quantity}
                    value={row.rejected_now}
                    onChange={(e) => handleItemChange(sourceType === "ma" ? row.ma_item_id : row.grn_item_id, "rejected_now", e.target.value)}
                    className="w-full px-2 py-1.5 text-right font-semibold text-rose-700 bg-rose-50/50 border border-rose-200 rounded focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
            )
        },
        {
            key: "rejection_type",
            label: "Action on Reject",
            minWidth: "180px",
            sortable: false,
            render: (row) => (
                <select
                    value={row.rejection_type || "reject"}
                    disabled={!row.rejected_now || parseFloat(row.rejected_now) <= 0 || sourceType === "ma"}
                    onChange={(e) => handleItemChange(sourceType === "ma" ? row.ma_item_id : row.grn_item_id, "rejection_type", e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                >
                    <option value="reject">Return</option>
                    {sourceType !== "ma" && <option value="replace">Replace</option>}
                </select>
            )
        },
        {
            key: "qc_remarks",
            label: "Remarks",
            minWidth: "180px",
            sortable: false,
            render: (row) => (
                <input
                    type="text"
                    value={row.qc_remarks}
                    onChange={(e) => handleItemChange(sourceType === "ma" ? row.ma_item_id : row.grn_item_id, "qc_remarks", e.target.value)}
                    placeholder="Remarks..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
            )
        }
    ], [items, handleItemChange]);


    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
                <Navbar title="Perform QC" />
                <div className="flex-1 flex items-center justify-center">
                    <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500"></i>
                </div>
            </div>
        );
    }

    if (!sourceData || items.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
                <Navbar title="Perform QC" />
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <i className="fa-solid fa-box-open text-4xl mb-4"></i>
                    <p>No pending items found for this {sourceType === "ma" ? "MA" : "GRN"}.</p>
                    <button
                        onClick={() => navigate("/purchase/qc")}
                        className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-semibold transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
            <Navbar title="Perform QC" />

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <i className="fa-solid fa-clipboard-check text-indigo-600"></i>
                            Perform QC
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">
                            {sourceType === "ma" ? "MA" : "GRN"}: <span className="font-mono font-bold text-slate-700">{sourceType === "ma" ? sourceData.ma_number : sourceData.grn_number}</span>
                            <span className="mx-2">•</span>
                            {sourceType === "ma" ? "Location" : "Vendor"}: <span className="font-bold text-slate-700">{sourceType === "ma" ? (sourceData.location_name || "—") : (sourceData.vendor_name || "—")}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/purchase/qc")}
                        className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <DataTable
                            title="Item Details"
                            data={items}
                            columns={columns}
                            searchPlaceholder="Search items..."
                        />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">General Remarks</label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Add any overall remarks for this QC document..."
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none h-24"
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate("/purchase/qc")}
                            className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {submitting ? (
                                <><i className="fa-solid fa-circle-notch fa-spin"></i> Submitting...</>
                            ) : (
                                <><i className="fa-solid fa-check"></i> Submit QC</>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
