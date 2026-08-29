import React, { useState, useEffect } from "react";
import { getPurchaseOrderById } from "../../api/purchaseOrderApi";

export default function POViewModal({ poId, onClose }) {
    const [po, setPo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!poId) return;
        const fetchPo = async () => {
            setLoading(true);
            try {
                const res = await getPurchaseOrderById(poId);
                setPo(res.data?.data);
            } catch (err) {
                console.error("Failed to load PO details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPo();
    }, [poId]);

    if (!poId) return null;

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
                        <i className="fa-solid fa-file-invoice text-[#369ACF]"></i>
                        Purchase Order Details
                        {po && (
                            <span className="ml-2 px-2.5 py-1 bg-[#369ACF]/8 text-[#369ACF] font-mono text-xs rounded-lg border border-[#369ACF]/10">
                                {po.po_number}
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
                            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500 mb-4"></i>
                            <p className="text-slate-500 font-medium">Loading PO details...</p>
                        </div>
                    ) : !po ? (
                        <div className="text-center py-12 text-slate-500">Failed to load Purchase Order details.</div>
                    ) : (
                        <div className="space-y-8">
                            {/* General Details */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">1. General Information</h3>
                                
                                {po.po_number && /-\d{3}$/.test(po.po_number) && (
                                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                                        <i className="fa-solid fa-code-merge text-blue-500 mt-0.5"></i>
                                        <div>
                                            <p className="text-sm font-semibold text-blue-800">Revision Entry</p>
                                            <p className="text-xs text-blue-600 mt-0.5">
                                                This purchase order is Revision {po.revision_no || po.po_number.substring(po.po_number.lastIndexOf('-') + 1)} of base order <strong className="font-mono">{po.po_number.substring(0, po.po_number.lastIndexOf('-'))}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Vendor Name</p>
                                        <p className="text-sm font-semibold text-slate-800">{po.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">PO Date</p>
                                        <p className="text-sm text-slate-800">{formatDate(po.po_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Status</p>
                                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${
                                            po.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                            po.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                            po.status === 'closed' ? 'bg-blue-100 text-blue-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {po.status ? po.status.charAt(0).toUpperCase() + po.status.slice(1) : 'Pending'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">GSTIN</p>
                                        <p className="text-sm text-slate-800 font-mono">{po.gstin || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Purchase Type</p>
                                        <p className="text-sm text-slate-800">{po.purchase_type || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">Revision No</p>
                                        <p className="text-sm text-slate-800">{po.revision_no || "0"}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-3">
                                        <p className="text-xs text-slate-400 font-medium mb-1">Address</p>
                                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{po.address || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Location Details */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">2. Location Details</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">State</p>
                                        <p className="text-sm text-slate-800">{po.state || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">State Code</p>
                                        <p className="text-sm text-slate-800">{po.state_code || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">3. Items</h3>
                                {po.items && po.items.length > 0 ? (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Material</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">HSN</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Ordered Qty</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Received Qty</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Rate</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Taxable</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {po.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2 text-sm text-slate-800">
                                                            <span className="font-medium">{item.material_name}</span>
                                                            {item.grade && <span className="text-xs text-slate-500 block">Grade: {item.grade}</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-sm text-slate-600">{item.hsn_code || "—"}</td>
                                                        <td className="px-3 py-2 text-sm text-slate-800 text-right">{item.quantity} {item.unit}</td>
                                                        <td className="px-3 py-2 text-sm text-slate-800 text-right font-medium text-blue-700 bg-blue-50/30">{item.already_received ?? 0} {item.unit}</td>
                                                        <td className="px-3 py-2 text-sm text-slate-800 text-right">{formatCurrency(item.rate)}</td>
                                                        <td className="px-3 py-2 text-sm text-slate-800 text-right">{formatCurrency(item.taxable_amount)}</td>
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
                                    <p className="text-lg font-bold text-[#369ACF] inline-block">{formatCurrency(po.total_amount)}</p>
                                </div>
                            </div>

                            {/* Terms */}
                            {po.tc_description && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">4. Terms & Conditions</h3>
                                    <div 
                                        className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-200 rich-text-content"
                                        dangerouslySetInnerHTML={{ __html: po.tc_description }}
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
                        className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
