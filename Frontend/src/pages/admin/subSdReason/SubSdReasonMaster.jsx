import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import DataTable from "../../../components/DataTable";
import { 
    getAllSubSdReasons, deleteSubSdReason, toggleSubSdReasonActive
} from "../../../api/subSdReasonApi";
import toast from "react-hot-toast";
import { usePermission } from "../../../context/PermissionContext";

export default function SubSdReasonMaster() {
    const { hasPermission } = usePermission();
    const navigate = useNavigate();
    const [subSdReasons, setSubSdReasons] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const canWrite  = hasPermission("sub_sd_reason", "write");
    const canUpdate = hasPermission("sub_sd_reason", "update");
    const canDelete = hasPermission("sub_sd_reason", "delete");

    const loadData = async () => {
        setLoading(true);
        try {
            const subSdRes = await getAllSubSdReasons(showInactive);
            setSubSdReasons(subSdRes.data.data || []);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [showInactive]);

    const handleToggleActive = async (id, currentActive) => {
        const newState = !currentActive;
        if (!window.confirm(`Are you sure you want to ${newState ? 'activate' : 'deactivate'} this Sub SD Reason?`)) return;
        setSaving(true);
        try {
            await toggleSubSdReasonActive(id, newState);
            toast.success(`Sub SD Reason ${newState ? 'activated' : 'deactivated'}`);
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update status");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this Sub SD Reason?")) return;
        setSaving(true);
        try {
            await deleteSubSdReason(id);
            toast.success("Sub SD Reason deleted successfully");
            loadData();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to delete reason");
        } finally {
            setSaving(false);
        }
    };



    const columns = useMemo(() => {
        const cols = [
            { key: "id", label: "ID", minWidth: "60px" },
            { key: "sub_sd_name", label: "Name", minWidth: "150px",
              render: (row) => <span className="font-semibold text-slate-900">{row.sub_sd_name}</span> },
            { key: "code", label: "Code", minWidth: "100px" },
            { key: "reason_name_val", label: "Reason Type", minWidth: "150px",
              render: (row) => row.reason_name_val || '—' },
            { key: "mould_name_val", label: "Mould Type", minWidth: "150px",
              render: (row) => row.mould_name_val || '—' },
            { key: "active", label: "Status", minWidth: "100px",
              render: (row) => {
                const isActive = row.active !== false && row.active !== 0;
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                );
              }
            },
        ];

        cols.push({
            key: "actions",
            label: "Actions",
            sortable: false,
            minWidth: "120px",
            render: (row) => {
                const isActive = row.active !== false && row.active !== 0;
                return (
                    <div className="flex items-center gap-1.5">
                        {canUpdate && (
                            <button
                                onClick={() => navigate(`/admin/sub-sd-reasons/edit/${row.id}`)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0]"
                                title="Edit"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                                </svg>
                            </button>
                        )}
                        {canUpdate && (
                            <button
                                onClick={() => handleToggleActive(row.id, isActive)}
                                disabled={saving}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                                    isActive
                                        ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                                title={isActive ? 'Deactivate' : 'Activate'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                                </svg>
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={() => handleDelete(row.id)}
                                disabled={saving}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                title="Delete"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                                </svg>
                            </button>
                        )}
                    </div>
                );
            }
        });

        return cols;
    }, [saving, canUpdate, canDelete, showInactive]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
            <Navbar title="ERP Admin" />
            <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <DataTable
                    tableId="sub_sd_reason_master"
                    title="Sub SD Reason Master"
                    data={subSdReasons}
                    columns={columns}
                    loading={loading}
                    searchPlaceholder="Search Sub SD reasons..."
                    toggleActions={
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 select-none">
                            <div
                                onClick={() => setShowInactive(v => !v)}
                                className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${showInactive ? 'bg-amber-400' : 'bg-slate-200'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${showInactive ? 'translate-x-4' : ''}`} />
                            </div>
                            Show Inactive
                        </label>
                    }
                    actionButton={
                        canWrite && (
                            <button
                                onClick={() => navigate("/admin/sub-sd-reasons/create")}
                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white transition-all hover:bg-[#2583b4] shadow-sm hover:shadow"
                                title="Add Reason"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                        )
                    }
                />
            </main>

        </div>
    );
}
