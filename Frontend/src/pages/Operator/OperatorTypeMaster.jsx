import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { createOperatorType, getOperatorTypes, updateOperatorType, deleteOperatorType } from "../../api/operatorTypeApi";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionContext";

export default function OperatorTypeMaster() {
  const [types, setTypes] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const response = await getOperatorTypes();
      setTypes(response.data.data || []);
    } catch (err) {
      console.error("Failed to load operator types", err);
      toast.error("Unable to load operator types. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const handleAddType = async (event) => {
    event.preventDefault();
    if (!newName.trim()) {
      toast.error("Enter a valid operator type name.");
      return;
    }

    setSaving(true);
    try {
      await createOperatorType({ operatorTypeName: newName.trim() });
      setNewName("");
      setShowAddModal(false);
      await loadTypes();
      toast.success("Operator type added successfully");
    } catch (err) {
      console.error("Failed to add operator type", err);
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || "Unable to add operator type. Please try again.");
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

  const handleUpdateType = async (id) => {
    if (!editingName.trim()) {
      toast.error("Enter a valid operator type name.");
      return;
    }

    setSaving(true);
    try {
      await updateOperatorType(id, { operatorTypeName: editingName.trim() });
      toast.success("Operator type updated successfully");
      setEditingId(null);
      setEditingName("");
      await loadTypes();
    } catch (err) {
      console.error("Failed to update operator type", err);
      toast.error(err?.response?.data?.message || "Unable to update operator type.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm("Are you sure you want to delete this operator type?")) {
      return;
    }

    setSaving(true);
    try {
      await deleteOperatorType(id);
      toast.success("Operator type deleted successfully");
      await loadTypes();
    } catch (err) {
      console.error("Failed to delete operator type", err);
      toast.error(err?.response?.data?.message || "Unable to delete operator type.");
    } finally {
      setSaving(false);
    }
  };

  const { hasPermission } = usePermission();

  const columns = useMemo(() => {
    const cols = [
      { key: 'id', label: 'ID', minWidth: '60px' },
      {
        key: 'operator_type_name',
        label: 'Operator Type Name',
        render: (row) => editingId === row.id ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#369ACF] w-full"
          />
        ) : (
          <span className="font-semibold text-blue-900">{row.operator_type_name}</span>
        )
      }
    ];

    const canUpdate = hasPermission("operator_type", "update");
    const canDelete = hasPermission("operator_type", "delete");

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
                  onClick={() => handleUpdateType(row.id)}
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
                    onClick={() => handleStartEdit(row.id, row.operator_type_name)}
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
                    onClick={() => handleDeleteType(row.id)}
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
          tableId="operator_type_master"
          title="Operator Type Master"
          data={types}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search operator types..."
          actionButton={hasPermission("operator_type", "write") ? (
            <button
              onClick={openAddModal}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
              title="Add Operator Type"
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
                  <h2 className="text-xl font-semibold text-slate-900">Add Operator Type</h2>
                  <p className="text-sm text-slate-500">Create a new operator type master entry.</p>
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

              <form className="space-y-4" onSubmit={handleAddType}>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Operator Type Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                    placeholder="Enter operator type name"
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
                    {saving ? "Saving..." : "Add Operator Type"}
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
