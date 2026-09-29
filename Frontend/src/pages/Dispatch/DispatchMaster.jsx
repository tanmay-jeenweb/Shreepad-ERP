import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { getAllDispatches, getWorkOrdersForDispatch } from "../../api/dispatchApi";
import WorkOrderDispatchModal from "./WorkOrderDispatchModal";

export default function DispatchMaster() {
    const navigate = useNavigate();

    // Active tab state: "ongoing" | "completed" | "history"
    const [activeTab, setActiveTab] = useState("ongoing");

    // Data states
    const [ongoingWorkOrders, setOngoingWorkOrders] = useState([]);
    const [completedWorkOrders, setCompletedWorkOrders] = useState([]);
    const [dispatches, setDispatches] = useState([]);

    // Loading states
    const [loadingWo, setLoadingWo] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Modal states
    const [dispatchingWoItem, setDispatchingWoItem] = useState(null);
    const [viewItem, setViewItem] = useState(null);

    // Load work orders based on tab
    const fetchWorkOrders = async () => {
        setLoadingWo(true);
        try {
            const [ongoingRes, completedRes] = await Promise.all([
                getWorkOrdersForDispatch("ongoing"),
                getWorkOrdersForDispatch("completed")
            ]);
            setOngoingWorkOrders(ongoingRes.data?.data || []);
            setCompletedWorkOrders(completedRes.data?.data || []);
        } catch (err) {
            console.error("Failed to load work orders for dispatch:", err);
            toast.error("Failed to load work orders");
        } finally {
            setLoadingWo(false);
        }
    };

    // Load dispatch register history
    const fetchDispatches = async () => {
        setLoadingHistory(true);
        try {
            const res = await getAllDispatches();
            setDispatches(res.data?.data || []);
        } catch (err) {
            console.error("Failed to load dispatches:", err);
            toast.error("Failed to load dispatch records");
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchWorkOrders();
        fetchDispatches();
    }, []);

    const handleDispatchSuccess = () => {
        fetchWorkOrders();
        fetchDispatches();
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

    // Work Order Table Columns
    const workOrderColumns = useMemo(() => [
        {
            key: "work_order_no",
            label: "Work Order #",
            minWidth: "150px",
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <i className="fa-solid fa-file-lines text-[11px]"></i>
                    WO-{String(row.work_order_no).padStart(4, "0")}
                </span>
            ),
        },
        {
            key: "work_order_date",
            label: "Date",
            minWidth: "105px",
            render: (row) => <span className="text-slate-600 font-medium text-xs">{formatDate(row.work_order_date)}</span>,
        },
        {
            key: "customer_name",
            label: "Customer / Client",
            minWidth: "190px",
            render: (row) => (
                <div>
                    <span className="font-bold text-slate-800 text-sm block">{row.customer_name || "—"}</span>
                    {row.customer_code && (
                        <span className="text-[11px] text-slate-400 font-mono">{row.customer_code}</span>
                    )}
                </div>
            ),
        },
        {
            key: "material_name",
            label: "Finished Product",
            minWidth: "210px",
            render: (row) => (
                <div>
                    <span className="font-bold text-slate-900 text-sm block">{row.material_name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{row.material_code || "—"}</span>
                </div>
            ),
        },
        {
            key: "batch_no",
            label: "Batch No.",
            minWidth: "140px",
            render: (row) => {
                const batches = (row.available_batches || []).filter(b => parseFloat(b.available_quantity) > 0);
                if (batches.length > 1) {
                    return (
                        <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded border border-blue-200/80 cursor-help"
                            title={batches.map(b => `${b.batch_no}: ${b.available_quantity} ${row.unit} available`).join('\n')}
                        >
                            <i className="fa-solid fa-layer-group text-[10px]"></i>
                            {batches.length} Batches
                        </span>
                    );
                }
                if (batches.length === 1) {
                    return (
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-xs font-semibold rounded border border-blue-200/80">
                            {batches[0].batch_no}
                        </span>
                    );
                }
                return <span className="text-slate-400 font-mono text-xs">—</span>;
            },
        },
        {
            key: "target_quantity",
            label: "Target Qty",
            minWidth: "115px",
            render: (row) => {
                const target = parseFloat(row.target_quantity || 0);
                return (
                    <span className="font-bold text-slate-800 text-xs">
                        {target % 1 === 0 ? target : target.toFixed(2)} {row.unit}
                    </span>
                );
            },
        },
        {
            key: "completed_quantity",
            label: "Produced (FG)",
            minWidth: "145px",
            render: (row) => {
                const completed = parseFloat(row.completed_quantity || 0);
                const target = parseFloat(row.target_quantity || 0);
                const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
                return (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-blue-700">
                                {completed % 1 === 0 ? completed : completed.toFixed(2)} {row.unit}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                    percent >= 100 ? "bg-emerald-500" : percent > 0 ? "bg-blue-500" : "bg-slate-200"
                                }`}
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                );
            },
        },
        {
            key: "dispatched_quantity",
            label: "Dispatched",
            minWidth: "115px",
            render: (row) => {
                const disp = parseFloat(row.dispatched_quantity || 0);
                return (
                    <span className="font-semibold text-amber-700 text-xs">
                        {disp % 1 === 0 ? disp : disp.toFixed(2)} {row.unit}
                    </span>
                );
            },
        },
        {
            key: "available_to_dispatch",
            label: "Available to Dispatch",
            minWidth: "160px",
            render: (row) => {
                const avail = parseFloat(row.available_to_dispatch || 0);
                if (avail > 0) {
                    return (
                        <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-300/80 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {avail % 1 === 0 ? avail : avail.toFixed(2)} {row.unit}
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                        <i className="fa-solid fa-ban text-[10px]"></i>
                        0 {row.unit}
                    </span>
                );
            },
        },
        {
            key: "actions",
            label: "Dispatch Action",
            minWidth: "140px",
            sortable: false,
            render: (row) => {
                const avail = parseFloat(row.available_to_dispatch || 0);
                if (avail > 0) {
                    return (
                        <button
                            type="button"
                            onClick={() => setDispatchingWoItem(row)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#369ACF] hover:bg-[#2884b2] text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            title={`Dispatch up to ${avail} ${row.unit}`}
                        >
                            <i className="fa-solid fa-truck-fast text-[11px]"></i>
                            Dispatch
                        </button>
                    );
                }
                return (
                    <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg border border-slate-200 cursor-not-allowed"
                        title="No finished goods currently available to dispatch. Complete production logs first."
                    >
                        <i className="fa-solid fa-lock text-[10px]"></i>
                        0 Available
                    </button>
                );
            },
        },
    ], []);

    // Dispatch Register History Columns
    const historyColumns = useMemo(() => [
        {
            key: "dispatch_no",
            label: "Dispatch #",
            minWidth: "160px",
            render: (row) => (
                <button
                    onClick={() => setViewItem(row)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#369ACF]/10 text-[#369ACF] hover:bg-[#369ACF]/20 font-mono text-xs font-bold rounded-lg border border-[#369ACF]/20 transition-colors cursor-pointer"
                    title="View Dispatch Details"
                >
                    <i className="fa-solid fa-truck-fast text-[10px]"></i>
                    {row.dispatch_no}
                </button>
            ),
        },
        {
            key: "work_order_no",
            label: "Source",
            minWidth: "130px",
            render: (row) => {
                if (row.work_order_no) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded border border-indigo-200">
                            WO-{String(row.work_order_no).padStart(4, "0")}
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-xs font-medium rounded border border-slate-200">
                        Direct Stock
                    </span>
                );
            },
        },
        {
            key: "dispatch_date",
            label: "Date",
            minWidth: "110px",
            render: (row) => <span className="text-slate-600 font-medium">{formatDate(row.dispatch_date)}</span>,
        },
        {
            key: "material_name",
            label: "Material",
            minWidth: "180px",
            render: (row) => (
                <div>
                    <span className="font-bold text-slate-800 block">{row.material_name}</span>
                    <span className="text-[11px] text-slate-500">{row.material_type || "—"}</span>
                </div>
            ),
        },
        {
            key: "internal_batch_number",
            label: "Batch No.",
            minWidth: "150px",
            render: (row) => (
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded border border-blue-200">
                    {row.internal_batch_number}
                </span>
            ),
        },
        {
            key: "quantity",
            label: "Dispatched Qty",
            minWidth: "140px",
            render: (row) => {
                const qty = parseFloat(row.quantity || 0);
                return (
                    <span className="font-extrabold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-md text-sm inline-block">
                        {qty % 1 === 0 ? qty : qty.toFixed(2)} {row.unit}
                    </span>
                );
            },
        },
        {
            key: "party_name",
            label: "Customer / Party",
            minWidth: "170px",
            render: (row) => <span className="text-slate-700 font-medium">{row.party_name || "—"}</span>,
        },
        {
            key: "vehicle_no",
            label: "Vehicle #",
            minWidth: "130px",
            render: (row) => <span className="text-slate-600 font-mono text-xs">{row.vehicle_no || "—"}</span>,
        },
        {
            key: "added_by_name",
            label: "Dispatched By",
            minWidth: "130px",
            render: (row) => <span className="text-slate-600 text-xs">{row.added_by_name || "User"}</span>,
        },
    ], []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="Material Dispatch" />

            <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
                
                {/* Header & Direct Dispatch Button */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#369ACF]/10 text-[#369ACF] border border-[#369ACF]/20">
                                <i className="fa-solid fa-truck-ramp-box text-xl"></i>
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Material Dispatch Hub</h1>
                                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                                    Dispatch finished goods from started work orders or direct stock ledger movements.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Direct Stock Dispatch Button (Preserves non-WO stock dispatch) */}
                        <button
                            type="button"
                            onClick={() => navigate("/dispatch/create")}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-300 shadow-xs hover:border-slate-400 transition-all cursor-pointer"
                            title="Dispatch materials or raw materials created without a Work Order"
                        >
                            <i className="fa-solid fa-boxes-packing text-slate-500"></i>
                            <span>Direct Stock Dispatch <span className="text-[11px] text-slate-400 font-normal">(Without WO)</span></span>
                        </button>
                    </div>
                </div>

                {/* 3 Tabs Bar */}
                <div className="flex items-center gap-2 border-b border-slate-200 mb-6 bg-slate-100/70 p-1 rounded-2xl w-fit">
                    {/* Tab 1: Ongoing Work Orders */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("ongoing")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                            activeTab === "ongoing"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <i className={`fa-solid fa-spinner ${activeTab === "ongoing" ? "text-[#369ACF]" : "text-slate-400"}`}></i>
                        <span>Ongoing Work Orders</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            activeTab === "ongoing" ? "bg-[#369ACF] text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                            {ongoingWorkOrders.length}
                        </span>
                    </button>

                    {/* Tab 2: Completed Work Orders */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("completed")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                            activeTab === "completed"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <i className={`fa-solid fa-circle-check ${activeTab === "completed" ? "text-emerald-600" : "text-slate-400"}`}></i>
                        <span>Completed Work Orders</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            activeTab === "completed" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                            {completedWorkOrders.length}
                        </span>
                    </button>

                    {/* Tab 3: Dispatch Register History */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("history")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                            activeTab === "history"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <i className={`fa-solid fa-clipboard-list ${activeTab === "history" ? "text-indigo-600" : "text-slate-400"}`}></i>
                        <span>Dispatch Register</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            activeTab === "history" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                            {dispatches.length}
                        </span>
                    </button>
                </div>

                {/* Tab Content 1: Ongoing Work Orders */}
                {activeTab === "ongoing" && (
                    <div className="space-y-4">
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-900">
                            <div className="flex items-center gap-2.5">
                                <i className="fa-solid fa-circle-info text-amber-600 text-sm"></i>
                                <span>
                                    Displaying started work orders in active production. Finished goods can only be dispatched when completed quantities exist.
                                </span>
                            </div>
                            <span className="font-bold shrink-0">
                                {ongoingWorkOrders.filter(w => parseFloat(w.available_to_dispatch) > 0).length} Ready to Dispatch
                            </span>
                        </div>

                        <DataTable
                            tableId="dispatch_ongoing_wo"
                            title="Ongoing Work Orders"
                            data={ongoingWorkOrders}
                            columns={workOrderColumns}
                            loading={loadingWo}
                            defaultSortKey="work_order_no"
                            defaultSortDirection="desc"
                            searchPlaceholder="Search by WO#, customer, product, or batch..."
                        />
                    </div>
                )}

                {/* Tab Content 2: Completed Work Orders */}
                {activeTab === "completed" && (
                    <div className="space-y-4">
                        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-2.5 text-xs text-emerald-900">
                            <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
                            <span>
                                Work Orders where target quantities have been fully completed and dispatched.
                            </span>
                        </div>

                        <DataTable
                            tableId="dispatch_completed_wo"
                            title="Completed Work Orders"
                            data={completedWorkOrders}
                            columns={workOrderColumns}
                            loading={loadingWo}
                            defaultSortKey="work_order_no"
                            defaultSortDirection="desc"
                            searchPlaceholder="Search completed work orders..."
                        />
                    </div>
                )}

                {/* Tab Content 3: Dispatch Register History */}
                {activeTab === "history" && (
                    <DataTable
                        tableId="dispatch_master_history"
                        title="Material Dispatch Register"
                        data={dispatches}
                        columns={historyColumns}
                        loading={loadingHistory}
                        defaultSortKey="dispatch_date"
                        defaultSortDirection="desc"
                        searchPlaceholder="Search dispatch register..."
                        actionButton={
                            <button
                                onClick={() => navigate("/dispatch/create")}
                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white transition-all hover:bg-[#2583b4] shadow-sm hover:shadow cursor-pointer"
                                title="New Direct Dispatch"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                        }
                    />
                )}
            </main>

            {/* Work Order Dispatch Modal */}
            <WorkOrderDispatchModal
                item={dispatchingWoItem}
                isOpen={!!dispatchingWoItem}
                onClose={() => setDispatchingWoItem(null)}
                onSuccess={handleDispatchSuccess}
            />

            {/* View Dispatch Modal */}
            {viewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#369ACF]/10 text-[#369ACF]">
                                    <i className="fa-solid fa-truck-fast text-sm"></i>
                                </span>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">Dispatch Note</h3>
                                    <p className="text-xs font-mono text-[#369ACF] font-semibold">{viewItem.dispatch_no}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewItem(null)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                                <div>
                                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Dispatch Date</span>
                                    <span className="font-bold text-slate-800">{formatDate(viewItem.dispatch_date)}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Work Order</span>
                                    <span className="font-bold text-indigo-700 font-mono">
                                        {viewItem.work_order_no ? `WO-${String(viewItem.work_order_no).padStart(4, "0")}` : "Direct Stock"}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Material Name</span>
                                <span className="font-bold text-slate-900 text-base">{viewItem.material_name}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Internal Batch #</span>
                                    <span className="font-mono font-bold text-blue-700">{viewItem.internal_batch_number}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Quantity Dispatched</span>
                                    <span className="font-extrabold text-amber-700 text-base">
                                        {parseFloat(viewItem.quantity)} {viewItem.unit}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Vehicle / Transporter</span>
                                <span className="font-semibold text-slate-800">{viewItem.vehicle_no || "—"}</span>
                            </div>

                            <div>
                                <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Customer / Consignee</span>
                                <span className="font-semibold text-slate-800">{viewItem.party_name || "—"}</span>
                            </div>

                            {viewItem.remarks && (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-600">
                                    <span className="font-bold text-slate-700 block mb-1">Remarks:</span>
                                    {viewItem.remarks}
                                </div>
                            )}

                            <div className="pt-2 text-xs text-slate-400 text-right">
                                Logged by <span className="font-semibold text-slate-600">{viewItem.added_by_name || "User"}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setViewItem(null)}
                                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
