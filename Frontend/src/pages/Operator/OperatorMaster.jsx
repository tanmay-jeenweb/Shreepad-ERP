import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getOperators, deleteOperator, toggleOperatorActive } from "../../api/operatorApi";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionContext";

export default function OperatorMaster() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const { hasPermission } = usePermission();

  // ── Data loader ────────────────────────────────────────────────
  const loadOperators = async () => {
    setLoading(true);
    try {
      const res = await getOperators(showInactive);
      setOperators(res.data.data || []);
    } catch (err) {
      console.error("Failed to load operators", err);
      toast.error("Unable to load operators. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperators();
  }, [showInactive]);

  // ── Toggle Active ──────────────────────────────────────────────
  const handleToggleActive = async (id, currentActive) => {
    const newState = !currentActive;
    if (!window.confirm(`Are you sure you want to ${newState ? "activate" : "deactivate"} this operator?`)) return;
    setSaving(true);
    try {
      await toggleOperatorActive(id, newState);
      toast.success(`Operator ${newState ? "activated" : "deactivated"}`);
      loadOperators();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update operator status");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this operator?")) return;

    setSaving(true);
    try {
      await deleteOperator(id);
      toast.success("Operator deleted successfully");
      await loadOperators();
    } catch (err) {
      console.error("Failed to delete operator", err);
      toast.error(err?.response?.data?.message || "Unable to delete operator.");
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ───────────────────────────────────────────────────
  const columns = useMemo(() => {
    const canUpdate = hasPermission("operator", "update");
    const canDelete = hasPermission("operator", "delete");

    const cols = [
      {
        key: "operator_code",
        label: "Code",
        minWidth: "120px",
        render: (row) => (
          <span className="font-mono font-semibold text-[#369ACF]">{row.operator_code}</span>
        ),
      },
      {
        key: "operator_name",
        label: "Name",
        minWidth: "160px",
        render: (row) => (
          <span className="font-semibold text-slate-800">{row.operator_name}</span>
        ),
      },
      {
        key: "date_of_joining",
        label: "Date of Joining",
        minWidth: "150px",
        render: (row) => {
          const formatDate = (d) => {
            if (!d) return "—";
            const date = new Date(d);
            if (isNaN(date.getTime())) return "—";
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          };
          return row.date_of_joining ? (
            <span className="text-slate-700">
              {formatDate(row.date_of_joining)}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          );
        },
      },
      {
        key: "operator_type_name",
        label: "Type",
        minWidth: "160px",
        render: (row) =>
          row.operator_type_name ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
              {row.operator_type_name}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "information",
        label: "Information",
        minWidth: "200px",
        render: (row) =>
          row.information ? (
            <span className="text-slate-600 text-sm" title={row.information}>
              {row.information.length > 60 ? row.information.slice(0, 60) + "…" : row.information}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "active",
        label: "Status",
        minWidth: "100px",
        render: (row) => {
          const isActive = row.active !== false && row.active !== 0;
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? "bg-emerald-500" : "bg-rose-400"
                }`}
              />
              {isActive ? "Active" : "Inactive"}
            </span>
          );
        },
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        key: "actions",
        label: "Actions",
        sortable: false,
        minWidth: "130px",
        render: (row) => {
          const isActive = row.active !== false && row.active !== 0;
          return (
            <div className="flex items-center gap-1.5">
              {/* Edit */}
              {canUpdate && (
                <button
                  onClick={() => navigate(`/admin/operators/edit/${row.id}`)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0] cursor-pointer"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                  </svg>
                </button>
              )}

              {/* Active / Inactive toggle */}
              {canUpdate && (
                <button
                  onClick={() => handleToggleActive(row.id, isActive)}
                  disabled={saving}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                    isActive
                      ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}
                  title={isActive ? "Deactivate" : "Activate"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                  </svg>
                </button>
              )}

              {/* Delete */}
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
            </div>
          );
        },
      });
    }

    return cols;
  }, [hasPermission, saving, navigate]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <DataTable
          tableId="operator_master"
          title="Operator Master"
          data={operators}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search operators..."
          toggleActions={
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 select-none">
              <div
                onClick={() => setShowInactive((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${
                  showInactive ? "bg-amber-400" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    showInactive ? "translate-x-4" : ""
                  }`}
                />
              </div>
              Show Inactive
            </label>
          }
          actionButton={
            hasPermission("operator", "write") && (
              <button
                onClick={() => navigate("/admin/operators/create")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
                title="Add Operator"
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
            )
          }
        />
      </main>
    </div>
  );
}
