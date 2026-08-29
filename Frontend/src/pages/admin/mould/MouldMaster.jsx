import { useEffect, useState, useMemo, useRef } from "react";
import Navbar from "../../../components/Navbar";
import {
  getAllMoulds,
  updateMould,
  deleteMould,
  toggleMouldActive,
  downloadMouldFile
} from "../../../api/mouldApi";
import { getAllMachines } from "../../../api/machineApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../../context/PermissionContext";

// ─── Inline multi-select dropdown component ──────────────────────────────────
function MachineMultiSelect({ machines, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(m => m !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="border border-slate-300 rounded-lg px-2 py-1 w-full text-left text-xs flex items-center justify-between bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className={selectedIds.length === 0 ? "text-slate-400" : "text-slate-800 font-medium truncate"}>
          {selectedIds.length === 0 ? "Select..." : `${selectedIds.length} selected`}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3 h-3 text-slate-400 ml-1 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl max-h-44 overflow-y-auto w-52">
            {machines.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No machines</p>
            ) : (
              machines.map(m => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 cursor-pointer text-xs border-b border-slate-50 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggle(m.id)}
                    className="h-3.5 w-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex flex-col leading-tight">
                    <span className="font-semibold text-slate-800">{m.name}</span>
                    <span className="text-slate-400">#{m.machine_number}</span>
                  </div>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MouldMaster() {
  const [loading, setLoading] = useState(false);
  const [moulds, setMoulds] = useState([]);
  const [machines, setMachines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const mouldsRes = await getAllMoulds(showInactive);
      setMoulds(mouldsRes.data.data || []);
    } catch (err) {
      console.error("Failed to load mould data", err);
      setError("Unable to load mould data");
    }

    try {
      const machinesRes = await getAllMachines();
      setMachines(machinesRes.data.data || []);
    } catch (err) {
      console.error("Failed to load machines", err);
      toast.error("Failed to load machines. Check if you have machine read permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [showInactive]);

  const handleStartEdit = (row) => {
    setEditingId(row.id);
    setEditingData({
      mouldName: row.mould_name || "",
      machineIds: row.machine_ids ? row.machine_ids.split(",").map(Number).filter(Boolean) : [],
      cavity: row.cavity || "",
      stdCycleTime: row.std_cycle_time || "",
      cycleTimeBandSec: row.cycle_time_band_sec || "",
      stdProductionPerHour: row.std_production_per_hour || "",
      cycleTimeTolerance: row.cycle_time_tolerance || "",
      maintenance: !!row.maintenance,
      isActive: !!row.is_active,
      existingFileName: row.file_name || null,
      newFile: null
    });
  };

  const handleCancelEdit = () => { setEditingId(null); setEditingData(null); };

  const handleUpdate = async (id) => {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("mouldName", editingData.mouldName);
      fd.append("machineIds", editingData.machineIds.join(","));
      fd.append("cavity", editingData.cavity || "");
      fd.append("stdCycleTime", editingData.stdCycleTime || "");
      fd.append("cycleTimeBandSec", editingData.cycleTimeBandSec || "");
      fd.append("stdProductionPerHour", editingData.stdProductionPerHour || "");
      fd.append("cycleTimeTolerance", editingData.cycleTimeTolerance || "");
      fd.append("maintenance", editingData.maintenance ? "true" : "false");
      fd.append("isActive", editingData.isActive ? "true" : "false");
      if (editingData.newFile) fd.append("file", editingData.newFile);

      await updateMould(id, fd);
      toast.success("Mould updated");
      setEditingId(null);
      setEditingData(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to update mould");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this mould?")) return;
    setSaving(true);
    try {
      await deleteMould(id);
      toast.success("Mould deleted");
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete mould");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    const newState = !currentActive;
    const label = newState ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${label} this mould?`)) return;
    setSaving(true);
    try {
      await toggleMouldActive(id, newState);
      toast.success(`Mould ${newState ? "activated" : "deactivated"}`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update mould status");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (id, fileName) => {
    try {
      await downloadMouldFile(id, fileName);
    } catch {
      toast.error("Failed to download file");
    }
  };

  // ─── Table cell helpers ──────────────────────────────────────────────────
  const editInput = (key, placeholder = "", type = "text", extra = {}) => (
    <input
      type={type}
      placeholder={placeholder}
      value={editingData?.[key] ?? ""}
      onChange={e => setEditingData({ ...editingData, [key]: e.target.value })}
      className="border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
      {...extra}
    />
  );

  const editNumInput = (key, placeholder, unit) => (
    <div className="relative">
      <input
        type="number"
        step="any"
        min="0"
        placeholder={placeholder}
        value={editingData?.[key] ?? ""}
        onChange={e => setEditingData({ ...editingData, [key]: e.target.value })}
        className={`border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm ${unit ? "pr-12" : ""}`}
      />
      {unit && <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400 text-xs">{unit}</div>}
    </div>
  );

  // ─── Columns ─────────────────────────────────────────────────────────────
  const columns = useMemo(() => {
    const canUpdate = hasPermission("mould", "update");
    const canDelete = hasPermission("mould", "delete");

    const cols = [
      { key: "id", label: "ID", minWidth: "60px" },

      {
        key: "mould_name",
        label: "Mould Name",
        minWidth: "160px",
        render: row => editingId === row.id
          ? editInput("mouldName", "Mould name")
          : <span className="font-semibold text-slate-900">{row.mould_name}</span>
      },

      {
        key: "machine_names",
        label: "Suitable Machines",
        minWidth: "200px",
        render: row => editingId === row.id
          ? <MachineMultiSelect
              machines={machines}
              selectedIds={editingData?.machineIds || []}
              onChange={ids => setEditingData({ ...editingData, machineIds: ids })}
            />
          : <span className="text-slate-600 text-xs">{row.machine_names || "—"}</span>
      },

      {
        key: "cavity",
        label: "Cavity (Nos)",
        minWidth: "110px",
        render: row => editingId === row.id
          ? editNumInput("cavity", "e.g. 4", "")
          : row.cavity ? <span>{row.cavity}</span> : "—"
      },

      {
        key: "std_cycle_time",
        label: "Std Cycle Time",
        minWidth: "140px",
        render: row => editingId === row.id
          ? editNumInput("stdCycleTime", "seconds", "sec")
          : row.std_cycle_time ? <span>{row.std_cycle_time} sec</span> : "—"
      },

      {
        key: "cycle_time_band_sec",
        label: "CT Band",
        minWidth: "120px",
        render: row => editingId === row.id
          ? editNumInput("cycleTimeBandSec", "band", "± sec")
          : row.cycle_time_band_sec ? <span>± {row.cycle_time_band_sec} sec</span> : "—"
      },

      {
        key: "std_production_per_hour",
        label: "Std Prod/Hr",
        minWidth: "130px",
        render: row => editingId === row.id
          ? editNumInput("stdProductionPerHour", "pcs/hr", "pcs")
          : row.std_production_per_hour ? <span>{row.std_production_per_hour} pcs/hr</span> : "—"
      },

      {
        key: "cycle_time_tolerance",
        label: "CT Tolerance [±]",
        minWidth: "145px",
        render: row => editingId === row.id
          ? editNumInput("cycleTimeTolerance", "tolerance", "sec")
          : row.cycle_time_tolerance ? <span>± {row.cycle_time_tolerance} sec</span> : "—"
      },

      {
        key: "maintenance",
        label: "Maintenance",
        minWidth: "120px",
        render: row => editingId === row.id ? (
            <div className="flex gap-2">
              <label className="inline-flex items-center text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name={"main-" + row.id}
                  checked={editingData?.maintenance === true}
                  onChange={() => setEditingData({ ...editingData, maintenance: true })}
                  className="mr-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                />
                Yes
              </label>
              <label className="inline-flex items-center text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name={"main-" + row.id}
                  checked={editingData?.maintenance === false}
                  onChange={() => setEditingData({ ...editingData, maintenance: false })}
                  className="mr-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                />
                No
              </label>
            </div>
          ) : row.maintenance ? (
            "Yes"
          ) : (
            "No"
          )
      },

      {
        key: "file_name",
        label: "File",
        minWidth: "160px",
        sortable: false,
        render: row => editingId === row.id ? (
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-indigo-600 hover:text-indigo-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
              {editingData?.newFile ? editingData.newFile.name : (editingData?.existingFileName ? "Change file" : "Attach file")}
              <input
                type="file"
                className="hidden"
                onChange={e => setEditingData({ ...editingData, newFile: e.target.files[0] || null })}
              />
            </label>
            {editingData?.existingFileName && !editingData?.newFile && (
              <span className="text-xs text-slate-400 truncate max-w-[130px]" title={editingData.existingFileName}>
                Current: {editingData.existingFileName}
              </span>
            )}
          </div>
        ) : row.file_name ? (
          <button
            onClick={() => handleDownload(row.id, row.file_name)}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium truncate max-w-[140px]"
            title={row.file_name}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="truncate">{row.file_name}</span>
          </button>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )
      },

      {
        key: "is_active",
        label: "Status",
        minWidth: "130px",
        render: row => editingId === row.id ? (
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setEditingData({ ...editingData, isActive: !editingData.isActive })}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${editingData?.isActive ? "bg-emerald-500" : "bg-amber-400"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${editingData?.isActive ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-xs font-medium text-slate-600">{editingData?.isActive ? "Active" : "Inactive"}</span>
          </label>
        ) : (
          row.is_active
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
              </span>
            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Deactivated
              </span>
        )
      }
    ];

    if (canUpdate || canDelete) {
      cols.push({
        key: "actions",
        label: "Actions",
        sortable: false,
        minWidth: "140px",
        render: row => editingId === row.id ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleUpdate(row.id)}
              disabled={saving}
              className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50 font-medium text-xs bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-slate-600 hover:text-slate-800 font-medium text-xs bg-slate-100 px-2.5 py-1.5 rounded-lg"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {canUpdate && (
              <>
                {/* Edit */}
                <button
                  onClick={() => handleStartEdit(row)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0]"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                  </svg>
                </button>
                {/* Toggle Active */}
                <button
                  onClick={() => handleToggleActive(row.id, !!row.is_active)}
                  disabled={saving}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${row.is_active
                    ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}
                  title={row.is_active ? "Deactivate" : "Activate"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                  </svg>
                </button>
              </>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(row.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
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
  }, [editingId, editingData, machines, saving, hasPermission, showInactive]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />
      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg mb-6 font-medium text-sm">
            {error}
          </div>
        )}

        <DataTable
          tableId="mould_master"
          title="Mould Master"
          data={moulds}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search moulds..."
          toggleActions={
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 select-none">
              <div
                onClick={() => setShowInactive(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${showInactive ? "bg-amber-400" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${showInactive ? "translate-x-4" : ""}`} />
              </div>
              Show Deactivated
            </label>
          }
          actionButton={
            hasPermission("mould", "write") && (
              <button
                onClick={() => navigate("/admin/moulds/create")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white transition-all hover:bg-[#2583b4] shadow-sm hover:shadow"
                title="Create Mould"
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

