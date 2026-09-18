import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { getAllDispatches } from "../../api/dispatchApi";

export default function DispatchMaster() {
    const navigate = useNavigate();

    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for view details
    const [viewItem, setViewItem] = useState(null);

    const fetchDispatches = async () => {
        setLoading(true);
        try {
            const res = await getAllDispatches();
            setDispatches(res.data?.data || []);
        } catch (err) {
            console.error("Failed to load dispatches:", err);
            toast.error("Failed to load dispatch records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDispatches();
    }, []);

    const formatDate = (d) => {
        if (!d) return "—";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const columns = useMemo(() => [
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
                        {qty % 1 === 0 ? qty : qty.toFixed(4)} {row.unit}
                    </span>
                );
            },
        },
        {
            key: "packing_method",
            label: "Packing Method",
            minWidth: "160px",
            render: (row) => (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    <i className="fa-solid fa-box text-slate-400 text-[10px]"></i>
                    {row.packing_method}
                </span>
            ),
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
            <Navbar title="Dispatch Register" />

            <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <DataTable
                    tableId="dispatch_master"
                    title="Material Dispach register"
                    data={dispatches}
                    columns={columns}
                    loading={loading}
                    defaultSortKey="dispatch_date"
                    defaultSortDirection="desc"
                    searchPlaceholder="Search dispatches..."
                    actionButton={
                        <button
                            onClick={() => navigate("/dispatch/create")}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white transition-all hover:bg-[#2583b4] shadow-sm hover:shadow cursor-pointer"
                            title="New Dispatch"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </button>
                    }
                />
            </main>

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
                                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Material Type</span>
                                    <span className="font-semibold text-slate-700">{viewItem.material_type || "—"}</span>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Packing Method</span>
                                    <span className="font-semibold text-slate-800">{viewItem.packing_method}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Vehicle / Transporter</span>
                                    <span className="font-semibold text-slate-800">{viewItem.vehicle_no || "—"}</span>
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
