import React, { useState, useEffect } from "react";
import { getNextFreeSlot } from "../api/machineScheduleApi";

export default function MachineMouldPlanner({
  isOpen,
  onClose,
  onConfirm,
  materialId,
  materialName,
  quantity = 0,
  initialMouldId = "",
  initialMachineId = "",
  boms = [],
  moulds = [],
  machines = []
}) {
  const [selectedMouldId, setSelectedMouldId] = useState(initialMouldId);
  const [selectedMachineId, setSelectedMachineId] = useState(initialMachineId);
  const [machineAvailability, setMachineAvailability] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMouldId(initialMouldId);
      setSelectedMachineId(initialMachineId);
    }
  }, [isOpen, initialMouldId, initialMachineId]);

  // Find compatible moulds for this material
  const allowedMoulds = React.useMemo(() => {
    if (!materialId) return [];
    const matchingBOM = boms.find((b) => b.material_id === materialId);
    if (matchingBOM && (matchingBOM.mould_ids || matchingBOM.mould_id)) {
      const compatibleIds = matchingBOM.mould_ids
        ? String(matchingBOM.mould_ids).split(",").map(Number)
        : [Number(matchingBOM.mould_id)];
      return moulds.filter((m) => compatibleIds.includes(m.id));
    }
    return moulds; // Default fallback
  }, [materialId, boms, moulds]);

  // Find compatible machines for the selected mould
  const allowedMachines = React.useMemo(() => {
    if (!selectedMouldId) return [];
    const selMould = moulds.find((m) => String(m.id) === String(selectedMouldId));
    if (!selMould) return [];

    const linkedMachineIds = selMould.machine_ids
      ? String(selMould.machine_ids).split(",").map(Number)
      : [];

    return machines.filter((m) => linkedMachineIds.includes(m.id));
  }, [selectedMouldId, moulds, machines]);

  // Fetch machine availability/slots in parallel when selectedMouldId changes
  useEffect(() => {
    if (!isOpen || !selectedMouldId || allowedMachines.length === 0) {
      setMachineAvailability({});
      return;
    }

    const fetchSlots = async () => {
      setLoadingAvailability(true);
      const slotsMap = {};
      await Promise.all(
        allowedMachines.map(async (m) => {
          try {
            const res = await getNextFreeSlot(m.id);
            slotsMap[m.id] = res.data?.data || null;
          } catch (err) {
            console.error(`Failed to fetch slot for machine ${m.id}`, err);
            slotsMap[m.id] = null;
          }
        })
      );
      setMachineAvailability(slotsMap);
      setLoadingAvailability(false);
    };

    fetchSlots();
  }, [isOpen, selectedMouldId, allowedMachines]);

  // Automatically reset machine if it's no longer compatible with the newly selected mould
  useEffect(() => {
    if (selectedMachineId) {
      const isStillCompatible = allowedMachines.some(
        (m) => String(m.id) === String(selectedMachineId)
      );
      if (!isStillCompatible) {
        setSelectedMachineId("");
      }
    }
  }, [selectedMouldId, allowedMachines, selectedMachineId]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedMouldId && selectedMachineId) {
      onConfirm(selectedMouldId, selectedMachineId);
      onClose();
    }
  };

  const getEstTimeHours = (mould) => {
    if (!mould || !mould.cavity || !mould.std_cycle_time || !quantity) return null;
    const totalSecs = Number(quantity) * (parseFloat(mould.std_cycle_time) / parseFloat(mould.cavity));
    return (totalSecs / 3600).toFixed(2);
  };

  const formatFreeDate = (avail) => {
    if (!avail) return { text: "No shift/calendar setup", colorClass: "text-rose-600 bg-rose-50 border-rose-200" };
    
    // Check if the date is today
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const isToday = avail.date === todayStr;

    // Format start hour nicely
    const startHr = parseFloat(avail.start_hour || 0);
    const hour = Math.floor(startHr);
    const mins = Math.round((startHr - hour) * 60);
    const timeStr = `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

    const [yr, mn, dy] = avail.date.split("-");
    const formattedDate = `${dy}/${mn}/${yr}`;

    if (isToday && startHr <= 0.01) {
      return { 
        text: `🟢 Available from ${formattedDate} at ${timeStr}`, 
        colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200" 
      };
    }

    return {
      text: `🟡 Available from ${formattedDate} at ${timeStr}`,
      colorClass: "text-amber-700 bg-amber-50 border-amber-200"
    };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-calendar-days text-[#369ACF]"></i>
              Machine & Mould Selection Planner
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Check real-time machine availability to pick the best scheduling slot.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Context Details */}
          <div className="bg-[#369ACF]/5 border border-[#369ACF]/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Material / Product</span>
              <p className="text-sm font-bold text-slate-800">{materialName || "N/A"}</p>
            </div>
            <div className="sm:text-right">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan Qty</span>
              <p className="text-sm font-bold text-[#369ACF]">{Number(quantity).toLocaleString()} units</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step 1: Mould Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span>
                Select Mould
              </h4>
              
              {allowedMoulds.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  No moulds configured for this product.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[45vh] overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                      <tr>
                        <th scope="col" className="w-12 px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Select
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Mould Name
                        </th>
                        <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Cavities
                        </th>
                        <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Cycle Time
                        </th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Est. Hrs
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {allowedMoulds.map((m) => {
                        const estHours = getEstTimeHours(m);
                        const isSelected = String(m.id) === String(selectedMouldId);
                        return (
                          <tr 
                            key={m.id} 
                            onClick={() => setSelectedMouldId(m.id)}
                            className={`hover:bg-indigo-50/20 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                          >
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name="selectedMould"
                                checked={isSelected}
                                onChange={() => setSelectedMouldId(m.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                              {m.mould_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-slate-600 font-medium">
                              {m.cavity || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-slate-600 font-medium">
                              {m.std_cycle_time ? `${m.std_cycle_time}s` : "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-indigo-600 font-bold">
                              {estHours ? `${estHours}h` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Step 2: Machine Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
                Select Compatible Machine
              </h4>

              {!selectedMouldId ? (
                <div className="h-40 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400 p-6 text-center">
                  Select a mould first to see compatible machines.
                </div>
              ) : allowedMachines.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  No compatible machines configured for this mould.
                </div>
              ) : loadingAvailability ? (
                <div className="h-40 flex flex-col justify-center items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                  <span className="text-xs text-slate-400 font-medium">Fetching machine schedules...</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[45vh] overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                      <tr>
                        <th scope="col" className="w-12 px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Select
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Machine Name
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Availability Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {allowedMachines.map((m) => {
                        const isSelected = String(m.id) === String(selectedMachineId);
                        const avail = machineAvailability[m.id];
                        const info = formatFreeDate(avail);
                        return (
                          <tr 
                            key={m.id} 
                            onClick={() => setSelectedMachineId(m.id)}
                            className={`hover:bg-indigo-50/20 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                          >
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name="selectedMachine"
                                checked={isSelected}
                                onChange={() => setSelectedMachineId(m.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                              <div className="font-semibold text-slate-800">{m.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">No: {m.machine_number || "—"}</div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className={`px-2.5 py-1 font-semibold rounded-lg border inline-block ${info.colorClass}`}>
                                {info.text}
                              </span>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-150 flex items-center justify-end gap-3 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-250 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMouldId || !selectedMachineId}
            className="px-5 py-2 bg-[#369ACF] hover:bg-[#2583b4] disabled:bg-[#369ACF]/40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-check"></i>
            Confirm Selection
          </button>
        </div>

      </div>
    </div>
  );
}
