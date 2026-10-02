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
            const isFinishedProduct = (row) => {
                if (row.remarks && String(row.remarks).toLowerCase().startsWith("allocated raw material")) {
                    return false;
                }
                if (row.material_group && String(row.material_group).toLowerCase().includes("raw")) {
                    return false;
                }
                return true;
            };
            setOngoingWorkOrders((ongoingRes.data?.data || []).filter(isFinishedProduct));
            setCompletedWorkOrders((completedRes.data?.data || []).filter(isFinishedProduct));
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
            minWidth: "140px",
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
            minWidth: "180px",
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
            minWidth: "200px",
            render: (row) => (
                <div>
                    <span className="font-bold text-slate-900 text-sm block">{row.material_name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{row.material_code || "—"}</span>
                </div>
            ),
        },
        {
            key: "order_quantity",
            label: "Order Qty",
            minWidth: "110px",
            render: (row) => {
                const order = parseFloat(row.order_quantity || row.target_quantity || 0);
                return (
                    <span className="font-extrabold text-slate-900 text-xs">
                        {order % 1 === 0 ? order : order.toFixed(2)} {row.unit}
                    </span>
                );
            },
        },
        {
            key: "production_quantity",
            label: "Prod Qty",
            minWidth: "100px",
            render: (row) => {
                const prod = parseFloat(row.production_quantity || 0);
                return (
                    <span className="font-bold text-indigo-700 text-xs">
                        {prod % 1 === 0 ? prod : prod.toFixed(2)} {row.unit}
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
                const order = parseFloat(row.order_quantity || row.target_quantity || 0);
                const percent = order > 0 ? Math.min(100, Math.round((completed / order) * 100)) : 0;
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
            minWidth: "125px",
            render: (row) => {
                const disp = parseFloat(row.dispatched_quantity || 0);
                const orderDisp = parseFloat(row.order_dispatched_quantity ?? disp);
                const excessDisp = parseFloat(row.excess_dispatched_quantity || 0);
                return (
                    <div className="space-y-0.5">
                        <span className="font-semibold text-amber-700 text-xs block">
                            {disp % 1 === 0 ? disp : disp.toFixed(2)} {row.unit}
                        </span>
                        {excessDisp > 0 && (
                            <span 
                                className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-850 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs"
                                title={`Order Fulfillment: ${orderDisp % 1 === 0 ? orderDisp : orderDisp.toFixed(2)} ${row.unit} | Excess Buffer: ${excessDisp % 1 === 0 ? excessDisp : excessDisp.toFixed(2)} ${row.unit}`}
                            >
                                <i className="fa-solid fa-boxes-packing text-[9px] text-amber-700"></i>
                                +{excessDisp % 1 === 0 ? excessDisp : excessDisp.toFixed(2)} Excess
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: "remaining_order_quantity",
            label: "Remaining Order",
            minWidth: "135px",
            render: (row) => {
                const order = parseFloat(row.order_quantity || row.target_quantity || 0);
                const orderDisp = parseFloat(row.order_dispatched_quantity ?? row.dispatched_quantity ?? 0);
                const rem = parseFloat(row.remaining_order_quantity ?? Math.max(0, order - orderDisp));
                if (rem > 0) {
                    return (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-xs">
                            {rem % 1 === 0 ? rem : rem.toFixed(2)} {row.unit}
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs">
                        <i className="fa-solid fa-check text-[10px]"></i>
                        Fulfilled
                    </span>
                );
            },
        },
        {
            key: "available_to_dispatch",
            label: "Available Stock",
            minWidth: "155px",
            render: (row) => {
                const avail = parseFloat(row.available_to_dispatch || row.total_available_stock || 0);
                const woBatches = row.wo_batches || [];
                const stockBatches = row.stock_batches || [];

                if (avail > 0) {
                    return (
                        <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-300/80 px-2 py-0.5 rounded-lg text-xs shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {avail % 1 === 0 ? avail : avail.toFixed(2)} {row.unit}
                            </span>
                            {stockBatches.length > 0 && woBatches.length > 0 && (
                                <span className="text-[10px] text-slate-400 block font-medium">
                                    WO + Stock batches
                                </span>
                            )}
                        </div>
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
            minWidth: "135px",
            sortable: false,
            render: (row) => {
                const avail = parseFloat(row.available_to_dispatch || row.total_available_stock || 0);
                const order = parseFloat(row.order_quantity || row.target_quantity || 0);
                const disp = parseFloat(row.dispatched_quantity || 0);
                const remaining = parseFloat(row.remaining_order_quantity ?? Math.max(0, order - disp));

                if (remaining <= 0) {
                    return (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                            <i className="fa-solid fa-check text-[11px]"></i>
                            Completed
                        </span>
                    );
                }

                if (avail > 0) {
                    return (
                        <button
                            type="button"
                            onClick={() => setDispatchingWoItem(row)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#369ACF] hover:bg-[#2884b2] text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            title={`Dispatch from available batches (Stock: ${avail} ${row.unit})`}
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
                        title="No finished goods or warehouse stock currently available to dispatch for this material."
                    >
                        <i className="fa-solid fa-lock text-[10px]"></i>
                        0 Stock
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
            key: "challan_no",
            label: "Challan #",
            minWidth: "130px",
            render: (row) => (
                row.challan_no ? (
                    <div>
                        <span className="font-semibold text-slate-800 text-xs block font-mono">{row.challan_no}</span>
                        {row.challan_date && (
                            <span className="text-[11px] text-slate-400 block">{formatDate(row.challan_date)}</span>
                        )}
                    </div>
                ) : <span className="text-slate-400 text-xs">—</span>
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
            minWidth: "150px",
            render: (row) => {
                const qty = parseFloat(row.quantity || 0);
                const isExcess = Boolean(row.is_excess || parseFloat(row.excess_quantity || 0) > 0);
                const excessQty = parseFloat(row.excess_quantity || (row.is_excess ? row.quantity : 0));
                return (
                    <div className="space-y-0.5">
                        <span className="font-extrabold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-md text-xs inline-block">
                            {qty % 1 === 0 ? qty : qty.toFixed(2)} {row.unit}
                        </span>
                        {isExcess && (
                            <span 
                                className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded block w-fit"
                                title={`Excess Buffer: ${excessQty} ${row.unit}`}
                            >
                                <i className="fa-solid fa-boxes-packing text-[9px] text-amber-700"></i>
                                +{excessQty % 1 === 0 ? excessQty : excessQty.toFixed(2)} Excess
                            </span>
                        )}
                    </div>
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
                                    Displaying started work orders in active fulfillment. Finished goods can be dispatched from work order production batches and available warehouse inventory.
                                </span>
                            </div>
                            <span className="font-bold shrink-0">
                                {ongoingWorkOrders.filter(w => (parseFloat(w.available_to_dispatch || w.total_available_stock || 0) > 0) && parseFloat(w.remaining_order_quantity || 0) > 0).length} Ready to Dispatch
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
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
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

                            {(viewItem.is_excess || parseFloat(viewItem.excess_quantity || 0) > 0) && (
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                                    <span className="font-bold flex items-center gap-1.5 text-amber-800">
                                        <i className="fa-solid fa-boxes-packing text-amber-600"></i>
                                        Excess Buffer Dispatched:
                                    </span>
                                    <span className="font-extrabold text-amber-900 text-sm">
                                        {parseFloat(viewItem.excess_quantity || viewItem.quantity)} {viewItem.unit}
                                    </span>
                                </div>
                            )}

                            <div>
                                <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Vehicle / Transporter</span>
                                <span className="font-semibold text-slate-800">{viewItem.vehicle_no || "—"}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-1 pb-1">
                                <div>
                                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Challan Number</span>
                                    <span className="font-mono font-bold text-slate-800">{viewItem.challan_no || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Challan Date</span>
                                    <span className="font-semibold text-slate-800">{formatDate(viewItem.challan_date)}</span>
                                </div>
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
