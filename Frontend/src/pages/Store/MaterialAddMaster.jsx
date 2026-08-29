import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionContext";
import { getAllMaterialAdds, deleteMaterialAdd } from "../../api/materialAddApi";

export default function MaterialAddMaster() {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();

    const [materialAdds, setMaterialAdds] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getAllMaterialAdds();
            setMaterialAdds(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch Material Adds", error);
            toast.error("Failed to load Material Add records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this Material Add?")) return;
        try {
            await deleteMaterialAdd(id);
            toast.success("Material Add deleted successfully.");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to delete Material Add.");
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

    const columns = useMemo(() => [
        {
            key: "ma_number",
            label: "MA Number",
            minWidth: "150px",
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#369ACF]/10 text-[#369ACF] font-mono text-xs font-bold rounded-lg border border-[#369ACF]/20">
                    <i className="fa-solid fa-box-open text-[10px]"></i>
                    {row.ma_number}
                </span>
            ),
        },
        {
            key: "ma_date",
            label: "Date",
            minWidth: "120px",
            render: (row) => <span className="text-slate-600 font-medium">{formatDate(row.ma_date)}</span>,
        },
        {
            key: "job_party_name",
            label: "Job Party",
            minWidth: "200px",
            render: (row) => <span className="font-semibold text-slate-800">{row.job_party_name || "—"}</span>,
        },
        {
            key: "location_name",
            label: "Location",
            minWidth: "150px",
            render: (row) => <span className="text-slate-600">{row.location_name || "—"}</span>,
        },
        {
            key: "status",
            label: "Status",
            minWidth: "120px",
            render: (row) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {row.status}
                </span>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            minWidth: "150px",
            render: (row) => {
                const isEditable = row.status === "received" || row.status === "Pending" || !row.status;
                return (
                <div className="flex items-center gap-1.5">
                    {hasPermission("material_add", "canUpdate") && (
                        <button
                            onClick={() => isEditable && navigate(`/store/material-add/edit/${row.id}`)}
                            disabled={!isEditable}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${isEditable ? 'border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0] cursor-pointer' : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'}`}
                            title={isEditable ? "Edit" : "Cannot edit after QC"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                            </svg>
                        </button>
                    )}
                    {hasPermission("material_add", "canDelete") && (
                        <button
                            onClick={() => isEditable && handleDelete(row.id)}
                            disabled={!isEditable}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${isEditable ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer' : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'}`}
                            title={isEditable ? "Delete" : "Cannot delete after QC"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        }
    ], [navigate, hasPermission]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="Material Add" />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 mx-auto w-full">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <i className="fa-solid fa-box-open text-[#369ACF] text-xl"></i>
                            Material Add
                        </h1>
                        <p className="text-sm text-slate-500 mt-1.5 font-medium">
                            Manage direct material receipts from job parties.
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <DataTable
                        title="Material Add Records"
                        data={materialAdds}
                        columns={columns}
                        loading={loading}
                        searchPlaceholder="Search Material Adds..."
                        actionButton={
                            hasPermission("material_add", "canCreate") && (
                                <button
                                    onClick={() => navigate("/store/material-add/create")}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
                                >
                                    <i className="fa-solid fa-plus"></i>
                                    
                                </button>
                            )
                        }
                    />
                </div>
            </main>
        </div>
    );
}
