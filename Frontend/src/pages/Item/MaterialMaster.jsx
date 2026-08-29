import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getMaterials, deleteMaterial, toggleMaterialActive } from "../../api/materialApi";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionContext";

export default function MaterialMaster() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const { hasPermission } = usePermission();
  const navigate = useNavigate();

  // ── Data loader ───────────────────────────────────────────────
  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await getMaterials(showInactive);
      setMaterials(res.data.data || []);
    } catch (err) {
      console.error("Failed to load materials", err);
      toast.error("Unable to load materials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [showInactive]);

  // ── Toggle Active ─────────────────────────────────────────────
  const handleToggleActive = async (id, currentActive) => {
    const newState = !currentActive;
    if (!window.confirm(`Are you sure you want to ${newState ? "activate" : "deactivate"} this material?`)) return;
    setSaving(true);
    try {
      await toggleMaterialActive(id, newState);
      toast.success(`Material ${newState ? "activated" : "deactivated"}`);
      loadMaterials();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update material status");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;

    setSaving(true);
    try {
      await deleteMaterial(id);
      toast.success("Material deleted successfully");
      await loadMaterials();
    } catch (err) {
      console.error("Failed to delete material", err);
      toast.error(err?.response?.data?.message || "Unable to delete material.");
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ───────────────────────────────────────────────────
  const columns = useMemo(() => {
    const canUpdate = hasPermission("material", "update");
    const canDelete = hasPermission("material", "delete");

    const cols = [
      {
        key: "material_code",
        label: "Material Code",
        minWidth: "130px",
        render: (row) => (
          <span className="font-mono font-semibold text-[#369ACF]">
            {row.material_code}
          </span>
        ),
      },
      {
        key: "code",
        label: "Code",
        minWidth: "80px",
        render: (row) => (
          row.code ? (
            <span className="font-mono font-medium text-slate-700">{row.code}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          )
        ),
      },
      {
        key: "material_name",
        label: "Material Name",
        minWidth: "150px",
        render: (row) => (
          <span className="font-semibold text-slate-800">{row.material_name}</span>
        ),
      },
      {
        key: "unit_name",
        label: "Unit",
        minWidth: "90px",
        render: (row) =>
          row.unit_name ? (
            <span className="text-slate-700">{row.unit_name}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "hsn_code",
        label: "HSN Code",
        minWidth: "100px",
        render: (row) =>
          row.hsn_code ? (
            <span className="text-slate-700 font-mono text-sm">{row.hsn_code}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "material_group_name",
        label: "Material Group",
        minWidth: "140px",
        render: (row) =>
          row.material_group_name ? (
            <span className="text-slate-700">{row.material_group_name}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "material_type",
        label: "Material Type",
        minWidth: "160px",
        render: (row) => {
          if (!row.material_type)
            return <span className="text-slate-400 italic text-xs">—</span>;
          const colors = {
            "Finished Goods": "bg-emerald-50 text-emerald-700 border-emerald-200",
            "Semi Finished Goods": "bg-orange-50 text-orange-700 border-orange-200",
            "Raw Materials": "bg-amber-50 text-amber-700 border-amber-200",
            "Store Consumed": "bg-sky-50 text-sky-700 border-sky-200",
            "Packaging Material": "bg-indigo-50 text-indigo-700 border-indigo-200",
            "Waste and scrap": "bg-rose-50 text-rose-700 border-rose-200",
            "Capital Equipment": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
            "Assembly Item": "bg-violet-50 text-violet-700 border-violet-200",
            "Uniform and other Item": "bg-slate-50 text-slate-700 border-slate-200",
            "Service": "bg-teal-50 text-teal-700 border-teal-200",
          };
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                colors[row.material_type] || "bg-slate-100 text-slate-600"
              }`}
            >
              {row.material_type}
            </span>
          );
        },
      },
      {
        key: "gst_percent",
        label: "GST %",
        minWidth: "80px",
        render: (row) =>
          row.gst_percent ? (
            <span className="text-slate-700">{row.gst_percent}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "self_val",
        label: "Self Val",
        minWidth: "100px",
        render: (row) =>
          row.self_val !== null && row.self_val !== undefined ? (
            <span className="text-slate-700 font-mono text-sm">
              {Number(row.self_val).toFixed(2)}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "purchase_val",
        label: "Purchase Val",
        minWidth: "110px",
        render: (row) =>
          row.purchase_val !== null && row.purchase_val !== undefined ? (
            <span className="text-slate-700 font-mono text-sm">
              {Number(row.purchase_val).toFixed(2)}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "unit_weight",
        label: "Unit Weight",
        minWidth: "100px",
        render: (row) =>
          row.unit_weight !== null && row.unit_weight !== undefined ? (
            <span className="text-slate-700 font-mono text-sm">
              {Number(row.unit_weight).toFixed(4)}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "details",
        label: "Details",
        minWidth: "160px",
        render: (row) =>
          row.details ? (
            <span className="text-slate-600 text-sm" title={row.details}>
              {row.details.length > 60
                ? row.details.slice(0, 60) + "…"
                : row.details}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "remarks",
        label: "Remarks",
        minWidth: "160px",
        render: (row) =>
          row.remarks ? (
            <span className="text-slate-600 text-sm" title={row.remarks}>
              {row.remarks.length > 60
                ? row.remarks.slice(0, 60) + "…"
                : row.remarks}
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
                  onClick={() => navigate(`/admin/materials/create?id=${row.id}`)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0] cursor-pointer"
                  title="Edit"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z"
                    />
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
                    />
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z"
                    />
                  </svg>
                </button>
              )}
            </div>
          );
        },
      });
    }

    return cols;
  }, [hasPermission, saving, showInactive]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <DataTable
          tableId="material_master"
          title="Material Master"
          data={materials}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search materials..."
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
            hasPermission("material", "write") && (
              <button
                onClick={() => navigate("/admin/materials/create")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
                title="Add Material"
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
