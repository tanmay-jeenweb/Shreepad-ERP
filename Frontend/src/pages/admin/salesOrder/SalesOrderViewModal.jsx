import React, { useState, useEffect } from "react";
import { getSalesOrderById } from "../../../api/salesOrderApi";

export default function SalesOrderViewModal({ soId, onClose }) {
    const [viewData, setViewData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!soId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getSalesOrderById(soId);
                setViewData(res.data?.data);
            } catch (err) {
                console.error("Failed to load SO details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [soId]);

    if (!soId) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm transition-opacity">
            <div className="relative w-full max-w-4xl transform rounded-2xl bg-white shadow-2xl transition-all flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-file-invoice-dollar text-[#369ACF]"></i>
                        Sales Order Details
                        {viewData && (
                            <span className="ml-2 px-2.5 py-1 bg-[#369ACF]/8 text-[#369ACF] font-mono text-xs rounded-lg border border-[#369ACF]/10">
                                {viewData.sales_order_id}
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
                    ) : !viewData ? (
                        <div className="text-center py-12 text-slate-500">Failed to load Sales Order details.</div>
                    ) : (
                        <div className="space-y-8">
                            {/* General Details */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">1. General Information</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                    <div className="sm:col-span-2">
                                        <p className="text-xs text-slate-400 font-medium mb-1">Customer Name</p>
                                        <p className="text-sm font-semibold text-slate-800">{viewData.customer_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Customer Order Number</p>
                                        <p className="text-sm font-semibold text-slate-800">{viewData.customer_order_no || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Created On</p>
                                        <p className="text-sm text-slate-800">
                                            {(() => {
                                                if (!viewData.created_at) return "N/A";
                                                const date = new Date(viewData.created_at);
                                                if (isNaN(date.getTime())) return "N/A";
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const year = date.getFullYear();
                                                return `${day}/${month}/${year}`;
                                            })()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Added By</p>
                                        <p className="text-sm text-slate-800">{viewData.added_by_name || "Admin"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Revision</p>
                                        <p className="text-sm font-semibold text-slate-800">v{viewData.revision_no || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Status</p>
                                        {(() => {
                                            const statuses = {
                                                pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "fa-clock", label: "Pending" },
                                                approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "fa-check", label: "Approved" },
                                                rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: "fa-xmark", label: "Rejected" },
                                            };
                                            const s = statuses[viewData.status] || statuses.pending;
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${s.bg} ${s.text} ${s.border}`}>
                                                    <i className={`fa-solid ${s.icon} text-[10px]`}></i>
                                                    {s.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    {viewData.status === "rejected" && viewData.rejection_reason && (
                                        <div className="col-span-2 sm:col-span-4 bg-rose-50 border border-rose-100 rounded-xl p-3">
                                            <p className="text-xs font-semibold text-rose-800 mb-1">Rejection Reason</p>
                                            <p className="text-sm text-rose-700 font-medium">{viewData.rejection_reason}</p>
                                        </div>
                                    )}
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
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Quantity</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Price/Unit</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Subtotal</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Discount</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">GST</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {viewData.items && viewData.items.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50">
                                                    <td className="px-3 py-2 text-sm text-slate-800">
                                                        <span className="font-medium">{item.material_name}</span>
                                                        <span className="text-xs text-slate-500 block">Code: {item.material_code}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 text-right">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 text-right">₹{Number(item.price).toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 text-right">₹{(Number(item.quantity) * Number(item.price)).toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-sm text-rose-600 text-right">{item.discount}%</td>
                                                    <td className="px-3 py-2 text-sm text-slate-800 text-right">{item.gst}%</td>
                                                    <td className="px-3 py-2 text-sm font-semibold text-[#369ACF] text-right">₹{Number(item.total_price).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 text-right">
                                    <p className="text-sm text-slate-500 font-medium inline-block mr-4">Grand Total:</p>
                                    <p className="text-lg font-bold text-[#369ACF] inline-block">₹{Number(viewData.total_amount).toFixed(2)}</p>
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
