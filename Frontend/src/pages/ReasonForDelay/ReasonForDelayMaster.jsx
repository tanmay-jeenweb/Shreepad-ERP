import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import {
  getReasonsForDelay,
  deleteReasonForDelay,
  createReasonForDelay,
  updateReasonForDelay,
} from "../../api/reasonForDelayApi";
import { getReasonForDelayTypes } from "../../api/reasonForDelayTypeApi";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionContext";

export default function ReasonForDelayMaster() {
  const [reasons, setReasons] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [newRemark, setNewRemark] = useState("");

  // Inline Edit State
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");
  const [editingRemark, setEditingRemark] = useState("");

  const { hasPermission } = usePermission();

  // ── Data loaders ───────────────────────────────────────────────
  const loadReasons = async () => {
    setLoading(true);
    try {
      const res = await getReasonsForDelay();
      setReasons(res.data.data || []);
    } catch (err) {
      console.error("Failed to load reasons for delay", err);
      toast.error("Unable to load reasons for delay. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadTypes = async () => {
    try {
      const res = await getReasonForDelayTypes();
      setTypes(res.data.data || []);
    } catch (err) {
      console.error("Failed to load reason for delay types", err);
    }
  };

  useEffect(() => {
    loadReasons();
    loadTypes();
  }, []);

  // ── Add Reason ────────────────────────────────────────────────
  const handleAddReason = async (event) => {
    event.preventDefault();
    if (!newName.trim()) {
      toast.error("Enter a valid reason name.");
      return;
    }

    setSaving(true);
    try {
      await createReasonForDelay({
        reasonName: newName.trim(),
        reasonTypeId: newTypeId || null,
        remark: newRemark.trim() || null,
      });
      toast.success("Reason for delay added successfully");
      setNewName("");
      setNewTypeId("");
      setNewRemark("");
      setShowAddModal(false);
      await loadReasons();
    } catch (err) {
      console.error("Failed to add reason for delay", err);
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || "Unable to add reason for delay. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit Handlers ─────────────────────────────────────────────
  const handleStartEdit = (row) => {
    setEditingId(row.id);
    setEditingName(row.reason_name || "");
    setEditingTypeId(row.reason_type_id || "");
    setEditingRemark(row.remark || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingTypeId("");
    setEditingRemark("");
  };

  const handleUpdateReason = async (id) => {
    if (!editingName.trim()) {
      toast.error("Enter a valid reason name.");
      return;
    }

    setSaving(true);
    try {
      await updateReasonForDelay(id, {
        reasonName: editingName.trim(),
        reasonTypeId: editingTypeId || null,
        remark: editingRemark.trim() || null,
      });
      toast.success("Reason for delay updated successfully");
      setEditingId(null);
      setEditingName("");
      setEditingTypeId("");
      setEditingRemark("");
      await loadReasons();
    } catch (err) {
      console.error("Failed to update reason for delay", err);
      toast.error(err?.response?.data?.message || "Unable to update reason for delay.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reason for delay?")) return;

    setSaving(true);
    try {
      await deleteReasonForDelay(id);
      toast.success("Reason for delay deleted successfully");
      await loadReasons();
    } catch (err) {
      console.error("Failed to delete reason for delay", err);
      toast.error(err?.response?.data?.message || "Unable to delete reason for delay.");
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ───────────────────────────────────────────────────
  const columns = useMemo(() => {
    const canUpdate = hasPermission("reason_for_delay", "update");
    const canDelete = hasPermission("reason_for_delay", "delete");

    const cols = [
      {
        key: "reason_name",
        label: "Reason / Name",
        minWidth: "200px",
        render: (row) =>
          editingId === row.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#369ACF] w-full"
            />
          ) : (
            <span className="font-semibold text-slate-800">{row.reason_name}</span>
          ),
      },
      {
        key: "reason_type_name",
        label: "Type",
        minWidth: "160px",
        render: (row) =>
          editingId === row.id ? (
            <select
              value={editingTypeId}
              onChange={(e) => setEditingTypeId(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#369ACF] w-full"
            >
              <option value="">Select Type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.reason_type_name}
                </option>
              ))}
            </select>
          ) : row.reason_type_name ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
              {row.reason_type_name}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "remark",
        label: "Remark",
        minWidth: "220px",
        render: (row) =>
          editingId === row.id ? (
            <input
              type="text"
              value={editingRemark}
              onChange={(e) => setEditingRemark(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#369ACF] w-full"
            />
          ) : row.remark ? (
            <span className="text-slate-600 text-sm" title={row.remark}>
              {row.remark.length > 60 ? row.remark.slice(0, 60) + "…" : row.remark}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        key: "actions",
        label: "Actions",
        sortable: false,
        minWidth: "120px",
        render: (row) => (
          <div className="flex items-center gap-2">
            {editingId === row.id ? (
              <>
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
              </>
            ) : (
              <>
                {canUpdate && (
                  <button
                    onClick={() => handleStartEdit(row)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0] cursor-pointer"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(row.id)}
                    disabled={saving}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        ),
      });
    }

    return cols;
  }, [editingId, editingName, editingTypeId, editingRemark, types, hasPermission, saving]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <DataTable
          tableId="reason_for_delay_master"
          title="Reason For Delay Master"
          data={reasons}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search reasons for delay..."
          actionButton={
            hasPermission("reason_for_delay", "write") ? (
              <button
                onClick={() => {
                  setNewName("");
                  setNewTypeId("");
                  setNewRemark("");
                  setShowAddModal(true);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
                title="Add Reason"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </button>
            ) : null
          }
        />

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in duration-200">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Add Reason For Delay</h2>
                  <p className="text-sm text-slate-500">Create a new reason for delay entry.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  aria-label="Close"
                >
                  <span aria-hidden="true" className="text-lg">&times;</span>
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleAddReason}>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Reason / Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                    placeholder="Enter reason or name"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Type
                  </label>
                  <select
                    value={newTypeId}
                    onChange={(e) => setNewTypeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                  >
                    <option value="">Select Type</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.reason_type_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Remark
                  </label>
                  <textarea
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                    placeholder="Enter any remarks"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
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
      </main>
    </div>
  );
}
