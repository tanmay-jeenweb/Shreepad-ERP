import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getGrnsUnified, deleteGrn, partiallyCloseGrn } from "../../api/grnApi";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import GrnViewModal from "./GrnViewModal";

export default function GrnMaster() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedGrnId, setSelectedGrnId] = useState(null);

    const fetchRows = async () => {
        setLoading(true);
        try {
            const res = await getGrnsUnified();
            setRows(res.data?.data || []);
        } catch {
            toast.error("Failed to load GRN list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this GRN? This action cannot be undone.")) return;
        setSaving(true);
        try {
            await deleteGrn(id);
            toast.success("GRN deleted successfully");
            fetchRows();
        } catch {
            toast.error("Failed to delete GRN");
        } finally {
            setSaving(false);
        }
    };

    const handlePartiallyClose = async (id) => {
        if (!window.confirm("Are you sure you want to partially close this GRN? It will not be editable anymore.")) return;
        setSaving(true);
        try {
            await partiallyCloseGrn(id);
            toast.success("GRN partially closed successfully");
            fetchRows();
        } catch {
            toast.error("Failed to partially close GRN");
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

    const columns = useMemo(() => [
        {
            key: "grn_number",
            label: "GRN Number",
            minWidth: "150px",
            render: (row) => {
                if (row.row_type === "pending_grn") {
                    // Show em dash for pending — no GRN number yet
                    return <span className="text-slate-400 text-xs italic">—</span>;
                }
                return (
                    <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 bg-[#369ACF]/8 text-[#369ACF] font-mono text-xs font-bold rounded-lg border border-[#369ACF]/10">
                        {row.grn_number}
                    </span>
                );
            },
        },
        {
            key: "po_number",
            label: "Linked PO",
            minWidth: "150px",
            render: (row) => row.po_number ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#369ACF]/8 text-[#369ACF] font-mono text-xs font-semibold rounded-lg border border-[#369ACF]/15">
                    <i className="fa-solid fa-file-invoice text-[10px]"></i>
                    {row.po_number}
                </span>
            ) : (
                <span className="text-slate-400 text-xs italic">Standalone</span>
            ),
        },
        {
            key: "name",
            label: "Vendor Name",
            minWidth: "150px",
            render: (row) => (
                <span className="font-semibold text-slate-800">{row.name}</span>
            ),
        },
        {
            key: "date",
            label: "Date",
            minWidth: "100px",
            render: (row) => (
                <span className="text-slate-600">{formatDate(row.date)}</span>
            ),
        },
        {
            key: "purchase_type",
            label: "Purchase Type",
            minWidth: "180px",
            render: (row) => row.purchase_type ? (
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100">
                    {row.purchase_type}
                </span>
            ) : <span className="text-slate-400">—</span>,
        },
        {
            key: "invoice_number",
            label: "Invoice No.",
            minWidth: "120px",
            render: (row) => (
                <span className="text-slate-600 text-xs">{row.invoice_number || "—"}</span>
            ),
        },
        {
            key: "total_amount",
            label: "Total Amount",
            minWidth: "130px",
            render: (row) => (
                <span className="font-semibold text-slate-800 tabular-nums">{formatCurrency(row.total_amount)}</span>
            ),
        },
        {
            key: "status",
            label: "Status",
            minWidth: "130px",
            render: (row) => {
                if (row.row_type === "pending_grn") {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded border bg-amber-50 text-amber-700 border-amber-200">
                            <i className="fa-solid fa-clock text-[9px]"></i>
                            Pending GRN
                        </span>
                    );
                }
                if (row.status === "closed") {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded border bg-slate-100 text-slate-700 border-slate-300">
                            <i className="fa-solid fa-lock text-[9px]"></i>
                            Closed
                        </span>
                    );
                }
                if (row.status === "partially_closed") {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                            Partially Closed
                        </span>
                    );
                }
                if (row.status === "partially_received") {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded border bg-blue-50 text-blue-700 border-blue-200">
                            Partially Received
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <i className="fa-solid fa-circle-check text-[9px]"></i>
                        Received
                    </span>
                );
            },
        },
        {
            key: "actions",
            label: "Actions",
            sortable: false,
            minWidth: "160px",
            render: (row) => {
                if (row.row_type === "pending_grn") {
                    return (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => navigate(`/purchase/grn/create?po_id=${row.id}`)}
                                className="flex h-8 items-center gap-2 px-3 rounded-lg border border-[#369ACF]/30 bg-[#369ACF]/8 text-[#369ACF] hover:bg-[#369ACF]/15 cursor-pointer text-xs font-semibold transition-colors"
                                title="Create GRN for this PO"
                            >
                                <i className="fa-solid fa-truck-ramp-box text-sm"></i>
                                Create GRN
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="flex items-center gap-1.5">
                        {/* View */}
                        <button
                            onClick={() => setSelectedGrnId(row.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                            title="View Details"
                        >
                            <i className="fa-solid fa-eye text-sm"></i>
                        </button>

                        {/* Partially Close */}
                        {row.status === "partially_received" && (
                            <button
                                onClick={() => handlePartiallyClose(row.id)}
                                disabled={saving}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer transition-colors"
                                title="Partially Close GRN"
                            >
                                <i className="fa-solid fa-lock text-sm"></i>
                            </button>
                        )}

                        {/* Edit */}
                        <button
                            onClick={() => {
                                if (row.status !== "closed" && row.status !== "partially_closed") {
                                    navigate(`/purchase/grn/edit/${row.id}`);
                                }
                            }}
                            disabled={row.status === "closed" || row.status === "partially_closed"}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${row.status === "closed" || row.status === "partially_closed" ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0] cursor-pointer"}`}
                            title={row.status === "closed" || row.status === "partially_closed" ? "Closed GRN cannot be edited" : "Edit GRN"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                            </svg>
                        </button>
 
                        {/* Delete */}
                        <button
                            onClick={() => {
                                if (row.status !== "closed" && row.status !== "partially_closed") {
                                    handleDelete(row.id);
                                }
                            }}
                            disabled={saving || row.status === "closed" || row.status === "partially_closed"}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${row.status === "closed" || row.status === "partially_closed" ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"}`}
                            title={row.status === "closed" || row.status === "partially_closed" ? "Closed GRN cannot be deleted" : "Delete GRN"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                            </svg>
                        </button>
                    </div>
                );
            },
        },
    ], [navigate, saving]);

    const [activeTab, setActiveTab] = useState("pending");

    const pendingRows = useMemo(() => rows.filter(r => r.row_type === "pending_grn"), [rows]);
    const grnRows = useMemo(() => rows.filter(r => r.row_type !== "pending_grn"), [rows]);

    const displayData = activeTab === "pending" ? pendingRows : grnRows;

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
            <Navbar title="GRN" />
            <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                
                {/* Tabs */}
                <div className="flex gap-2 mb-6 p-1 bg-white border border-slate-200 rounded-xl w-fit shadow-sm">
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            activeTab === "pending"
                                ? "bg-[#369ACF] text-white shadow-md"
                                : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        Pending GRN
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === "pending" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                            {pendingRows.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("partial")}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            activeTab === "partial"
                                ? "bg-[#369ACF] text-white shadow-md"
                                : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        Partial / Completed GRNs
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === "partial" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                            {grnRows.length}
                        </span>
                    </button>
                </div>

                <DataTable
                    tableId={`grn_master_${activeTab}`}
                    title={activeTab === "pending" ? "Pending Purchase Orders" : "Goods Receipt Notes"}
                    data={displayData}
                    columns={columns}
                    loading={loading}
                    searchPlaceholder="Search by GRN number, vendor, invoice or PO number..."
                    actionButton={
                        <button
                            onClick={() => navigate("/purchase/grn/create")}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
                            title="Create Standalone GRN"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </button>
                    }
                />
            </main>

            {selectedGrnId && (
                <GrnViewModal
                    grnId={selectedGrnId}
                    onClose={() => setSelectedGrnId(null)}
                />
            )}
        </div>
    );
}
