import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getPurchaseOrders, deletePurchaseOrder } from "../../api/purchaseOrderApi";
import DataTable from "../../components/DataTable";
import POViewModal from "./POViewModal";
import toast from "react-hot-toast";

export default function PurchaseOrderMaster() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewingPoId, setViewingPoId] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await getPurchaseOrders();
            setOrders(res.data?.data || []);
        } catch {
            toast.error("Failed to load Purchase Orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this Purchase Order? This action cannot be undone.")) return;
        setSaving(true);
        try {
            await deletePurchaseOrder(id);
            toast.success("Purchase Order deleted successfully");
            fetchOrders();
        } catch {
            toast.error("Failed to delete Purchase Order");
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return "—";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    const formatCurrency = (v) => v != null ? `₹ ${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

    const columns = useMemo(() => {
        return [
            {
                key: "po_number",
                label: "PO Number",
                minWidth: "120px",
                render: (row) => {
                    const hasSuffix = row.po_number && /-\d{3}$/.test(row.po_number);
                    const basePo = hasSuffix ? row.po_number.substring(0, row.po_number.lastIndexOf('-')) : null;
                    return (
                        <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 bg-[#369ACF]/8 text-[#369ACF] font-mono text-xs font-bold rounded-lg border border-[#369ACF]/10">
                                <i className="fa-solid fa-file-invoice text-[10px]"></i>
                                {row.po_number}
                            </span>
                            {basePo && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                    from <strong className="font-mono">{basePo}</strong>
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                key: "name",
                label: "Name",
                minWidth: "150px",
                render: (row) => (
                    <span className="font-semibold text-slate-800">{row.name}</span>
                ),
            },
            {
                key: "po_date",
                label: "PO Date",
                minWidth: "100px",
                render: (row) => (
                    <span className="text-slate-600">{formatDate(row.po_date)}</span>
                ),
            },
            {
                key: "purchase_type",
                label: "Purchase Type",
                minWidth: "140px",
                render: (row) => row.purchase_type ? (
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100">
                        {row.purchase_type}
                    </span>
                ) : <span className="text-slate-400">—</span>,
            },
            {
                key: "state",
                label: "State",
                minWidth: "100px",
                render: (row) => (
                    <span className="text-slate-600">{row.state || "—"}</span>
                ),
            },
            {
                key: "total_amount",
                label: "Total Amount",
                minWidth: "120px",
                render: (row) => (
                    <span className="font-semibold text-slate-800 tabular-nums">{formatCurrency(row.total_amount)}</span>
                ),
            },
            {
                key: "revision_no",
                label: "Rev.",
                minWidth: "60px",
                render: (row) => (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                        {row.revision_no ?? 0}
                    </span>
                ),
            },
            {
                key: "status",
                label: "Status",
                minWidth: "100px",
                render: (row) => {
                    const statuses = {
                        pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "fa-clock", label: "Pending" },
                        approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "fa-check", label: "Approved" },
                        rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: "fa-xmark", label: "Rejected" },
                        closed: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "fa-lock", label: "Closed" },
                    };
                    const s = statuses[row.status] || statuses.pending;
                    return (
                        <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded border ${s.bg} ${s.text} ${s.border}`}>
                                <i className={`fa-solid ${s.icon}`}></i>
                                {s.label}
                            </span>
                            {row.status === "rejected" && row.rejection_reason && (
                                <span className="text-[10px] text-rose-600 truncate max-w-[120px]" title={row.rejection_reason}>
                                    {row.rejection_reason}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                key: "actions",
                label: "Actions",
                sortable: false,
                minWidth: "160px",
                render: (row) => (
                    <div className="flex items-center gap-1.5">
                        {/* View */}
                        <button
                            onClick={() => setViewingPoId(row.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                            title="View Details"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        
                        {(row.status === "approved" || row.status === "closed") && (
                            <button
                                onClick={() => window.open(`/purchase/purchase-orders/print/${row.id}`, '_blank')}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                                title="Print"
                            >
                                <i className="fa-solid fa-print text-sm"></i>
                            </button>
                        )}


                        {(row.status === "rejected" || row.status === "approved") && (
                            <button
                                onClick={() => navigate(`/purchase/purchase-orders/edit/${row.id}?mode=revise`)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer"
                                title="Revise"
                            >
                                <i className="fa-solid fa-pen-to-square text-sm"></i>
                            </button>
                        )}
                        {row.status === "pending" && (
                            <button
                                onClick={() => navigate(`/purchase/purchase-orders/edit/${row.id}`)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0] cursor-pointer"
                                title="Edit"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                                </svg>
                            </button>
                        )}
                        {/* Delete */}
                        {row.status !== "closed" && (
                            <button
                                onClick={() => handleDelete(row.id)}
                                disabled={saving}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                                title="Delete"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                                </svg>
                            </button>
                        )}
                    </div>
                ),
            }
        ];
    }, [navigate, saving]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
            <Navbar title="Purchase Orders" />
            <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <DataTable
                    tableId="purchase_orders_master"
                    title="Purchase Orders"
                    data={orders}
                    columns={columns}
                    loading={loading}
                    searchPlaceholder="Search by PO number, name, type or state..."
                    actionButton={
                        <button
                            onClick={() => navigate("/purchase/purchase-orders/create")}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
                            title="Create Purchase Order"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </button>
                    }
                />
                
                {/* View Modal */}
                {viewingPoId && (
                    <POViewModal poId={viewingPoId} onClose={() => setViewingPoId(null)} />
                )}
            </main>
        </div>
    );
}
