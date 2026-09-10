import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import {
  getWorkshopEntryDetails,
  saveWorkshopEntry,
  getWorkshopShifts,
  saveWorkshopShift,
  deleteWorkshopShift,
  saveShiftHourlyLog,
  deleteShiftHourlyLog,
} from "../../api/workshopEntryApi";
import { getAllMachines } from "../../api/machineApi";
import { getOperators } from "../../api/operatorApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

export default function WorkshopEntryDetails() {
  const { pmemoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Data states
  const [entryData, setEntryData] = useState(null);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);

  // Editable form states
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [packingMethod, setPackingMethod] = useState("");

  // Shifts state
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  // Hourly Log Popup Modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeLogShift, setActiveLogShift] = useState(null);
  const [logModalFormData, setLogModalFormData] = useState({
    id: null,
    shift_id: null,
    time_from: "08:00",
    time_to: "09:00",
    operator_1_id: "",
    operator_2_id: "",
    product_weight: "",
    production: "",
    rejection: "0",
  });
  const [savingLog, setSavingLog] = useState(false);

  const loadShifts = async () => {
    try {
      setLoadingShifts(true);
      const res = await getWorkshopShifts(pmemoId);
      if (res.data?.success) {
        setShifts(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load shifts", err);
    } finally {
      setLoadingShifts(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [entryRes, machinesRes, operatorsRes, shiftsRes] = await Promise.all([
          getWorkshopEntryDetails(pmemoId),
          getAllMachines(false),
          getOperators(false),
          getWorkshopShifts(pmemoId),
        ]);

        if (entryRes.data?.success && entryRes.data.data) {
          const data = entryRes.data.data;
          setEntryData(data);
          setSelectedMachineId(data.machine_id ? String(data.machine_id) : "");
          setPackingMethod(data.packing_method || "");
        } else {
          setError("Workshop entry details not found.");
        }

        if (machinesRes.data?.data) {
          setMachines(machinesRes.data.data);
        }

        if (operatorsRes.data?.data) {
          setOperators(operatorsRes.data.data);
        }

        if (shiftsRes.data?.data) {
          setShifts(shiftsRes.data.data);
        }
      } catch (err) {
        console.error("Failed to load workshop entry details", err);
        setError(err.response?.data?.message || "Failed to load workshop entry details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pmemoId]);

  const handleSaveWorkshopDetails = async (e) => {
    e.preventDefault();
    if (!entryData?.pmemo_id) {
      toast.error("Invalid Production Memo");
      return;
    }

    try {
      setSaving(true);
      await saveWorkshopEntry({
        pmemo_id: entryData.pmemo_id,
        machine_id: selectedMachineId ? Number(selectedMachineId) : null,
        packing_method: packingMethod.trim(),
      });

      toast.success("Workshop details updated successfully!");
      const updatedRes = await getWorkshopEntryDetails(pmemoId);
      if (updatedRes.data?.success && updatedRes.data.data) {
        setEntryData(updatedRes.data.data);
      }
    } catch (err) {
      console.error("Failed to save workshop entry", err);
      toast.error(err.response?.data?.message || "Failed to save workshop entry");
    } finally {
      setSaving(false);
    }
  };

  // Shift Actions
  const handleAddShift = async () => {
    try {
      const defaultDate = entryData?.p_memo_date
        ? new Date(entryData.p_memo_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      const newShiftIndex = shifts.length + 1;
      const shiftName = newShiftIndex === 1 ? "Shift 1 (Day)" : newShiftIndex === 2 ? "Shift 2 (Night)" : `Shift ${newShiftIndex}`;

      const res = await saveWorkshopShift(pmemoId, {
        pmemo_id: pmemoId,
        shift_name: shiftName,
        shift_date: defaultDate,
        status: "Configured",
      });

      toast.success(`Created ${shiftName}`);
      loadShifts();
    } catch (err) {
      console.error("Failed to add shift", err);
      toast.error("Failed to add shift");
    }
  };

  const handleUpdateShift = async (shift) => {
    try {
      await saveWorkshopShift(pmemoId, shift);
      toast.success(`${shift.shift_name} updated successfully!`);
      loadShifts();
    } catch (err) {
      console.error("Failed to update shift", err);
      toast.error("Failed to update shift");
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm("Are you sure you want to delete this shift and all its hourly logs?")) return;
    try {
      await deleteWorkshopShift(shiftId);
      toast.success("Shift deleted");
      loadShifts();
    } catch (err) {
      console.error("Failed to delete shift", err);
      toast.error("Failed to delete shift");
    }
  };

  // Hourly Log Modal Actions
  const handleOpenAddLog = (shift) => {
    const existingLogs = shift.logs || [];
    let defaultTimeFrom = "08:00";
    let defaultTimeTo = "09:00";

    if (existingLogs.length > 0) {
      const lastLog = existingLogs[existingLogs.length - 1];
      if (lastLog.time_to && lastLog.time_to.includes(":")) {
        defaultTimeFrom = lastLog.time_to;
        const [h, m] = defaultTimeFrom.split(":").map(Number);
        const nextHour = (h + 1) % 24;
        defaultTimeTo = `${String(nextHour).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
      } else {
        const nextH = (existingLogs.length + 8) % 24;
        defaultTimeFrom = `${String(nextH).padStart(2, "0")}:00`;
        defaultTimeTo = `${String((nextH + 1) % 24).padStart(2, "0")}:00`;
      }
    }

    const defaultOp1 = shift.supervisor_a_id ? String(shift.supervisor_a_id) : (operators[0]?.id ? String(operators[0].id) : "");
    const defaultOp2 = shift.supervisor_b_id ? String(shift.supervisor_b_id) : "";
    const defaultWeight = entryData?.unit_weight != null ? String(entryData.unit_weight) : "";

    setLogModalFormData({
      id: null,
      shift_id: shift.id,
      time_from: defaultTimeFrom,
      time_to: defaultTimeTo,
      operator_1_id: defaultOp1,
      operator_2_id: defaultOp2,
      product_weight: defaultWeight,
      production: "",
      rejection: "0",
    });
    setActiveLogShift(shift);
    setIsLogModalOpen(true);
  };

  const handleOpenEditLog = (shift, log) => {
    let tFrom = log.time_from || "";
    let tTo = log.time_to || "";
    if (!tFrom && log.hour_slot && log.hour_slot.includes(" - ")) {
      const parts = log.hour_slot.split(" - ");
      tFrom = parts[0]?.trim();
      tTo = parts[1]?.trim();
    }

    setLogModalFormData({
      id: log.id,
      shift_id: shift.id,
      time_from: tFrom || "08:00",
      time_to: tTo || "09:00",
      operator_1_id: log.operator_id ? String(log.operator_id) : (log.operator_1_id ? String(log.operator_1_id) : ""),
      operator_2_id: log.operator_2_id ? String(log.operator_2_id) : "",
      product_weight: log.product_weight != null ? String(log.product_weight) : (entryData?.unit_weight != null ? String(entryData.unit_weight) : ""),
      production: log.actual_qty != null ? String(log.actual_qty) : "",
      rejection: log.rejection_qty != null ? String(log.rejection_qty) : "0",
    });
    setActiveLogShift(shift);
    setIsLogModalOpen(true);
  };

  const handleCloseLogModal = () => {
    setIsLogModalOpen(false);
    setActiveLogShift(null);
  };

  const handleSaveHourlyLogModal = async (e) => {
    if (e) e.preventDefault();
    if (!activeLogShift) return;

    if (!logModalFormData.time_from || !logModalFormData.time_to) {
      toast.error("Please provide Time (From and To)");
      return;
    }
    if (!logModalFormData.operator_1_id) {
      toast.error("Please select Operator 1");
      return;
    }
    if (logModalFormData.production === "" || isNaN(Number(logModalFormData.production))) {
      toast.error("Please enter valid Production quantity");
      return;
    }

    try {
      setSavingLog(true);
      await saveShiftHourlyLog(activeLogShift.id, {
        id: logModalFormData.id || undefined,
        shift_id: activeLogShift.id,
        time_from: logModalFormData.time_from,
        time_to: logModalFormData.time_to,
        hour_slot: `${logModalFormData.time_from} - ${logModalFormData.time_to}`,
        operator_1_id: logModalFormData.operator_1_id ? Number(logModalFormData.operator_1_id) : null,
        operator_id: logModalFormData.operator_1_id ? Number(logModalFormData.operator_1_id) : null,
        operator_2_id: logModalFormData.operator_2_id ? Number(logModalFormData.operator_2_id) : null,
        product_weight: logModalFormData.product_weight !== "" ? Number(logModalFormData.product_weight) : null,
        actual_qty: Number(logModalFormData.production) || 0,
        production: Number(logModalFormData.production) || 0,
        rejection_qty: Number(logModalFormData.rejection) || 0,
        rejection: Number(logModalFormData.rejection) || 0,
      });

      toast.success(logModalFormData.id ? "Hourly log updated successfully!" : "Hourly log entry recorded!");
      setIsLogModalOpen(false);
      setActiveLogShift(null);
      loadShifts();
    } catch (err) {
      console.error("Failed to save hourly log", err);
      toast.error("Failed to save hourly log");
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Delete this log entry?")) return;
    try {
      await deleteShiftHourlyLog(logId);
      toast.success("Log entry deleted");
      loadShifts();
    } catch (err) {
      console.error("Failed to delete log entry", err);
      toast.error("Failed to delete log entry");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen">
        <Navbar title="ERP Admin" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#369ACF] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium text-sm">Loading Workshop Entry Details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !entryData) {
    return (
      <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen">
        <Navbar title="ERP Admin" />
        <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-xl flex items-center justify-between">
            <span>{error || "Failed to load details"}</span>
            <button
              onClick={() => navigate("/production/workshop-entry")}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition cursor-pointer"
            >
              Back to Workshop Entries
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Calculated values
  const productDisplayName = [entryData.material_name, entryData.material_code].filter(Boolean).join(" - ") || "—";
  const pMemoFormattedNo = entryData.p_memo_no != null ? String(entryData.p_memo_no) : "—";
  const workOrderFormattedNo = entryData.work_order_no != null ? String(entryData.work_order_no) : "—";
  const productWeightFromBom = entryData.unit_weight != null && entryData.unit_weight !== "" ? `${Number(entryData.unit_weight).toFixed(4)} kg` : "—";
  const prodQtyNumber = Number(entryData.production_quantity) || 0;
  const prodQty = entryData.production_quantity != null ? prodQtyNumber.toFixed(2) : "0.00";

  const rawMaterials = entryData.rawMaterials || [];
  const processes = entryData.processes || [];

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] font-sans text-slate-900 min-h-screen pb-16">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Link */}
        <div className="mb-1">
          <Link
            to="/production/workshop-entry"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Workshop Entries</span>
          </Link>
        </div>

        {/* Page Title */}
        <div className="text-center my-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Workshop Entry
          </h1>
        </div>

        {/* Unified Upper Card */}
        <form onSubmit={handleSaveWorkshopDetails}>
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* Top Specifications Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              
              {/* Row 1: Left - Product */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Product
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center">
                  <span className="truncate" title={productDisplayName}>{productDisplayName}</span>
                </div>
              </div>

              {/* Row 1: Right - P.Memo No. */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  P.Memo No.
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center">
                  <span>{pMemoFormattedNo}</span>
                </div>
              </div>

              {/* Row 2: Left - Work Order No: */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Work Order No:
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center">
                  <span>{workOrderFormattedNo}</span>
                </div>
              </div>

              {/* Row 2: Right - Product weight(from bom) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Product weight(from bom)
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center justify-between">
                  <span>{productWeightFromBom}</span>
                  <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    BOM Spec
                  </span>
                </div>
              </div>

              {/* Row 3: Left - Production Qty.: */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Production Qty.:
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] flex items-center">
                  <span>{prodQty}</span>
                </div>
              </div>

              {/* Row 3: Right - Machine Name. */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Machine Name.
                </label>
                <div className="flex-1 bg-[#f8fafc] border border-slate-200/80 rounded-lg p-1 min-h-[40px] flex items-center gap-2">
                  <select
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    className="w-full h-8 px-2.5 text-sm font-medium bg-transparent border-none outline-none cursor-pointer text-slate-800"
                  >
                    <option value="">Select Machine...</option>
                    {machines.map((mac) => (
                      <option key={mac.id} value={mac.id}>
                        {mac.name} {mac.machine_number ? `(${mac.machine_number})` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded shrink-0 mr-1">
                    DAY SHIFT
                  </span>
                </div>
              </div>

              {/* Row 4: Full width - Packing Method */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 lg:col-span-2">
                <label className="text-sm font-semibold text-slate-700 w-full sm:w-48 shrink-0">
                  Packing Method.
                </label>
                <input
                  type="text"
                  value={packingMethod}
                  onChange={(e) => setPackingMethod(e.target.value)}
                  placeholder="Enter packing method..."
                  className="flex-1 bg-[#f8fafc] border border-slate-200/80 focus:border-indigo-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-slate-800 font-medium min-h-[40px] outline-none transition"
                />
              </div>

            </div>

            {/* Divider */}
            <hr className="border-slate-200/80 my-4" />

            {/* Raw Materials and Processes Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Raw Materials Section */}
              <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-4 sm:p-5 flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-boxes-stacked text-[#369ACF] text-sm"></i>
                    <h2 className="text-sm font-bold text-slate-800">Raw Materials (BOM Formulation)</h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {rawMaterials.length} {rawMaterials.length === 1 ? "Item" : "Items"}
                  </span>
                </div>

                {rawMaterials.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-slate-400">
                    <i className="fa-solid fa-box-open text-2xl mb-1.5 text-slate-300"></i>
                    <p className="text-xs font-medium">No BOM raw materials configured for this product.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse bg-white rounded-lg overflow-hidden border border-slate-200/80">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">Material Name</th>
                          <th className="py-2 px-2.5 text-right">BOM Qty</th>
                          <th className="py-2 px-2.5 text-right">Total Req.</th>
                          <th className="py-2 px-2.5 text-center">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {rawMaterials.map((rm, idx) => {
                          const bomQty = Number(rm.bom_quantity) || 0;
                          const totalReqQty = bomQty * prodQtyNumber;
                          return (
                            <tr key={rm.id || idx} className="hover:bg-slate-50/50 transition">
                              <td className="py-2.5 px-2.5 font-semibold text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                                <div>{rm.material_name}</div>
                                {rm.material_code && (
                                  <span className="font-mono text-[10px] text-slate-400">{rm.material_code}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-medium text-slate-700">
                                {bomQty.toFixed(4)}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">
                                {totalReqQty.toFixed(3)}
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-medium text-slate-500">
                                {rm.unit_name || "kg"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Processes List Section */}
              <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-4 sm:p-5 flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-gears text-indigo-600 text-sm"></i>
                    <h2 className="text-sm font-bold text-slate-800">Processes List</h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {processes.length} {processes.length === 1 ? "Step" : "Steps"}
                  </span>
                </div>

                {processes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-slate-400">
                    <i className="fa-solid fa-clock-rotate-left text-2xl mb-1.5 text-slate-300"></i>
                    <p className="text-xs font-medium">No BOM processes configured for this product.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse bg-white rounded-lg overflow-hidden border border-slate-200/80">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">Process Name</th>
                          <th className="py-2 px-2.5 text-right">Cycle Time</th>
                          <th className="py-2 px-2.5 text-center">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {processes.map((proc, idx) => (
                          <tr key={proc.id || idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-2.5 font-semibold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                              {proc.process_name || "—"}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">
                              {proc.time != null ? Number(proc.time).toFixed(2) : "—"}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-medium text-slate-500">
                              {proc.unit_name || "Sec"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Form Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/production/workshop-entry")}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk text-xs"></i>
                    <span>Update Workshop Entry</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* ─── Production Shifts Section (Hourly Work Entry) ─── */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                <i className="fa-solid fa-industry text-indigo-600"></i>
                <span>Production Shifts</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shifts rendered for machine:{" "}
                <span className="font-semibold text-slate-700">{entryData.machine_name || "Machine Not Set"}</span>{" "}
                ({shifts.length} {shifts.length === 1 ? "Shift" : "Shifts"} configured).
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddShift}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer self-start sm:self-auto"
            >
              <i className="fa-solid fa-plus"></i>
              Add Shift
            </button>
          </div>

          {/* Render All Shifts */}
          {shifts.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-slate-500 shadow-sm flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
                <i className="fa-solid fa-calendar-plus"></i>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-base">No Production Shifts Configured</p>
                <p className="text-xs text-slate-400 mt-1">Configure shifts to record hourly operator production and downtime.</p>
              </div>
              <button
                type="button"
                onClick={handleAddShift}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition cursor-pointer"
              >
                <i className="fa-solid fa-plus"></i>
                Configure Shift
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {shifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  operators={operators}
                  onUpdate={handleUpdateShift}
                  onDelete={handleDeleteShift}
                  onOpenAddLog={handleOpenAddLog}
                  onOpenEditLog={handleOpenEditLog}
                  onDeleteLog={handleDeleteLog}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── Popup Modal Form: Hourly Log Entry ─── */}
        {isLogModalOpen && activeLogShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-clock-rotate-left"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {logModalFormData.id ? "Edit Hourly Production Log" : "Add Hourly Log Entry"}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {activeLogShift.shift_name} • {activeLogShift.shift_date ? new Date(activeLogShift.shift_date).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseLogModal}
                  className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                  title="Close"
                >
                  <i className="fa-solid fa-xmark text-base"></i>
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSaveHourlyLogModal} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* 1. Time (From - To) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Time (From - To) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-500 mb-1">From Time</span>
                      <input
                        type="time"
                        value={logModalFormData.time_from}
                        onChange={(e) => setLogModalFormData({ ...logModalFormData, time_from: e.target.value })}
                        className="w-full h-10 px-3 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-500 mb-1">To Time</span>
                      <input
                        type="time"
                        value={logModalFormData.time_to}
                        onChange={(e) => setLogModalFormData({ ...logModalFormData, time_to: e.target.value })}
                        className="w-full h-10 px-3 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Operator 1 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Operator 1 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={logModalFormData.operator_1_id}
                    onChange={(e) => setLogModalFormData({ ...logModalFormData, operator_1_id: e.target.value })}
                    className="w-full h-10 px-3 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none cursor-pointer"
                    required
                  >
                    <option value="">— Select Operator 1 —</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.operator_name} {op.operator_code ? `(${op.operator_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Operator 2 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Operator 2
                  </label>
                  <select
                    value={logModalFormData.operator_2_id}
                    onChange={(e) => setLogModalFormData({ ...logModalFormData, operator_2_id: e.target.value })}
                    className="w-full h-10 px-3 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none cursor-pointer"
                  >
                    <option value="">— Select Operator 2 (Optional) —</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.operator_name} {op.operator_code ? `(${op.operator_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Product Weight */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Product Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={logModalFormData.product_weight}
                    onChange={(e) => setLogModalFormData({ ...logModalFormData, product_weight: e.target.value })}
                    placeholder="e.g. 0.0520"
                    className="w-full h-10 px-3 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                  />
                </div>

                {/* 5 & 6. Production & Rejection Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Production */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Production <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={logModalFormData.production}
                      onChange={(e) => setLogModalFormData({ ...logModalFormData, production: e.target.value })}
                      placeholder="Produced Qty"
                      className="w-full h-10 px-3 text-sm font-black text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                      required
                    />
                  </div>

                  {/* Rejection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Rejection
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={logModalFormData.rejection}
                      onChange={(e) => setLogModalFormData({ ...logModalFormData, rejection: e.target.value })}
                      placeholder="0"
                      className="w-full h-10 px-3 text-sm font-bold text-rose-600 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCloseLogModal}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingLog}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {savingLog ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-floppy-disk text-xs"></i>
                        <span>Save Log Entry</span>
                      </>
                    )}
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

// ─── Individual Shift Card Component ───
function ShiftCard({
  shift,
  operators,
  onUpdate,
  onDelete,
  onOpenAddLog,
  onOpenEditLog,
  onDeleteLog,
}) {
  const [editDate, setEditDate] = useState(
    shift.shift_date ? new Date(shift.shift_date).toISOString().split("T")[0] : ""
  );
  const [supervisorA, setSupervisorA] = useState(shift.supervisor_a_id ? String(shift.supervisor_a_id) : "");
  const [supervisorB, setSupervisorB] = useState(shift.supervisor_b_id ? String(shift.supervisor_b_id) : "");
  const [updating, setUpdating] = useState(false);

  const handleShiftFormSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    await onUpdate({
      ...shift,
      shift_date: editDate,
      supervisor_a_id: supervisorA ? Number(supervisorA) : null,
      supervisor_b_id: supervisorB ? Number(supervisorB) : null,
    });
    setUpdating(false);
  };

  const logs = shift.logs || [];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
      {/* Shift Header Bar */}
      <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center font-bold text-sm">
            <i className="fa-solid fa-gear"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{shift.shift_name}</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <i className="fa-solid fa-check text-[9px]"></i>
                Configured
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Shift Date: <span className="font-semibold text-slate-700">{editDate || "—"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDelete(shift.id)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            title="Delete Shift"
          >
            <i className="fa-regular fa-trash-can mr-1"></i>
            Delete
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Shift Configuration Form Row */}
        <form onSubmit={handleShiftFormSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* DATE */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <DateInput
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full h-10 px-3 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                required
              />
            </div>

            {/* SUPERVISOR (A) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Supervisor (A)
              </label>
              <select
                value={supervisorA}
                onChange={(e) => setSupervisorA(e.target.value)}
                className="w-full h-10 px-3 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none cursor-pointer"
              >
                <option value="">— Select Supervisor —</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.operator_name} {op.operator_code ? `(${op.operator_code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* SUPERVISOR (B) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Supervisor (B)
              </label>
              <select
                value={supervisorB}
                onChange={(e) => setSupervisorB(e.target.value)}
                className="w-full h-10 px-3 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none cursor-pointer"
              >
                <option value="">— Select Supervisor —</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.operator_name} {op.operator_code ? `(${op.operator_code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* UPDATE SHIFT BUTTON */}
            <div>
              <button
                type="submit"
                disabled={updating}
                className="w-full h-10 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition whitespace-nowrap cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                {updating ? (
                  "Saving..."
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk text-xs"></i>
                    <span>Update Shift</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <hr className="border-slate-100" />

        {/* ─── Hourly Production Logs Section ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-list-check text-slate-500 text-sm"></i>
              <h4 className="text-sm font-bold text-slate-800">Hourly Production Logs</h4>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {logs.length} {logs.length === 1 ? "Entry" : "Entries"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onOpenAddLog(shift)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
              Add Hourly Log Entry
            </button>
          </div>

          {/* Logs Table / Empty View */}
          {logs.length === 0 ? (
            <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-xl py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-400">
                <i className="fa-solid fa-file-lines text-base"></i>
              </div>
              <p className="text-sm font-bold text-slate-700">No production logs recorded yet for {shift.shift_name}.</p>
              <p className="text-xs text-slate-400">Click the button below to open the log entry form.</p>
              <button
                type="button"
                onClick={() => onOpenAddLog(shift)}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition cursor-pointer"
              >
                <i className="fa-solid fa-plus text-[10px]"></i>
                Add Log Entry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="py-2.5 px-3">Time (From - To)</th>
                    <th className="py-2.5 px-3">Operator 1</th>
                    <th className="py-2.5 px-3">Operator 2</th>
                    <th className="py-2.5 px-3 text-right">Product Weight</th>
                    <th className="py-2.5 px-3 text-right">Production</th>
                    <th className="py-2.5 px-3 text-right">Rejection</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {logs.map((log) => {
                    const timeDisplay = (log.time_from && log.time_to)
                      ? `${log.time_from} - ${log.time_to}`
                      : (log.hour_slot || "—");

                    const op1Display = log.operator_1_name
                      ? `${log.operator_1_name} ${log.operator_1_code ? `(${log.operator_1_code})` : ""}`
                      : (log.operator_name ? `${log.operator_name} ${log.operator_code ? `(${log.operator_code})` : ""}` : "—");

                    const op2Display = log.operator_2_name
                      ? `${log.operator_2_name} ${log.operator_2_code ? `(${log.operator_2_code})` : ""}`
                      : "—";

                    const weightDisplay = log.product_weight != null && log.product_weight !== ""
                      ? `${Number(log.product_weight).toFixed(4)} kg`
                      : "—";

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{timeDisplay}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{op1Display}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-600">{op2Display}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">{weightDisplay}</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                          {Number(log.actual_qty || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {Number(log.rejection_qty || 0) > 0 ? Number(log.rejection_qty).toLocaleString() : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <button
                              type="button"
                              onClick={() => onOpenEditLog(shift, log)}
                              className="text-slate-400 hover:text-indigo-600 transition p-1 cursor-pointer"
                              title="Edit Log Entry"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteLog(log.id)}
                              className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                              title="Delete Log Entry"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
