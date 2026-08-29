import { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { 
  createTermsAndConditions, 
  getTermsAndConditions, 
  updateTermsAndConditions, 
  deleteTermsAndConditions 
} from "../../../api/termsAndConditionsApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../../context/PermissionContext";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

export default function TermsAndConditionsMaster() {
  const [termsList, setTermsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const loadTerms = async () => {
    setLoading(true);
    try {
      const response = await getTermsAndConditions();
      setTermsList(response.data.data || []);
    } catch (err) {
      console.error("Failed to load terms & conditions", err);
      toast.error("Unable to load terms & conditions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
  }, []);

  const openAddModal = () => {
    setForm({ name: "", description: "" });
    setIsEditMode(false);
    setSelectedId(null);
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setForm({
      name: row.name || "",
      description: row.description || "",
    });
    setIsEditMode(true);
    setSelectedId(row.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({ name: "", description: "" });
    setIsEditMode(false);
    setSelectedId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        logs: "", // Logs field is stored on backend but not shown/edited in UI
      };

      if (isEditMode) {
        await updateTermsAndConditions(selectedId, payload);
        toast.success("Terms & conditions updated successfully");
      } else {
        await createTermsAndConditions(payload);
        toast.success("Terms & conditions added successfully");
      }
      closeModal();
      await loadTerms();
    } catch (err) {
      console.error("Failed to save terms & conditions", err);
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || "Unable to save terms & conditions.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this terms & conditions entry?")) {
      return;
    }

    setSaving(true);
    try {
      await deleteTermsAndConditions(id);
      toast.success("Terms & conditions deleted successfully");
      await loadTerms();
    } catch (err) {
      console.error("Failed to delete terms & conditions", err);
      toast.error(err?.response?.data?.message || "Unable to delete terms & conditions.");
    } finally {
      setSaving(false);
    }
  };

  const { hasPermission } = usePermission();

  const columns = useMemo(() => {
    const cols = [
      { key: 'id', label: 'ID', minWidth: '60px' },
      {
        key: 'name',
        label: 'Name',
        minWidth: '200px',
        render: (row) => <span className="font-semibold text-slate-800">{row.name}</span>
      },
      {
        key: 'description',
        label: 'Description',
        minWidth: '350px',
        render: (row) => (
          <div className="text-slate-600 text-sm block max-h-24 overflow-y-auto [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
            {row.description ? (
              <div dangerouslySetInnerHTML={{ __html: row.description }} />
            ) : (
              <span className="text-slate-400 italic text-xs">—</span>
            )}
          </div>
        )
      }
    ];

    const canUpdate = hasPermission("terms_and_conditions", "update");
    const canDelete = hasPermission("terms_and_conditions", "delete");

    if (canUpdate || canDelete) {
      cols.push({
        key: 'actions',
        label: 'Actions',
        sortable: false,
        minWidth: '120px',
        render: (row) => (
          <div className="flex items-center justify-start gap-2">
            {canUpdate && (
              <button
                onClick={() => openEditModal(row)}
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
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                </svg>
              </button>
            )}
          </div>
        )
      });
    }

    return cols;
  }, [hasPermission]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <DataTable
          tableId="terms_and_conditions_master"
          title="Terms & Conditions Master"
          data={termsList}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search terms..."
          actionButton={hasPermission("terms_and_conditions", "write") ? (
            <button
              onClick={openAddModal}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
              title="Add Terms & Conditions"
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

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in duration-200">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {isEditMode ? "Edit Terms & Conditions" : "Add Terms & Conditions"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isEditMode ? "Update the terms and conditions entry." : "Create a new terms and conditions entry."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  aria-label="Close"
                >
                  <span aria-hidden="true" className="text-lg">&times;</span>
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#369ACF] focus:ring-2 focus:ring-[#369ACF]/30"
                    placeholder="Enter name (e.g. Standard Payment Terms)"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                  <div className="bg-white rounded-xl overflow-hidden [&_.ql-container]:min-h-[200px] [&_.ql-editor]:min-h-[200px]">
                    <ReactQuill
                      theme="snow"
                      value={form.description}
                      onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                      placeholder="Enter terms and conditions text..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#369ACF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2583b4] disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? "Saving..." : isEditMode ? "Save Changes" : "Add Terms"}
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
