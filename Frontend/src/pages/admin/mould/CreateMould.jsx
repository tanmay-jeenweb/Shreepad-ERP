import { useEffect, useState, useRef } from "react";
import Navbar from "../../../components/Navbar";
import { createMould } from "../../../api/mouldApi";
import { getAllMachines } from "../../../api/machineApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateMould() {
  const [machines, setMachines] = useState([]);
  const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);
  const machineDropdownRef = useRef(null);

  const [form, setForm] = useState({
    mouldName: "",
    machineIds: [],
    cavity: "",
    stdCycleTime: "",
    cycleTimeBandSec: "",
    stdProductionPerHour: "",
    cycleTimeTolerance: "",
    maintenance: false
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getAllMachines()
      .then(res => setMachines(res.data.data || []))
      .catch(err => {
        console.error("Failed to load machines", err);
        toast.error("Failed to load machines. Check if you have machine read permissions.");
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (machineDropdownRef.current && !machineDropdownRef.current.contains(e.target)) {
        setMachineDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleMachine = (id) => {
    setForm(prev => ({
      ...prev,
      machineIds: prev.machineIds.includes(id)
        ? prev.machineIds.filter(m => m !== id)
        : [...prev.machineIds, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.mouldName.trim()) {
      setError("Mould name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("mouldName", form.mouldName.trim());
      formData.append("machineIds", form.machineIds.join(","));
      formData.append("cavity", form.cavity || "");
      formData.append("stdCycleTime", form.stdCycleTime || "");
      formData.append("cycleTimeBandSec", form.cycleTimeBandSec || "");
      formData.append("stdProductionPerHour", form.stdProductionPerHour || "");
      formData.append("cycleTimeTolerance", form.cycleTimeTolerance || "");
      formData.append("maintenance", form.maintenance ? "true" : "false");
      formData.append("isActive", "true");
      if (selectedFile) formData.append("file", selectedFile);

      await createMould(formData);
      toast.success(`Mould '${form.mouldName.trim()}' created successfully.`);
      setTimeout(() => navigate("/admin/moulds"), 900);
    } catch (err) {
      console.error("Failed to create mould", err);
      setError(err?.response?.data?.message || "Unable to create mould. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors text-slate-800";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div className="flex-1 bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create Mould</h1>
            <p className="text-slate-500 mt-1 text-sm">Add a new mould definition to the system.</p>
          </div>
          <button
            onClick={() => navigate("/admin/moulds")}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Moulds List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Alerts */}
          <div className="flex flex-col gap-3 mb-5">
            {message && <div className="text-emerald-700 font-medium text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-200">{message}</div>}
            {error && <div className="text-rose-600 font-medium text-sm bg-rose-50 p-3 rounded-lg border border-rose-200">{error}</div>}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Mould Name */}
              <div className="sm:col-span-2">
                <label className={labelClass}>Mould Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Cap Mould A-01"
                  value={form.mouldName}
                  onChange={e => setForm({ ...form, mouldName: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              {/* Suitable Machines — multi-select dropdown */}
              <div className="sm:col-span-2" ref={machineDropdownRef}>
                <label className={labelClass}>Suitable Machines</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMachineDropdownOpen(o => !o)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                  >
                    <span className={form.machineIds.length === 0 ? "text-slate-400" : "text-slate-800 font-medium"}>
                      {form.machineIds.length === 0
                        ? "Select machines..."
                        : `Selected: ${machines.filter(m => form.machineIds.includes(m.id)).map(m => m.name).join(", ")}`}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${machineDropdownOpen ? "rotate-180" : ""}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {machineDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {machines.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-400">No machines available</p>
                      ) : (
                        machines.map(m => (
                          <label
                            key={m.id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={form.machineIds.includes(m.id)}
                              onChange={() => toggleMachine(m.id)}
                              className="h-4 w-4 rounded text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                            />
                            <div className="flex flex-col leading-tight">
                              <span className="font-medium text-slate-800">{m.name}</span>
                              <span className="text-xs text-slate-400">#{m.machine_number}</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {form.machineIds.length > 0 && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {/* Selected: {machines.filter(m => form.machineIds.includes(m.id)).map(m => m.name).join(", ")} */}
                    {`${form.machineIds.length} machine${form.machineIds.length > 1 ? "s" : ""} selected`}
                  </p>
                )}
              </div>

              {/* Cavity */}
              <div>
                <label className={labelClass}>Cavity (Nos)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 4"
                  value={form.cavity}
                  onChange={e => setForm({ ...form, cavity: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* Std Cycle Time */}
              <div>
                <label className={labelClass}>Std Cycle Time</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="e.g. 30.5"
                    value={form.stdCycleTime}
                    onChange={e => setForm({ ...form, stdCycleTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg pl-4 pr-14 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 text-sm font-medium">sec</div>
                </div>
              </div>

              {/* Cycle Time Band */}
              <div>
                <label className={labelClass}>Std Cycle Time Band <span className="text-slate-400 font-normal">(for hour entry)</span></label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 5"
                    value={form.cycleTimeBandSec}
                    onChange={e => setForm({ ...form, cycleTimeBandSec: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg pl-4 pr-16 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 text-sm font-medium">± sec</div>
                </div>
              </div>

              {/* Std Production Per Hour */}
              <div>
                <label className={labelClass}>Std Production per Hour</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 420"
                    value={form.stdProductionPerHour}
                    onChange={e => setForm({ ...form, stdProductionPerHour: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg pl-4 pr-16 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 text-sm font-medium">pcs/hr</div>
                </div>
              </div>

              {/* Cycle Time Tolerance */}
              <div>
                <label className={labelClass}>Cycle Time Tolerance [±] <span className="text-slate-400 font-normal">(for alarm)</span></label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 3"
                    value={form.cycleTimeTolerance}
                    onChange={e => setForm({ ...form, cycleTimeTolerance: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg pl-4 pr-14 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 text-sm font-medium">sec</div>
                </div>
              </div>

              {/* Maintenance */}
              <div>
                <label className={labelClass}>Maintenance</label>
                <div className="flex gap-6 items-center h-10">
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="maintenance"
                      checked={form.maintenance === true}
                      onChange={() => setForm({ ...form, maintenance: true })}
                      className="mr-2 h-4 w-4 text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                    />
                    Yes
                  </label>
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="maintenance"
                      checked={form.maintenance === false}
                      onChange={() => setForm({ ...form, maintenance: false })}
                      className="mr-2 h-4 w-4 text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                    />
                    No
                  </label>
                </div>
              </div>

              {/* File Attachment */}
              <div className="sm:col-span-2">
                <label className={labelClass}>File Attachment <span className="text-slate-400 font-normal">(drawing, datasheet, etc.)</span></label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center gap-3 px-4 py-2.5 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                    <span className="text-sm text-slate-500 truncate">
                      {selectedFile ? selectedFile.name : "Click to browse or drag & drop a file"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={e => setSelectedFile(e.target.files[0] || null)}
                    />
                  </label>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-medium px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="pt-6 flex justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate("/admin/moulds")}
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm"
              >
                {saving ? "Saving..." : "Create Mould"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

