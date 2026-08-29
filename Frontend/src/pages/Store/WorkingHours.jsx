import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { getWorkingHoursLogs } from "../../api/workingHoursApi";

export default function WorkingHours() {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await getWorkingHoursLogs();
            setRecords(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch working hours logs:", error);
            toast.error("Failed to load working hours logs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const columns = useMemo(() => [
        {
            key: "machine_name",
            label: "Machine",
            minWidth: "180px",
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">{row.machine_name || "—"}</span>
                    <span className="text-xs text-slate-500 font-mono">{row.machine_number || "—"}</span>
                </div>
            )
        },
        {
            key: "from_date",
            label: "From Date",
            minWidth: "120px",
            render: (row) => <span className="text-slate-600 font-medium">{formatDate(row.from_date)}</span>
        },
        {
            key: "to_date",
            label: "To Date",
            minWidth: "120px",
            render: (row) => <span className="text-slate-600 font-medium">{formatDate(row.to_date)}</span>
        },
        {
            key: "working_hour",
            label: "Working Hour",
            minWidth: "120px",
            render: (row) => (
                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md text-sm">
                    {parseFloat(row.working_hour || 0)} Hrs
                </span>
            )
        },
        {
            key: "no_work",
            label: "No Work",
            minWidth: "100px",
            render: (row) => {
                const noWork = Boolean(row.no_work);
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                        noWork
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                        {noWork ? "Yes" : "No"}
                    </span>
                );
            }
        },
        {
            key: "added_by_name",
            label: "Logged By",
            minWidth: "140px",
            render: (row) => <span className="text-slate-700 font-medium">{row.added_by_name || "—"}</span>
        },
        {
            key: "actions",
            label: "Actions",
            minWidth: "100px",
            render: (row) => (
                <button
                    onClick={() => navigate(`/production/working-hours/edit/${row.id}`)}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-semibold text-sm cursor-pointer transition-colors"
                    title="Edit Working Hour"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                    Edit
                </button>
            )
        }
    ], [navigate]);

    const actionButton = (
        <button
            onClick={() => navigate("/production/working-hours/create")}
            className="inline-flex h-10 items-center justify-center gap-2 px-4 bg-[#369ACF] hover:bg-[#2583b4] text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Working Hour
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="Working Hours Logs" />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 mx-auto w-full max-w-[1600px] flex flex-col">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Working Hour Logs</h1>
                    <p className="text-slate-500 mt-1">Track and manage working hours for production machines.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                    <DataTable
                        tableId="working_hours_table"
                        title="Machine Working Hour History"
                        data={records}
                        columns={columns}
                        loading={loading}
                        actionButton={actionButton}
                        searchPlaceholder="Search machine name, number, logger..."
                    />
                </div>
            </main>
        </div>
    );
}
