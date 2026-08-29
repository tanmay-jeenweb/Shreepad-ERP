import { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { getAllMachines, updateMachine, deleteMachine, toggleMachineActive } from "../../../api/machineApi";
import { getMachineTypes } from "../../../api/machineTypeApi";
import { getLocations } from "../../../api/locationApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../../context/PermissionContext";

export default function MachineMaster() {
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [machineTypes, setMachineTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [mRes, typesRes, locRes] = await Promise.all([
        getAllMachines(showInactive),
        getMachineTypes(),
        getLocations()
      ]);
      setMachines(mRes.data.data || []);
      setMachineTypes(typesRes.data.data || []);
      setLocations(locRes.data.data || []);
    } catch (err) {
      console.error("Failed to load machine data", err);
      setError("Unable to load machine data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showInactive]);

  const handleStartEdit = (m) => {
    setEditingId(m.id);
    setEditingData({
      machineNumber: m.machine_number,
      name: m.name,
      machineTypeId: m.machine_type_id || "",
      capacity: m.capacity || "",
      locationId: m.location_id || "",
      companyName: m.company_name || "",
      maxPowerConsumption: m.max_power_consumption || "",
      outgoingJobWork: !!m.outgoing_job_work,
      machineShift: m.machine_shift || "day shift",
      maintenance: !!m.maintenance,
      active: !!m.active
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const handleUpdate = async (id) => {
    setSaving(true);
    setError("");
    try {
      await updateMachine(id, editingData);
      toast.success("Machine updated");
      setEditingId(null);
      setEditingData(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to update machine");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this machine?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteMachine(id);
      toast.success("Machine deleted");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete machine");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    const newState = !currentActive;
    const label = newState ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${label} this machine?`)) return;
    setSaving(true);
    try {
      await toggleMachineActive(id, newState);
      toast.success(`Machine ${newState ? "activated" : "deactivated"}`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to update machine status");
    } finally {
      setSaving(false);
    }
  };

  const { hasPermission } = usePermission();

  const columns = useMemo(() => {
    const cols = [
      { key: "id", label: "ID", minWidth: "60px" },
      {
        key: "machine_number",
        label: "Machine No",
        minWidth: "140px",
        render: (row) =>
          editingId === row.id ? (
            <input
              value={editingData?.machineNumber || ""}
              onChange={(e) =>
                setEditingData({ ...editingData, machineNumber: e.target.value })
              }
              className="border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
            />
          ) : (
            row.machine_number
          )
      },
      {
        key: "name",
        label: "Name",
        minWidth: "160px",
        render: (row) =>
          editingId === row.id ? (
            <input
              value={editingData?.name || ""}
              onChange={(e) =>
                setEditingData({ ...editingData, name: e.target.value })
              }
              className="border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm font-semibold text-slate-800"
            />
          ) : (
            <span className="font-semibold text-slate-900">{row.name}</span>
          )
      },
      {
        key: "machine_type_name",
        label: "Type",
        minWidth: "140px",
        render: (row) =>
          editingId === row.id ? (
            <select
              value={editingData?.machineTypeId || ""}
              onChange={(e) =>
                setEditingData({ ...editingData, machineTypeId: e.target.value })
              }
              className="border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm bg-white"
            >
              <option value="">Select type</option>
              {machineTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.machine_type_name}
                </option>
              ))}
            </select>
          ) : (
            row.machine_type_name || "N/A"
          )
      },
      {
        key: "capacity",
        label: "Capacity",
        minWidth: "140px",
        render: (row) =>
          editingId === row.id ? (
            <div className="relative">
              <input
                value={editingData?.capacity || ""}
                onChange={(e) =>
                  setEditingData({ ...editingData, capacity: e.target.value })
                }
                className="border border-slate-300 rounded-lg pl-2 pr-12 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm font-normal text-slate-800"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400 text-xs">
                Tons
              </div>
            </div>
          ) : row.capacity ? (
            <span>{row.capacity} Tons</span>
          ) : (
            "N/A"
          )
      },
      {
        key: "location_name",
        label: "Location",
        minWidth: "140px",
        render: (row) =>
          editingId === row.id ? (
            <select
              value={editingData?.locationId || ""}
              onChange={(e) =>
                setEditingData({ ...editingData, locationId: e.target.value })
              }
              className="border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm bg-white"
            >
              <option value="">Select location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.location_name}
                </option>
              ))}
            </select>
          ) : (
            row.location_name || "N/A"
          )
      },
      // {
      //   key: "added_by_name",
      //   label: "Added By",
      //   minWidth: "120px",
      //   render: (row) => row.added_by_name || "Unknown"
      // },
      // {
      //   key: "device_id",
      //   label: "Device ID",
      //   minWidth: "140px",
      //   render: (row) => (
      //     <span className="font-mono text-slate-500 text-xs">
      //       {row.device_id || "N/A"}
      //     </span>
      //   )
      // },
      {
        key: "company_name",
        label: "Company",
        minWidth: "140px",
        render: (row) =>
          editingId === row.id ? (
            <input
              value={editingData?.companyName || ""}
              onChange={(e) =>
                setEditingData({ ...editingData, companyName: e.target.value })
              }
              className="border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
            />
          ) : (
            row.company_name || "N/A"
          )
      },
      {
        key: "max_power_consumption",
        label: "Max Power",
        minWidth: "150px",
        render: (row) =>
          editingId === row.id ? (
            <div className="relative">
              <input
                value={editingData?.maxPowerConsumption || ""}
                onChange={(e) =>
                  setEditingData({
                    ...editingData,
                    maxPowerConsumption: e.target.value
                  })
                }
                className="border border-slate-300 rounded-lg pl-2 pr-14 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm font-normal text-slate-800"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400 text-xs">
                Unit/Hr.
              </div>
            </div>
          ) : row.max_power_consumption ? (
            <span>{row.max_power_consumption} Unit/Hr.</span>
          ) : (
            "N/A"
          )
      },
      {
        key: "outgoing_job_work",
        label: "Outgoing",
        minWidth: "120px",
        render: (row) =>
          editingId === row.id ? (
            <div className="flex gap-2">
              <label className="inline-flex items-center text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name={"out-" + row.id}
                  checked={editingData?.outgoingJobWork === true}
                  onChange={() =>
                    setEditingData({ ...editingData, outgoingJobWork: true })
                  }
                  className="mr-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                />
                Yes
              </label>
              <label className="inline-flex items-center text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name={"out-" + row.id}
                  checked={editingData?.outgoingJobWork === false}
                  onChange={() =>
                    setEditingData({ ...editingData, outgoingJobWork: false })
                  }
                  className="mr-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                />
                No
              </label>
            </div>
          ) : row.outgoing_job_work ? (
            "Yes"
          ) : (
            "No"
          )
      },
      {
        key: "machine_shift",
        label: "Shift",
        minWidth: "180px",
        render: (row) =>
          editingId === row.id ? (
            <div className="flex gap-2 text-xs font-medium">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={"shift-" + row.id}
                  value="day shift"
                  checked={editingData?.machineShift === "day shift"}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      machineShift: e.target.value
                    })
                  }
                  className="mr-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                />
                Day
              </label>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={"shift-" + row.id}
                  value="day-night shift"
                  checked={editingData?.machineShift === "day-night shift"}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      machineShift: e.target.value
                    })
                  }
                  className="mr-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                />
                D-N
              </label>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={"shift-" + row.id}
                  value="3shift"
                  checked={editingData?.machineShift === "3shift"}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      machineShift: e.target.value
                    })
                  }
                  className="mr-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                />
                3S
              </label>
            </div>
          ) : (
            row.machine_shift || "N/A"
          )
      },
      {
        key: "maintenance",
        label: "Maintenance",
        minWidth: "120px",
        render: (row) =>
          editingId === row.id ? (
            <div className="flex gap-2">
              <label className="inline-flex items-center text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name={"main-" + row.id}
                  checked={editingData?.maintenance === true}
                  onChange={() =>
                    setEditingData({ ...editingData, maintenance: true })
                  }
                  className="mr-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                />
                Yes
              </label>
              <label className="inline-flex items-center text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name={"main-" + row.id}
                  checked={editingData?.maintenance === false}
                  onChange={() =>
                    setEditingData({ ...editingData, maintenance: false })
                  }
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
        key: "active",
        label: "Status",
        minWidth: "130px",
        render: (row) =>
          editingId === row.id ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() =>
                  setEditingData({ ...editingData, active: !editingData.active })
                }
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${
                  editingData?.active ? "bg-emerald-500" : "bg-amber-400"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    editingData?.active ? "translate-x-4" : ""
                  }`}
                />
              </div>
              <span className="text-xs font-medium text-slate-600">
                {editingData?.active ? "Active" : "Inactive"}
              </span>
            </label>
          ) : row.active ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Deactivated
            </span>
          )
      }
    ];

    const canUpdate = hasPermission("machine", "update");
    const canDelete = hasPermission("machine", "delete");

    if (canUpdate || canDelete) {
      cols.push({
        key: "actions",
        label: "Actions",
        sortable: false,
        minWidth: "140px",
        render: (row) =>
          editingId === row.id ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleUpdate(row.id)}
                disabled={saving}
                className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50 font-medium text-xs bg-emerald-50 px-2 py-1 rounded"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-slate-600 hover:text-slate-800 font-medium text-xs bg-slate-100 px-2 py-1 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {canUpdate && (
                <>
                  <button
                    onClick={() => handleStartEdit(row)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0]"
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
                  <button
                    onClick={() => handleToggleActive(row.id, !!row.active)}
                    disabled={saving}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                      row.active
                        ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    }`}
                    title={row.active ? "Deactivate" : "Activate"}
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
                </>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(row.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
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
          )
      });
    }

    return cols;
  }, [editingId, editingData, machineTypes, locations, saving, hasPermission, showInactive]);

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
          tableId="machine_master"
          title="Machine Master"
          data={machines}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search machines..."
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
              Show Deactivated
            </label>
          }
          actionButton={
            hasPermission("machine", "write") && (
              <button
                onClick={() => navigate("/admin/machines/create")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white transition-all hover:bg-[#2583b4] shadow-sm hover:shadow"
                title="Create Machine"
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

