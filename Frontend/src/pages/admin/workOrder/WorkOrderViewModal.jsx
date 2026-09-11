import React, { useState, useEffect, useMemo } from "react";
import { getWorkOrderById } from "../../../api/workOrderApi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../../context/PermissionContext";

export default function WorkOrderViewModal({ workOrderId, onClose }) {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    const canReadBOM = hasPermission("bom", "read");
    const [workOrder, setWorkOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!workOrderId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getWorkOrderById(workOrderId);
                setWorkOrder(res.data?.data);
            } catch (err) {
                console.error("Failed to load work order details", err);
                toast.error("Failed to load work order details");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [workOrderId]);

    const formatDate = (d) => {
        if (!d) return "—";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatDateTime = (d) => {
        if (!d) return "—";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // Separate Finished Goods (Prod Qty > 0) from Allocated BOM Raw Materials (Prod Qty == 0)
    const { finishedGoods, rawMaterials } = useMemo(() => {
        const all = workOrder?.items || [];
        const fg = all.filter(it => Number(it.production_quantity) > 0);
        const rm = all.filter(it => Number(it.production_quantity) === 0);

        // Fallback: If no item has production_quantity > 0, show all under finished goods
        if (fg.length === 0) {
            return { finishedGoods: all, rawMaterials: [] };
        }
        return { finishedGoods: fg, rawMaterials: rm };
    }, [workOrder]);

    if (!workOrderId) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm transition-opacity">
            <div className="relative w-full max-w-5xl transform rounded-2xl bg-white shadow-2xl transition-all flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-file-contract text-[#369ACF]"></i>
                        Work Order Details
                        {workOrder && (
                            <span className="ml-2 px-2.5 py-1 bg-[#369ACF]/10 text-[#369ACF] font-mono text-xs font-bold rounded-lg border border-[#369ACF]/20">
                                WO-{String(workOrder.work_order_no).padStart(4, "0")}
                            </span>
                        )}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-slate-500 font-medium">Loading details...</p>
                        </div>
                    ) : !workOrder ? (
                        <div className="text-center py-12 text-slate-500">Failed to load Work Order details.</div>
                    ) : (
                        <div className="space-y-8">
                            {/* 1. General Details */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">
                                    1. General Information
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                                    <div className="sm:col-span-2">
                                        <p className="text-xs text-slate-400 font-medium mb-1">Customer Name</p>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {workOrder.customer_name} {workOrder.customer_code ? `(${workOrder.customer_code})` : ""}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Work Order Date</p>
                                        <p className="text-sm font-semibold text-slate-800 font-mono">
                                            {formatDate(workOrder.work_order_date)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Added By</p>
                                        <p className="text-sm text-slate-800 font-medium">{workOrder.added_by_name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Created On</p>
                                        <p className="text-sm text-slate-700 font-mono text-xs">
                                            {formatDateTime(workOrder.created_at)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Last Updated</p>
                                        <p className="text-sm text-slate-700 font-mono text-xs">
                                            {formatDateTime(workOrder.updated_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Finished Goods Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <i className="fa-solid fa-industry text-[#369ACF]"></i>
                                        2. Finished Goods / Products to Produce
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                                            {finishedGoods.length} Item{finishedGoods.length > 1 ? "s" : ""}
                                        </span>
                                    </h3>
                                </div>
                                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Material</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Job of Party</th>
                                                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Order Qty</th>
                                                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Prod Qty</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Exp. Delivery</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Actual Delivery</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Batch No.</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Remarks</th>
                                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {finishedGoods.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-3 py-2 text-sm text-slate-800">
                                                        <span className="font-semibold">{item.material_name}</span>
                                                        <span className="text-xs text-slate-400 block font-mono mt-0.5">Code: {item.material_code}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 font-medium whitespace-nowrap">
                                                        {item.job_party_name || "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 text-right font-medium">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-sm font-bold text-[#369ACF] text-right">{item.production_quantity}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-700 whitespace-nowrap font-mono text-xs">
                                                        {formatDate(item.exp_delivery_date)}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-slate-700 whitespace-nowrap font-mono text-xs">
                                                        {formatDate(item.actual_delivery_date)}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 font-mono text-xs">{item.batch_no || "—"}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-500 max-w-[150px] truncate" title={item.remarks}>
                                                        {item.remarks || "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm whitespace-nowrap text-center">
                                                        {canReadBOM ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    onClose();
                                                                    navigate(`/production/p-memo/${item.id}`);
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-[#369ACF] hover:bg-[#2583b4] rounded-lg shadow-sm transition-all cursor-pointer"
                                                                title="Create / View Production Memo (P Memo)"
                                                            >
                                                                <i className="fa-solid fa-file-invoice text-[10px]"></i>
                                                                P Memo
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-xs">No Permission</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3. Allocated Raw Materials Section (From BOM) */}
                            {rawMaterials.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                            <i className="fa-solid fa-boxes-packing text-amber-600"></i>
                                            3. Allocated Raw Materials (from BOM)
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                {rawMaterials.length} Material{rawMaterials.length > 1 ? "s" : ""}
                                            </span>
                                        </h3>
                                    </div>
                                    <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Raw Material</th>
                                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Allocated Quantity</th>
                                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Allocation Purpose & Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {rawMaterials.map((item, index) => (
                                                    <tr key={index} className="hover:bg-amber-50/30 transition-colors">
                                                        <td className="px-3 py-2 text-sm text-slate-800">
                                                            <span className="font-semibold">{item.material_name}</span>
                                                            <span className="text-xs text-slate-400 block font-mono mt-0.5">Code: {item.material_code}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-sm font-bold text-amber-700 text-right font-mono">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="px-3 py-2 text-sm text-slate-600">
                                                            {item.remarks || "Allocated raw material for finished goods"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
