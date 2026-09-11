import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getPMemoDetails } from "../../api/pmemoApi";
import toast from "react-hot-toast";

export default function PMProductionPage() {
    const { workOrderItemId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [pMemoData, setPMemoData] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [filterShiftId, setFilterShiftId] = useState("all");

    useEffect(() => {
        const fetchProductionLogs = async () => {
            try {
                setLoading(true);
                const res = await getPMemoDetails(workOrderItemId);
                if (res.data?.success && res.data.data) {
                    const data = res.data.data;
                    setPMemoData(data);
                    setShifts(data.shifts || []);
                } else {
                    toast.error("Failed to load Production Memo details");
                }
            } catch (err) {
                console.error("Error loading production details:", err);
                toast.error("Failed to load production logs");
            } finally {
                setLoading(false);
            }
        };

        if (workOrderItemId) {
            fetchProductionLogs();
        }
    }, [workOrderItemId]);

    // Flatten all hourly logs across shifts with shift metadata
    const allLogs = useMemo(() => {
        const list = [];
        (shifts || []).forEach((shift) => {
            (shift.logs || []).forEach((log) => {
                list.push({
                    ...log,
                    shift_id: shift.id,
                    shift_name: shift.shift_name,
                    shift_date: shift.shift_date,
                    supervisor_a_name: shift.supervisor_a_name,
                    supervisor_b_name: shift.supervisor_b_name,
                });
            });
        });
        return list;
    }, [shifts]);

    const filteredLogs = useMemo(() => {
        if (filterShiftId === "all") return allLogs;
        return allLogs.filter((l) => String(l.shift_id) === String(filterShiftId));
    }, [allLogs, filterShiftId]);

    // Totals calculations
    const totalProduction = useMemo(() => {
        return filteredLogs.reduce((sum, l) => sum + (Number(l.actual_qty) || 0), 0);
    }, [filteredLogs]);

    const totalRejection = useMemo(() => {
        return filteredLogs.reduce((sum, l) => sum + (Number(l.rejection_qty) || 0), 0);
    }, [filteredLogs]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen">
                <Navbar title="ERP Admin" />
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-[#369ACF] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium text-sm">Loading Production Hourly Logs...</p>
                    </div>
                </div>
            </div>
        );
    }

    const pMemoNoFormatted = pMemoData?.p_memo_no ? `PM-${String(pMemoData.p_memo_no).padStart(4, "0")}` : "—";
    const workOrderNoFormatted = pMemoData?.work_order_no ? `WO-${String(pMemoData.work_order_no).padStart(4, "0")}` : "—";
    const pmemoId = pMemoData?.id;

    return (
        <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen pb-16">
            <Navbar title="ERP Admin" />

            <main className="flex-1 flex flex-col w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Back Link & Page Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        to={`/production/p-memo/${workOrderItemId}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <i className="fa-solid fa-arrow-left text-xs"></i>
                        <span>Back to Production Memo ({pMemoNoFormatted})</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        {pmemoId && (
                            <Link
                                to={`/production/workshop-entry/${pmemoId}`}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition"
                            >
                                <i className="fa-solid fa-screwdriver-wrench"></i>
                                Open Workshop Entry
                            </Link>
                        )}
                    </div>
                </div>

                {/* Header Specifications Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                        <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                                Production Output
                            </span>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                                <i className="fa-solid fa-industry text-indigo-600"></i>
                                <span>Hourly Production Logs</span>
                            </h1>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <i className="fa-solid fa-file-lines text-[10px]"></i>
                                {pMemoNoFormatted}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <i className="fa-solid fa-hashtag text-[10px]"></i>
                                {workOrderNoFormatted}
                            </span>
                        </div>
                    </div>

                    {/* Meta Specifications Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                            <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Product</span>
                            <span className="font-bold text-slate-900 truncate block" title={pMemoData?.material_name}>
                                {pMemoData?.material_name || "—"}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                            <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Item Code</span>
                            <span className="font-bold font-mono text-slate-800">
                                {pMemoData?.item_code || "—"}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                            <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Prod. Target Qty</span>
                            <span className="font-extrabold text-indigo-700">
                                {pMemoData?.production_quantity != null ? Number(pMemoData.production_quantity).toLocaleString() : "—"}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                            <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Total Produced</span>
                            <span className="font-black text-emerald-700">
                                {totalProduction.toLocaleString()} Nos
                            </span>
                        </div>
                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                            <span className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Total Rejection</span>
                            <span className="font-black text-rose-600">
                                {totalRejection.toLocaleString()} Nos
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter and Content Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-list-ol text-slate-500"></i>
                            <h2 className="text-base font-bold text-slate-800">All Hourly Log Entries</h2>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                {filteredLogs.length} {filteredLogs.length === 1 ? "Record" : "Records"}
                            </span>
                        </div>

                        {/* Shift Filter Dropdown */}
                        {shifts.length > 0 && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-slate-500">Filter Shift:</label>
                                <select
                                    value={filterShiftId}
                                    onChange={(e) => setFilterShiftId(e.target.value)}
                                    className="h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                                >
                                    <option value="all">All Shifts ({shifts.length})</option>
                                    {shifts.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.shift_name} ({s.shift_date ? new Date(s.shift_date).toLocaleDateString() : ""})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Table of Hourly Logs */}
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-400 text-lg">
                                <i className="fa-solid fa-clock"></i>
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">No Hourly Log Entries Found</h3>
                            <p className="text-xs text-slate-400 max-w-sm">
                                Hourly production logs can be recorded from the Workshop Entry details page for this Production Memo.
                            </p>
                            {pmemoId && (
                                <Link
                                    to={`/production/workshop-entry/${pmemoId}`}
                                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                                >
                                    <i className="fa-solid fa-plus"></i>
                                    Record Production in Workshop Entry
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                                        <th className="py-3 px-3.5">#</th>
                                        <th className="py-3 px-3.5">Shift</th>
                                        <th className="py-3 px-3.5">Shift Date</th>
                                        <th className="py-3 px-3.5">Time (From - To)</th>
                                        <th className="py-3 px-3.5">Operator 1</th>
                                        <th className="py-3 px-3.5">Operator 2</th>
                                        <th className="py-3 px-3.5 text-right">Product Wt. (kg)</th>
                                        <th className="py-3 px-3.5 text-right">Production</th>
                                        <th className="py-3 px-3.5 text-right">Rejection</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredLogs.map((log, index) => {
                                        const timeDisplay = (log.time_from && log.time_to)
                                            ? `${log.time_from} - ${log.time_to}`
                                            : (log.hour_slot || "—");

                                        const op1Display = log.operator_1_name
                                            ? `${log.operator_1_name} ${log.operator_1_code ? `(${log.operator_1_code})` : ""}`
                                            : (log.operator_name ? `${log.operator_name} ${log.operator_code ? `(${log.operator_code})` : ""}` : "—");

                                        const op2Display = log.operator_2_name
                                            ? `${log.operator_2_name} ${log.operator_2_code ? `(${log.operator_2_code})` : ""}`
                                            : "—";

                                        const weightDisplay = log.product_weight != null && log.product_weight !== ""
                                            ? Number(log.product_weight).toFixed(4)
                                            : "—";

                                        return (
                                            <tr key={log.id || index} className="hover:bg-slate-50/50 transition">
                                                <td className="py-3 px-3.5 font-semibold text-slate-400">{index + 1}</td>
                                                <td className="py-3 px-3.5 font-bold text-slate-800">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px]">
                                                        {log.shift_name || "Shift"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3.5 font-medium text-slate-600">
                                                    {log.shift_date ? new Date(log.shift_date).toLocaleDateString() : "—"}
                                                </td>
                                                <td className="py-3 px-3.5 font-bold text-slate-900">{timeDisplay}</td>
                                                <td className="py-3 px-3.5 font-medium text-slate-700">{op1Display}</td>
                                                <td className="py-3 px-3.5 font-medium text-slate-600">{op2Display}</td>
                                                <td className="py-3 px-3.5 text-right font-semibold text-slate-700">{weightDisplay}</td>
                                                <td className="py-3 px-3.5 text-right font-black text-emerald-700 text-sm">
                                                    {Number(log.actual_qty || 0).toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3.5 text-right font-bold text-rose-600">
                                                    {Number(log.rejection_qty || 0) > 0 ? Number(log.rejection_qty).toLocaleString() : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                                        <td colSpan="7" className="py-3.5 px-3.5 text-right uppercase tracking-wider text-slate-600 font-bold">
                                            Total Cumulative Output:
                                        </td>
                                        <td className="py-3.5 px-3.5 text-right font-black text-emerald-700 text-sm">
                                            {totalProduction.toLocaleString()} Nos
                                        </td>
                                        <td className="py-3.5 px-3.5 text-right font-bold text-rose-600">
                                            {totalRejection.toLocaleString()} Nos
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
