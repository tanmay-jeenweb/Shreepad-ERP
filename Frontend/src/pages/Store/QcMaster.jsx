import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionContext";

import { getPendingQcGrns, getPendingQcMas, getAllQcDocuments } from "../../api/qcApi";

export default function QcMaster() {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();

    const [pendingGrns, setPendingGrns] = useState([]);
    const [pendingMas, setPendingMas] = useState([]);
    const [qcHistory, setQcHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");

    const fetchPendingGrns = async () => {
        try {
            const res = await getPendingQcGrns();
            setPendingGrns(res.data?.data || []);
        } catch {
            toast.error("Failed to load Pending QC GRNs");
        }
    };

    const fetchPendingMas = async () => {
        try {
            const res = await getPendingQcMas();
            setPendingMas(res.data?.data || []);
        } catch {
            toast.error("Failed to load Pending QC MAs");
        }
    };

    const fetchQcHistory = async () => {
        try {
            const res = await getAllQcDocuments();
            setQcHistory(res.data?.data || []);
        } catch {
            toast.error("Failed to load QC History");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === "pending_grn") {
            await fetchPendingGrns();
        } else if (activeTab === "pending_ma") {
            await fetchPendingMas();
        } else {
            await fetchQcHistory();
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const formatDate = (d) => {
        if (!d) return "—";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const pendingGrnColumns = useMemo(() => [
        {
            key: "grn_number",
            label: "GRN Number",
            minWidth: "150px",
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-lg border border-indigo-100">
                    <i className="fa-solid fa-file-invoice text-[10px]"></i>
                    {row.grn_number}
                </span>
            ),
        },
        {
            key: "vendor_name",
            label: "Vendor",
            minWidth: "200px",
            render: (row) => <span className="font-semibold text-slate-800">{row.vendor_name}</span>,
        },
        {
            key: "supplier_batch_numbers",
            label: "Supplier Batch",
            minWidth: "150px",
            render: (row) => <span className="text-slate-600 font-mono text-xs truncate max-w-[150px] inline-block" title={row.supplier_batch_numbers}>{row.supplier_batch_numbers || "—"}</span>,
        },
        {
            key: "internal_batch_numbers",
            label: "Internal Batch",
            minWidth: "150px",
            render: (row) => <span className="text-slate-600 font-mono text-xs truncate max-w-[150px] inline-block" title={row.internal_batch_numbers}>{row.internal_batch_numbers || "—"}</span>,
        },
        {
            key: "grn_date",
            label: "GRN Date",
            minWidth: "120px",
            render: (row) => <span className="text-slate-600">{formatDate(row.grn_date)}</span>,
        },
        {
            key: "progress",
            label: "QC Progress",
            minWidth: "150px",
            render: (row) => {
                const total = Number(row.total_received) || 0;
                const done = Number(row.total_qc_done) || 0;
                const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                    <div className="w-full max-w-[120px]">
                        <div className="flex justify-between text-[10px] font-semibold mb-1">
                            <span className="text-slate-500">{done} / {total}</span>
                            <span className="text-indigo-600">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: "actions",
            label: "Actions",
            minWidth: "120px",
            render: (row) => {
                if (!hasPermission("qc_master", "canApprove")) {
                    return <span className="text-slate-400 text-xs italic">No access</span>;
                }
                return (
                    <button
                        onClick={() => navigate(`/store/qc/create/grn/${row.grn_id}`)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                        <i className="fa-solid fa-clipboard-check"></i>
                        Perform QC
                    </button>
                );
            },
        },
    ], [navigate, hasPermission]);

    const pendingMaColumns = useMemo(() => [
        {
            key: "ma_number",
            label: "MA Number",
            minWidth: "150px",
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-lg border border-indigo-100">
                    <i className="fa-solid fa-box-open text-[10px]"></i>
                    {row.ma_number}
                </span>
            ),
        },
        {
            key: "job_party_name",
            label: "Job Party",
            minWidth: "200px",
            render: (row) => <span className="font-semibold text-slate-800">{row.job_party_name || "—"}</span>,
        },
        {
            key: "internal_batch_numbers",
            label: "Internal Batch",
            minWidth: "150px",
            render: (row) => <span className="text-slate-600 font-mono text-xs truncate max-w-[150px] inline-block" title={row.internal_batch_numbers}>{row.internal_batch_numbers || "—"}</span>,
        },
        {
            key: "ma_date",
            label: "Date",
            minWidth: "120px",
            render: (row) => <span className="text-slate-600">{formatDate(row.ma_date)}</span>,
        },
        {
            key: "progress",
            label: "QC Progress",
            minWidth: "150px",
            render: (row) => {
                const total = Number(row.total_received) || 0;
                const done = Number(row.total_qc_done) || 0;
                const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                    <div className="w-full max-w-[120px]">
                        <div className="flex justify-between text-[10px] font-semibold mb-1">
                            <span className="text-slate-500">{done} / {total}</span>
                            <span className="text-indigo-600">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: "actions",
            label: "Actions",
            minWidth: "120px",
            render: (row) => {
                if (!hasPermission("qc_master", "canApprove")) {
                    return <span className="text-slate-400 text-xs italic">No access</span>;
                }
                return (
                    <button
                        onClick={() => navigate(`/store/qc/create/ma/${row.ma_id}`)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                        <i className="fa-solid fa-clipboard-check"></i>
                        Perform QC
                    </button>
                );
            },
        },
    ], [navigate, hasPermission]);

    const historyColumns = useMemo(() => [
        {
            key: "qc_number",
            label: "QC Number",
            minWidth: "140px",
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-mono text-xs font-bold rounded-lg border border-emerald-100">
                    <i className="fa-solid fa-check-double text-[10px]"></i>
                    {row.qc_number}
                </span>
            ),
        },
        {
            key: "reference_number",
            label: "Reference",
            minWidth: "140px",
            render: (row) => (
                <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    {row.reference_number || "—"}
                </span>
            ),
        },
        {
            key: "source",
            label: "Source",
            minWidth: "100px",
            render: (row) => (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${row.source === 'material_add' ? 'text-indigo-700 bg-indigo-50 border border-indigo-200/60' : 'text-indigo-700 bg-indigo-50 border border-indigo-200/60'}`}>
                    {row.source === 'material_add' ? 'MA' : 'GRN'}
                </span>
            ),
        },
        {
            key: "material_name",
            label: "Material",
            minWidth: "180px",
            render: (row) => <span className="font-semibold text-slate-800">{row.material_name || "—"}</span>,
        },
        {
            key: "supplier_batch_number",
            label: "Supplier Batch",
            minWidth: "130px",
            render: (row) => <span className="text-slate-600 font-mono text-xs">{row.supplier_batch_number || "—"}</span>,
        },
        {
            key: "internal_batch_number",
            label: "Internal Batch",
            minWidth: "130px",
            render: (row) => row.internal_batch_number ? (
                <span className="inline-flex items-center justify-center px-2.5 py-1 bg-[#369ACF]/8 text-[#369ACF] border border-[#369ACF]/15 rounded font-mono font-bold text-xs">
                    {row.internal_batch_number}
                </span>
            ) : <span className="text-slate-400 font-mono text-xs">—</span>,
        },
        {
            key: "received_quantity",
            label: "Total Qty",
            minWidth: "100px",
            render: (row) => <span className="text-slate-600 font-medium">{Number(row.received_quantity)}</span>,
        },
        {
            key: "approved_quantity",
            label: "Accepted",
            minWidth: "100px",
            render: (row) => (
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    {Number(row.approved_quantity)}
                </span>
            ),
        },
        {
            key: "rejected_quantity",
            label: "Rejected",
            minWidth: "120px",
            render: (row) => {
                const qty = Number(row.rejected_quantity);
                if (qty <= 0) return <span className="text-slate-400">—</span>;
                const type = row.rejection_type || "reject";
                const isReplace = type === "replace";
                return (
                    <div className="flex flex-col gap-1 items-start">
                        <span className="text-rose-600 font-bold bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                            {qty}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${isReplace ? 'text-amber-700 bg-amber-50 border border-amber-200/60' : 'text-rose-700 bg-rose-50 border border-rose-100'}`}>
                            {isReplace ? "replace" : "return"}
                        </span>
                    </div>
                );
            }
        },
        {
            key: "qc_date",
            label: "Date",
            minWidth: "110px",
            render: (row) => <span className="text-slate-600 text-sm">{formatDate(row.qc_date)}</span>,
        },
        {
            key: "added_by_name",
            label: "Performed By",
            minWidth: "140px",
            render: (row) => <span className="text-sm font-medium text-slate-800">{row.added_by_name}</span>,
        },
    ], []);

    const tabs = [
        { id: "pending_grn", label: "Pending QC (GRN)", icon: "fa-clock", color: "amber" },
        { id: "pending_ma", label: "Pending QC (MA)", icon: "fa-box-open", color: "indigo" },
        { id: "history", label: "QC History", icon: "fa-list-check", color: "emerald" },
    ];

    const getTableTitle = () => {
        if (activeTab === "pending_grn") return "Pending GRNs for QC";
        if (activeTab === "pending_ma") return "Pending MAs for QC";
        return "QC Inspection History";
    };

    const getTableData = () => {
        if (activeTab === "pending_grn") return pendingGrns;
        if (activeTab === "pending_ma") return pendingMas;
        return qcHistory;
    };

    const getTableColumns = () => {
        if (activeTab === "pending_grn") return pendingGrnColumns;
        if (activeTab === "pending_ma") return pendingMaColumns;
        return historyColumns;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="Quality Control" />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 mx-auto w-full">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <i className="fa-solid fa fa-check-circle text-indigo-600 text-xl"></i>
                            Quality Control (QC)
                        </h1>
                        <p className="text-sm text-slate-500 mt-1.5 font-medium">
                            Manage quality inspections for received goods.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white rounded-xl shadow-sm border border-slate-200 w-fit">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const activeClasses = {
                            amber: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm",
                            indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm",
                            emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm",
                        };
                        const activeClass = activeClasses[tab.color] || "bg-indigo-50 text-indigo-700";

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
                            </button>
                        );
                    })}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <DataTable
                        title={getTableTitle()}
                        data={getTableData()}
                        columns={getTableColumns()}
                        loading={loading}
                        searchPlaceholder={`Search ${getTableTitle()}...`}
                    />
                </div>
            </main>
        </div>
    );
}
