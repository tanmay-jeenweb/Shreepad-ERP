import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { createUnit, getUnits, updateUnit, deleteUnit } from "../../api/unitApi";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionContext";

export default function UnitMaster() {
  const [units, setUnits] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const loadUnits = async () => {
    setLoading(true);
    try {
      const response = await getUnits();
      setUnits(response.data.data || []);
    } catch (err) {
      console.error("Failed to load units", err);
      toast.error("Unable to load units. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleAddUnit = async (event) => {
    event.preventDefault();
    if (!newName.trim()) {
      toast.error("Enter a valid unit name.");
      return;
    }

    setSaving(true);
    try {
      await createUnit({ unitName: newName.trim() });
      toast.success("Unit added successfully");
      setNewName("");
      setShowAddModal(false);
      await loadUnits();
    } catch (err) {
      console.error("Failed to add unit", err);
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || "Unable to add unit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setNewName("");
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewName("");
  };

  const handleStartEdit = (id, currentName) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdateUnit = async (id) => {
    if (!editingName.trim()) {
      toast.error("Enter a valid unit name.");
      return;
    }

    setSaving(true);
    try {
      await updateUnit(id, { unitName: editingName.trim() });
      toast.success("Unit updated successfully");
      setEditingId(null);
      setEditingName("");
      await loadUnits();
    } catch (err) {
      console.error("Failed to update unit", err);
      toast.error(err?.response?.data?.message || "Unable to update unit.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this unit?")) {
      return;
    }

    setSaving(true);
    try {
      await deleteUnit(id);
      toast.success("Unit deleted successfully");
      await loadUnits();
    } catch (err) {
      console.error("Failed to delete unit", err);
      toast.error(err?.response?.data?.message || "Unable to delete unit.");
    } finally {
      setSaving(false);
    }
  };

  const { hasPermission } = usePermission();

  const columns = useMemo(() => {
    const cols = [
      { key: 'id', label: 'ID', minWidth: '60px' },
      {
        key: 'unit_name',
        label: 'Unit Name',
        render: (row) => editingId === row.id ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#369ACF] w-full"
          />
        ) : (
          <span className="font-semibold text-blue-900">{row.unit_name}</span>
        )
      },
      // {
      //   key: 'created_at',
      //   label: 'Timestamp (Added Date)',
      //   render: (row) => new Date(row.created_at).toLocaleString()
      // }
    ];

    const canUpdate = hasPermission("unit", "update");
    const canDelete = hasPermission("unit", "delete");

    if (canUpdate || canDelete) {
      cols.push({
        key: 'actions',
        label: 'Actions',
        sortable: false,
        minWidth: '120px',
        render: (row) => (
          <div className="flex items-center justify-start gap-2">
            {editingId === row.id ? (
              <>
                <button
                  onClick={() => handleUpdateUnit(row.id)}
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
                    onClick={() => handleStartEdit(row.id, row.unit_name)}
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
                    onClick={() => handleDeleteUnit(row.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
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
        )
      });
    }

    return cols;
  }, [editingId, editingName, saving, hasPermission]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <DataTable
          tableId="unit_master"
          title="Unit Master"
          data={units}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search units..."
          actionButton={hasPermission("unit", "write") ? (
            <button
              onClick={openAddModal}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
              title="Add Unit"
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
          ) : null}
        />

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in duration-200">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Add Unit</h2>
                  <p className="text-sm text-slate-500">Create a new unit master entry.</p>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  aria-label="Close"
                >
                  <span aria-hidden="true" className="text-lg">&times;</span>
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleAddUnit}>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Unit Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                    placeholder="Enter unit name"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#369ACF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2583b4] disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? "Saving..." : "Add Unit"}
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
