import { useState, useEffect, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import DataTable from "../../../components/DataTable";
import { getAllReasons, deleteReason, toggleReasonActive, createReason, updateReason } from "../../../api/reasonApi";
import toast from "react-hot-toast";
import { usePermission } from "../../../context/PermissionContext";

export default function ReasonMaster() {
    const { hasPermission } = usePermission();
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    // Modal state for Create only
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Inline edit state
    const [editingId, setEditingId] = useState(null);
    const [editingData, setEditingData] = useState({
        reason_type: "",
        count_in_product_eff: false
    });

    const [formData, setFormData] = useState({
        reason_type: "",
        count_in_product_eff: false
    });

    const canWrite  = hasPermission("reason", "write");
    const canUpdate = hasPermission("reason", "update");
    const canDelete = hasPermission("reason", "delete");

    const loadReasons = async () => {
        setLoading(true);
        try {
            const res = await getAllReasons(showInactive);
            setReasons(res.data.data || []);
        } catch (error) {
            console.error("Failed to load reasons:", error);
            toast.error("Failed to load reasons");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReasons();
    }, [showInactive]);

    const handleToggleActive = async (id, currentActive) => {
        const newState = !currentActive;
        if (!window.confirm(`Are you sure you want to ${newState ? 'activate' : 'deactivate'} this reason?`)) return;
        setSaving(true);
        try {
            await toggleReasonActive(id, newState);
            toast.success(`Reason ${newState ? 'activated' : 'deactivated'}`);
            loadReasons();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update reason status");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this reason?")) return;
        setSaving(true);
        try {
            await deleteReason(id);
            toast.success("Reason deleted successfully");
            loadReasons();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to delete reason");
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = (id, reason) => {
        setEditingId(id);
        setEditingData({
            reason_type: reason.reason_type || "",
            count_in_product_eff: reason.count_in_product_eff === 1 || reason.count_in_product_eff === true
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingData({ reason_type: "", count_in_product_eff: false });
    };

    const handleUpdateReason = async (id) => {
        if (!editingData.reason_type.trim()) {
            toast.error("Type is required");
            return;
        }

        setSaving(true);
        try {
            await updateReason(id, editingData);
            toast.success("Reason updated successfully");
            setEditingId(null);
            loadReasons();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to update reason");
        } finally {
            setSaving(false);
        }
    };

    const handleOpenModal = () => {
        setFormData({
            reason_type: "",
            count_in_product_eff: false
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ reason_type: "", count_in_product_eff: false });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.reason_type.trim()) {
            toast.error("Type is required");
            return;
        }

        setSaving(true);
        try {
            await createReason(formData);
            toast.success("Reason created successfully");
            handleCloseModal();
            loadReasons();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to create reason");
        } finally {
            setSaving(false);
        }
    };

    const columns = useMemo(() => {
        const cols = [
            { key: "id", label: "ID", minWidth: "60px" },
            { key: "reason_type", label: "Type", minWidth: "180px",
              render: (row) => editingId === row.id ? (
                  <input
                      type="text"
                      value={editingData.reason_type}
                      onChange={(e) => setEditingData({ ...editingData, reason_type: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-[#369ACF] focus:ring-1 focus:ring-[#369ACF]"
                  />
              ) : (
                  <span className="font-semibold text-slate-900">{row.reason_type || '—'}</span>
              )
            },
            { key: "count_in_product_eff", label: "Count in Eff.", minWidth: "120px",
              render: (row) => editingId === row.id ? (
                  <div className="flex items-center">
                      <div
                          onClick={() => setEditingData(prev => ({ ...prev, count_in_product_eff: !prev.count_in_product_eff }))}
                          className={`relative w-8 h-4 rounded-full transition-colors duration-200 cursor-pointer ${editingData.count_in_product_eff ? 'bg-[#369ACF]' : 'bg-slate-300'}`}
                      >
                          <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${editingData.count_in_product_eff ? 'translate-x-4' : ''}`} />
                      </div>
                  </div>
              ) : (
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      row.count_in_product_eff ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                      {row.count_in_product_eff ? 'Yes' : 'No'}
                  </span>
              )
            },
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
                
                if (editingId === row.id) {
                    return (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleUpdateReason(row.id)}
                                disabled={saving}
                                className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50 font-medium text-xs bg-emerald-50 px-2 py-1 rounded cursor-pointer"
                            >
                                Save
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="text-slate-600 hover:text-slate-800 disabled:opacity-50 font-medium text-xs bg-slate-100 px-2 py-1 rounded cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="flex items-center gap-1.5">
                        {canUpdate && (
                            <button
                                onClick={() => handleStartEdit(row.id, row)}
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
    }, [saving, canUpdate, canDelete, showInactive, editingId, editingData]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
            <Navbar title="ERP Admin" />
            <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <DataTable
                    tableId="reason_master"
                    title="Reason Master"
                    data={reasons}
                    columns={columns}
                    loading={loading}
                    searchPlaceholder="Search reasons..."                    toggleActions={
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
                                onClick={() => handleOpenModal()}
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

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">Add Reason</h2>
                                <p className="text-sm text-slate-500">Create a new reason entry.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                                aria-label="Close"
                            >
                                <span aria-hidden="true" className="text-lg">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Type <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.reason_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reason_type: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                                    placeholder="e.g. Downtime, Rejection"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-2 pb-2">
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.count_in_product_eff}
                                            onChange={(e) => setFormData(prev => ({ ...prev, count_in_product_eff: e.target.checked }))}
                                        />
                                        <div className={`block w-10 h-6 rounded-full transition-colors ${formData.count_in_product_eff ? 'bg-[#369ACF]' : 'bg-slate-300'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.count_in_product_eff ? 'transform translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className="ml-3 text-sm font-semibold text-slate-700">
                                        Count in product eff. (yes/no)
                                    </span>
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-[#369ACF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2583b4] disabled:opacity-60 cursor-pointer"
                                >
                                    {saving ? "Saving..." : "Add Reason"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
