import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPurchaseOrderById } from "../../api/purchaseOrderApi";
import { getOrganizationDetails } from "../../api/organizationApi";
import logoImage from "../../assets/logo.png";

export default function PrintPurchaseOrder() {
    const { id } = useParams();
    const [po, setPo] = useState(null);
    const [org, setOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [poRes, orgRes] = await Promise.all([
                    getPurchaseOrderById(id),
                    getOrganizationDetails()
                ]);

                if (poRes.data?.data) {
                    setPo(poRes.data.data);
                } else {
                    throw new Error("PO not found");
                }

                if (orgRes.data?.data) {
                    setOrg(orgRes.data.data);
                }
            } catch (err) {
                console.error("Error fetching print data:", err);
                setError("Failed to load Purchase Order for printing.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        if (!loading && !error && po) {
            // Slight delay to ensure images load
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loading, error, po]);

    if (loading) {
        return <div className="p-8 text-center">Loading document...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-600 font-bold">{error}</div>;
    }

    if (!po) return null;

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatCurrency = (amount) => {
        return Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="bg-white text-black min-h-screen font-sans p-8 max-w-[210mm] mx-auto text-sm print:p-0 print:m-0">
            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                        background: white; 
                    }
                    /* Add padding to the print container to replace the page margin */
                    .print-container {
                        padding: 15mm;
                    }
                    .print-hidden { display: none !important; }
                }
            `}</style>

            <div className="print-container">

                {/* Header */}
                <div className="grid grid-cols-[1fr_auto] gap-8 border-b-2 border-slate-800 pb-6 mb-6 items-start">
                    <div className="flex flex-col gap-3 min-w-0">
                        <img
                            src={org?.logo || logoImage}
                            alt="Logo"
                            className="max-h-30 w-auto object-contain object-left max-w-full"
                        />
                        <div>
                            {/* <h1 className="text-xl font-bold uppercase tracking-wider truncate">{org?.name || "Company Name"}</h1> */}
                            {org?.address && <p className="text-slate-600 mt-1 leading-tight text-xs max-w-md">{org.address}</p>}
                            <div className="flex flex-wrap gap-4 mt-1 text-xs">
                                {org?.gst_no && <p className="text-slate-600"><strong>GSTIN:</strong> {org.gst_no}</p>}
                                {org?.state_code && <p className="text-slate-600"><strong>State Code:</strong> {org.state_code}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <h2 className="text-3xl font-bold text-slate-800 uppercase mb-2">Purchase Order</h2>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-sm">
                            <span className="font-semibold text-slate-600">PO Number:</span>
                            <span className="font-bold text-slate-900">{po.po_number}</span>

                            <span className="font-semibold text-slate-600">Date:</span>
                            <span className="font-medium text-slate-900">{formatDate(po.po_date)}</span>

                            {po.revision_no > 0 && (
                                <>
                                    <span className="font-semibold text-slate-600">Revision:</span>
                                    <span className="font-medium text-slate-900">{po.revision_no}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Vendor Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-200 pb-1">Vendor / Supplier</h3>
                        <p className="font-bold text-lg mb-1">{po.name}</p>
                        <p className="text-slate-700 whitespace-pre-wrap leading-tight">{po.address}</p>
                        {po.gstin && <p className="mt-2 text-slate-700"><strong>GSTIN:</strong> {po.gstin}</p>}
                        {po.state && <p className="text-slate-700"><strong>State:</strong> {po.state} {po.state_code ? `(${po.state_code})` : ''}</p>}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-200 pb-1">Purchase Details</h3>
                        <div className="grid grid-cols-[120px_1fr] gap-y-2 mt-2">
                            <span className="text-slate-500 font-medium">Purchase Type:</span>
                            <span className="font-medium text-slate-900">{po.purchase_type || "—"}</span>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8 overflow-hidden rounded-lg border border-slate-300">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="py-2 px-3 border-r border-slate-300 w-12 text-center">#</th>
                                <th className="py-2 px-3 border-r border-slate-300">Material Description</th>
                                <th className="py-2 px-3 border-r border-slate-300 w-24 text-center">HSN</th>
                                <th className="py-2 px-3 border-r border-slate-300 w-24 text-right">Qty</th>
                                <th className="py-2 px-3 border-r border-slate-300 w-24 text-right">Rate</th>
                                <th className="py-2 px-3 border-r border-slate-300 w-28 text-right">Taxable</th>
                                <th className="py-2 px-3 w-32 text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {po.items && po.items.map((item, idx) => (
                                <tr key={idx} className="even:bg-slate-50/50">
                                    <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-500">{idx + 1}</td>
                                    <td className="py-2 px-3 border-r border-slate-200">
                                        <div className="font-semibold text-slate-900">{item.material_name}</div>
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-600">{item.hsn_code || "—"}</td>
                                    <td className="py-2 px-3 border-r border-slate-200 text-right font-medium">
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-200 text-right">{formatCurrency(item.rate)}</td>
                                    <td className="py-2 px-3 border-r border-slate-200 text-right">{formatCurrency(item.taxable_amount)}</td>
                                    <td className="py-2 px-3 text-right font-semibold">{formatCurrency(item.total_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals & Taxes */}
                <div className="flex justify-end mb-10">
                    <div className="w-72">
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100">
                                {/* Summarize taxes */}
                                {po.items && po.items.some(i => i.cgst_amount > 0) && (
                                    <tr>
                                        <td className="py-1.5 text-slate-600 font-medium">Total CGST:</td>
                                        <td className="py-1.5 text-right font-medium">
                                            ₹ {formatCurrency(po.items.reduce((sum, i) => sum + Number(i.cgst_amount), 0))}
                                        </td>
                                    </tr>
                                )}
                                {po.items && po.items.some(i => i.sgst_amount > 0) && (
                                    <tr>
                                        <td className="py-1.5 text-slate-600 font-medium">Total SGST:</td>
                                        <td className="py-1.5 text-right font-medium">
                                            ₹ {formatCurrency(po.items.reduce((sum, i) => sum + Number(i.sgst_amount), 0))}
                                        </td>
                                    </tr>
                                )}
                                {po.items && po.items.some(i => i.igst_amount > 0) && (
                                    <tr>
                                        <td className="py-1.5 text-slate-600 font-medium">Total IGST:</td>
                                        <td className="py-1.5 text-right font-medium">
                                            ₹ {formatCurrency(po.items.reduce((sum, i) => sum + Number(i.igst_amount), 0))}
                                        </td>
                                    </tr>
                                )}
                                <tr className="border-t-2 border-slate-800">
                                    <td className="py-2 font-bold text-lg text-slate-900">Grand Total:</td>
                                    <td className="py-2 text-right font-bold text-lg text-slate-900">₹ {formatCurrency(po.total_amount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Terms and Conditions */}
                {po.tc_description && (
                    <div className="mb-12">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-200 pb-1">Terms & Conditions</h3>
                        <div 
                            className="text-xs text-slate-700 leading-relaxed pr-8 print-rich-text-content"
                            dangerouslySetInnerHTML={{ __html: po.tc_description }}
                        />
                        <style>{`
                            .print-rich-text-content ul { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.25rem; }
                            .print-rich-text-content ol { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.25rem; }
                            .print-rich-text-content h1, .print-rich-text-content h2, .print-rich-text-content h3 { font-weight: bold; margin-top: 0.25rem; margin-bottom: 0.15rem; }
                            .print-rich-text-content h1 { font-size: 1.1rem; }
                            .print-rich-text-content h2 { font-size: 1rem; }
                            .print-rich-text-content h3 { font-size: 0.9rem; }
                        `}</style>
                    </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 mt-65">
                    <div className="text-center">
                        <div className="border-t border-slate-400 pt-2 w-48 mx-auto">
                            <p className="font-bold text-slate-800 text-sm">Prepared By</p>
                            <p className="text-xs text-slate-500 mt-0.5">{po.added_by_name}</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-slate-400 pt-2 w-48 mx-auto">
                            <p className="font-bold text-slate-800 text-sm">Authorized Signatory</p>
                            <p className="text-xs text-slate-500 mt-0.5">For {org?.name || "Company"}</p>
                        </div>
                    </div>
                </div>

                {/* Print button (hidden in print) */}
                <div className="fixed bottom-8 right-8 print-hidden">
                    <button
                        onClick={() => window.print()}
                        className="bg-indigo-600 text-white shadow-lg h-14 w-14 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors hover:scale-105 active:scale-95"
                        title="Print Document"
                    >
                        <i className="fa-solid fa-print text-xl"></i>
                    </button>
                </div>

            </div> {/* End print-container */}
        </div>
    );
}
