import React, { useState, useEffect } from "react";
import { getGrnById } from "../../api/grnApi";

export default function GrnViewModal({ grnId, onClose }) {
    const [grn, setGrn] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!grnId) return;
        const fetchGrn = async () => {
            setLoading(true);
            try {
                const res = await getGrnById(grnId);
                setGrn(res.data?.data);
            } catch (err) {
                console.error("Failed to load GRN details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGrn();
    }, [grnId]);

    if (!grnId) return null;

    const formatDate = (d) => {
        if (!d) return "—";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    const formatCurrency = (v) => (v != null ? `₹ ${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-truck-ramp-box text-[#369ACF]"></i>
                        Goods Receipt Note (GRN) Details
                        {grn && (
                            <span className="ml-2 px-2.5 py-1 bg-[#369ACF]/8 text-[#369ACF] font-mono text-xs rounded-lg border border-[#369ACF]/10">
                                {grn.grn_number}
                            </span>
                        )}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#369ACF] mb-4"></i>
                            <p className="text-slate-500 font-medium">Loading GRN details...</p>
                        </div>
                    ) : !grn ? (
                        <div className="text-center py-12 text-slate-500">Failed to load GRN details.</div>
                    ) : (
                        <div className="space-y-8">
                            {/* General Details */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">1. General Information</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Vendor Name</p>
                                        <p className="text-sm font-semibold text-slate-800">{grn.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">GRN Date</p>
                                        <p className="text-sm text-slate-800">{formatDate(grn.grn_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Status</p>
                                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-lg ${
                                            grn.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                                            grn.status === 'partially_received' ? 'bg-blue-100 text-blue-700' :
                                            grn.status === 'closed' ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                                            grn.status === 'partially_closed' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {grn.status === 'received' ? 'Received' :
                                             grn.status === 'partially_received' ? 'Partially Received' :
                                             grn.status === 'closed' ? 'Closed' :
                                             grn.status === 'partially_closed' ? 'Partially Closed' :
                                             (grn.status ? grn.status.charAt(0).toUpperCase() + grn.status.slice(1) : 'Pending')}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Linked PO</p>
                                        <p className="text-sm text-slate-800 font-mono">{grn.po_number || "Standalone"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Purchase Type</p>
                                        <p className="text-sm text-slate-800">{grn.purchase_type || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">GSTIN</p>
                                        <p className="text-sm text-slate-800 font-mono">{grn.gstin || "—"}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Location</p>
                                        <p className="text-sm text-slate-800 font-semibold">{grn.location_name || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Total Quantity (kg)</p>
                                        <p className="text-sm text-slate-800 font-semibold">{grn.total_quantity != null ? `${grn.total_quantity} kg` : "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Bag Size</p>
                                        <p className="text-sm text-slate-800">{grn.bag_size != null ? `${grn.bag_size} kg` : "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Number of Bags</p>
                                        <p className="text-sm text-slate-800 font-semibold">{grn.number_of_bags != null ? grn.number_of_bags : "—"}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-2">
                                        <p className="text-xs text-slate-400 font-medium mb-1">Address</p>
                                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{grn.address || "—"}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <p className="text-xs text-slate-400 font-medium mb-1">Remarks</p>
                                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{grn.remarks || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Logistics Details */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">2. Logistics & Invoice</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Invoice Number</p>
                                        <p className="text-sm text-slate-800">{grn.invoice_number || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Invoice Date</p>
                                        <p className="text-sm text-slate-800">{formatDate(grn.invoice_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Challan Number</p>
                                        <p className="text-sm text-slate-800">{grn.challan_number || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Challan Date</p>
                                        <p className="text-sm text-slate-800">{formatDate(grn.challan_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Transport Mode</p>
                                        <p className="text-sm text-slate-800">{grn.transportation_mode || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Vehicle Number</p>
                                        <p className="text-sm text-slate-800 uppercase">{grn.vehicle_number || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">3. Items</h3>
                                {grn.items && grn.items.length > 0 ? (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Material</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">HSN</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Supplier Batch</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Internal Batch</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Ordered</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-[#369ACF] uppercase whitespace-nowrap">Received</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Rate</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {grn.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2 text-sm text-slate-800">
                                                            <span className="font-medium">{item.material_name}</span>
                                                            {item.grade && <span className="text-xs text-slate-500 block">Grade: {item.grade}</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-sm text-slate-600">{item.hsn_code || "—"}</td>
                                                        <td className="px-3 py-2 text-sm text-slate-600">{item.supplier_batch_number || "—"}</td>
                                                        <td className="px-3 py-2 text-sm text-slate-600">{item.internal_batch_number || "—"}</td>
                                                        <td className="px-3 py-2 text-sm text-slate-600 text-right">{item.ordered_quantity || "0"} {item.unit}</td>
                                                        <td className="px-3 py-2 text-sm font-bold text-[#369ACF] text-right">{item.received_quantity || "0"} {item.unit}</td>
                                                        <td className="px-3 py-2 text-sm text-slate-800 text-right">{formatCurrency(item.rate)}</td>
                                                        <td className="px-3 py-2 text-sm font-semibold text-slate-900 text-right">{formatCurrency(item.total_amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No items found.</p>
                                )}
                                <div className="mt-4 text-right">
                                    <p className="text-sm text-slate-500 font-medium inline-block mr-4">Grand Total:</p>
                                    <p className="text-lg font-bold text-[#369ACF] inline-block">{formatCurrency(grn.total_amount)}</p>
                                </div>
                            </div>

                            {/* Terms */}
                            {grn.tc_description && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">4. Terms & Conditions</h3>
                                    <div 
                                        className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-200 rich-text-content"
                                        dangerouslySetInnerHTML={{ __html: grn.tc_description }}
                                    />
                                    <style>{`
                                        .rich-text-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
                                        .rich-text-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
                                        .rich-text-content h1, .rich-text-content h2, .rich-text-content h3 { font-weight: bold; margin-top: 0.5rem; margin-bottom: 0.25rem; }
                                        .rich-text-content h1 { font-size: 1.25rem; }
                                        .rich-text-content h2 { font-size: 1.1rem; }
                                        .rich-text-content h3 { font-size: 1rem; }
                                    `}</style>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
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
