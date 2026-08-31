import React, { useState, useEffect } from "react";
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

    if (!workOrderId) return null;

    const formatDate = (d) => {
        if (!d) return "N/A";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "N/A";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatDateTime = (d) => {
        if (!d) return "N/A";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "N/A";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm transition-opacity">
            <div className="relative w-full max-w-4xl transform rounded-2xl bg-white shadow-2xl transition-all flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-file-contract text-[#369ACF]"></i>
                        Work Order Details
                        {workOrder && (
                            <span className="ml-2 px-2.5 py-1 bg-[#369ACF]/8 text-[#369ACF] font-mono text-xs rounded-lg border border-[#369ACF]/10">
                                WO-{String(workOrder.work_order_no).padStart(4, "0")}
                            </span>
                        )}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
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
                            {/* General Details */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">1. General Information</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
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
                                        <p className="text-sm text-slate-800">{workOrder.added_by_name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Created On</p>
                                        <p className="text-sm text-slate-800 font-mono">
                                            {formatDateTime(workOrder.created_at)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Last Updated</p>
                                        <p className="text-sm text-slate-800 font-mono">
                                            {formatDateTime(workOrder.updated_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">2. Order Item Details</h3>
                                <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Material</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Job of Party</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Quantity</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Prod Qty</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Machine</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Exp. Delivery</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Actual Delivery</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Batch No.</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Remarks</th>
                                                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {workOrder.items && workOrder.items.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50">
                                                    <td className="px-3 py-2 text-sm text-slate-800">
                                                        <span className="font-medium">{item.material_name}</span>
                                                        <span className="text-xs text-slate-500 block">Code: {item.material_code}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 font-medium whitespace-nowrap">
                                                        {item.job_party_name || "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 text-right font-medium">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-sm font-semibold text-[#369ACF] text-right">{item.production_quantity}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-800">{item.machine_name || "N/A"}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 whitespace-nowrap">
                                                        {formatDate(item.exp_delivery_date)}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 whitespace-nowrap">
                                                        {formatDate(item.actual_delivery_date)}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 font-mono text-xs">{item.batch_no || "N/A"}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-500 max-w-[150px] truncate" title={item.remarks}>
                                                        {item.remarks || "N/A"}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm whitespace-nowrap text-center">
                                                        {canReadBOM ? (
                                                            <button
                                                                onClick={() => {
                                                                    onClose();
                                                                    navigate(`/production/p-memo/${item.id}`);
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#369ACF] hover:bg-[#2583b4] rounded-lg shadow-sm transition-all cursor-pointer"
                                                                title="Create/View Production Memo (P Memo)"
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
