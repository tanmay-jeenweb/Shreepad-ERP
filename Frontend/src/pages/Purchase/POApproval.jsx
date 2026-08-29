import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getAllPOsForApproval, approvePO, rejectPO, getApprovalLogs } from "../../api/poApprovalApi";
import DataTable from "../../components/DataTable";
import POViewModal from "./POViewModal";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionContext";

export default function POApproval() {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [activeTab, setActiveTab] = useState("pending");
    
    // Modal states
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    
    const [logsModalOpen, setLogsModalOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const [viewingPoId, setViewingPoId] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await getAllPOsForApproval();
            setOrders(res.data?.data || []);
        } catch {
            toast.error("Failed to load PO Approvals");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleApprove = async (id) => {
        if (!window.confirm("Are you sure you want to approve this Purchase Order?")) return;
        setActionLoading(true);
        try {
            await approvePO(id);
            toast.success("Purchase Order approved successfully");
            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to approve Purchase Order");
        } finally {
            setActionLoading(false);
        }
    };
    
    const openRejectModal = (id) => {
        setRejectingId(id);
        setRejectReason("");
        setRejectModalOpen(true);
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        if (!rejectReason.trim()) {
            toast.error("Rejection reason is required");
            return;
        }
        
        setActionLoading(true);
        try {
            await rejectPO(rejectingId, rejectReason.trim());
            toast.success("Purchase Order rejected successfully");
            setRejectModalOpen(false);
            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to reject Purchase Order");
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleViewLogs = async (id) => {
        setLogsModalOpen(true);
        setLogsLoading(true);
        try {
            const res = await getApprovalLogs(id);
            setLogs(res.data?.data || []);
        } catch (error) {
            toast.error("Failed to fetch logs");
        } finally {
            setLogsLoading(false);
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
    const formatCurrency = (v) => v != null ? `₹ ${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

    const filteredOrders = useMemo(() => {
        if (activeTab === "all") return orders;
        return orders.filter(o => o.status === activeTab);
    }, [orders, activeTab]);

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
                key: "total_amount",
                label: "Total Amount",
                minWidth: "120px",
                render: (row) => (
                    <span className="font-semibold text-slate-800 tabular-nums">{formatCurrency(row.total_amount)}</span>
                ),
            },
            {
                key: "revision_no",
                label: "Revision",
                minWidth: "80px",
                render: (row) => (
                    <span className="text-slate-600">v{row.revision_no || 0}</span>
                ),
            },
            {
                key: "status",
                label: "Status",
                minWidth: "120px",
                render: (row) => {
                    const statuses = {
                        pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "fa-clock", label: "Pending" },
                        approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "fa-check", label: "Approved" },
                        rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: "fa-xmark", label: "Rejected" },
                    };
                    const s = statuses[row.status] || statuses.pending;
                    return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${s.bg} ${s.text} ${s.border}`}>
                            <i className={`fa-solid ${s.icon} text-[10px]`}></i>
                            {s.label}
                        </span>
                    );
                },
            },
            {
                key: "actions",
                label: "Actions",
                minWidth: "160px",
                render: (row) => (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewingPoId(row.id)}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Details"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        
                        {row.status === "pending" && hasPermission("po_approval", "update") && (
                            <>
                                <button
                                    onClick={() => handleApprove(row.id)}
                                    disabled={actionLoading}
                                    title="Approve"
                                    className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                >
                                    <i className="fa-solid fa-check w-4 h-4 flex items-center justify-center"></i>
                                </button>
                                <button
                                    onClick={() => openRejectModal(row.id)}
                                    disabled={actionLoading}
                                    title="Reject"
                                    className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                >
                                    <i className="fa-solid fa-xmark w-4 h-4 flex items-center justify-center"></i>
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handleViewLogs(row.id)}
                            title="Approval History"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-auto"
                        >
                            <i className="fa-solid fa-clock-rotate-left w-4 h-4 flex items-center justify-center"></i>
                        </button>
                    </div>
                ),
            },
        ];
    }, [actionLoading, hasPermission]);

    const tabs = [
        { id: "pending", label: "Pending", icon: "fa-clock", color: "amber" },
        { id: "approved", label: "Approved", icon: "fa-check", color: "emerald" },
        { id: "rejected", label: "Rejected", icon: "fa-xmark", color: "rose" },
        { id: "all", label: "All Orders", icon: "fa-list", color: "indigo" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="PO Approvals" />
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 mx-auto w-full">
                {/* Header Section */}
                {/* <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <i className="fa-solid fa-clipboard-check text-indigo-600 text-xl"></i>
                            PO Approvals
                        </h1>
                        <p className="text-sm text-slate-500 mt-1.5 font-medium">
                            Review, approve, or reject purchase orders.
                        </p>
                    </div>
                </div> */}

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white rounded-xl shadow-sm border border-slate-200 w-fit">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const activeClasses = {
                            amber: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm",
                            emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm",
                            rose: "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm",
                            indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm",
                        };
                        const activeClass = activeClasses[tab.color] || activeClasses.indigo;
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border
                                    ${isActive 
                                        ? activeClass 
                                        : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"}
                                `}
                            >
                                <i className={`fa-solid ${tab.icon} ${isActive ? "" : "opacity-70"}`}></i>
                                {tab.label}
                                {tab.id !== "all" && (
                                    <span className={`
                                        ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums
                                        ${isActive ? "bg-white/60" : "bg-slate-100"}
                                    `}>
                                        {orders.filter(o => o.status === tab.id).length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <DataTable
                        title="Purchase Order Approval"
                        data={filteredOrders}
                        columns={columns}
                        loading={loading}
                        searchPlaceholder="Search by PO number or name..."
                    />
                </div>
            </main>

            {/* Reject Modal */}
            {rejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <form onSubmit={handleRejectSubmit}>
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-solid fa-xmark-circle text-rose-500"></i>
                                    Reject Purchase Order
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setRejectModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                                >
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                            <div className="p-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Reason for Rejection <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Please explain why this order is being rejected..."
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none h-32"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRejectModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 border border-transparent rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {actionLoading ? (
                                        <>
                                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                                            Rejecting...
                                        </>
                                    ) : (
                                        "Reject Order"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Logs Modal */}
            {logsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-clock-rotate-left text-indigo-500"></i>
                                Approval History
                            </h3>
                            <button
                                onClick={() => setLogsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                            >
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {logsLoading ? (
                                <div className="py-8 text-center text-slate-500">
                                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-indigo-500"></i>
                                    <p className="text-sm font-medium">Loading history...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="py-8 text-center text-slate-500">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <i className="fa-solid fa-file-circle-question text-xl text-slate-400"></i>
                                    </div>
                                    <p className="text-sm font-medium">No approval history found for this order.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {logs.map((log, idx) => (
                                        <div key={log.id} className="relative pl-6">
                                            {/* Timeline line */}
                                            {idx !== logs.length - 1 && (
                                                <div className="absolute left-2 top-6 bottom-[-24px] w-0.5 bg-slate-100"></div>
                                            )}
                                            
                                            {/* Timeline dot */}
                                            <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                                                log.action === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'
                                            }`}></div>
                                            
                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {log.action_by_name}
                                                    </p>
                                                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                        {formatDateTime(log.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2">
                                                    {log.action === 'approved' ? (
                                                        <span className="text-emerald-600">Approved</span>
                                                    ) : (
                                                        <span className="text-rose-600">Rejected</span>
                                                    )}
                                                </p>
                                                
                                                {log.reason && (
                                                    <div className="mt-2 text-sm text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                                                        <span className="text-xs font-semibold text-slate-400 block mb-1">Reason:</span>
                                                        {log.reason}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                            <button
                                onClick={() => setLogsModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* View Modal */}
            {viewingPoId && (
                <POViewModal poId={viewingPoId} onClose={() => setViewingPoId(null)} />
            )}
        </div>
    );
}
