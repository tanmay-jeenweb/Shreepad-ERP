import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar";
import { createMachine } from "../../../api/machineApi";
import { getMachineTypes } from "../../../api/machineTypeApi";
import { getLocations } from "../../../api/locationApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateMachine() {
  const [machineTypes, setMachineTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [newMachine, setNewMachine] = useState({
    machineNumber: "",
    name: "",
    machineTypeId: "",
    capacity: "",
    locationId: "",
    companyName: "",
    maxPowerConsumption: "",
    outgoingJobWork: false,
    machineShift: "day shift",
    maintenance: false
  });
  const [saving, setSaving] = useState(false);
  // const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [typesRes, locRes] = await Promise.all([getMachineTypes(), getLocations()]);
      setMachineTypes(typesRes.data.data || []);
      setLocations(locRes.data.data || []);
    } catch (err) {
      console.error("Failed to load machine dropdown data", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMachine = async (event) => {
    event.preventDefault();
    if (!newMachine.machineNumber.trim() || !newMachine.name.trim()) {
      setError("Machine number and name are required.");
      return;
    }

    setSaving(true);
    setError("");
    // setMessage("");

    try {
      await createMachine(newMachine);
      // setMessage(`Machine '${newMachine.name.trim()}' added successfully.`);
      toast.success(`Machine '${newMachine.name.trim()}' added successfully.`);

      setNewMachine({
        machineNumber: "",
        name: "",
        machineTypeId: "",
        capacity: "",
        locationId: "",
        companyName: "",
        maxPowerConsumption: "",
        outgoingJobWork: false,
        machineShift: "day shift",
        maintenance: false
      });
      setTimeout(() => {
        navigate("/admin/machines");
      }, 1000);
    } catch (err) {
      console.error("Failed to add machine", err);
      const serverMessage = err?.response?.data?.message;
      // setError(serverMessage || "Unable to add machine. Please try again.");
      toast.error(serverMessage || "Unable to add machine. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create Machine</h1>
            <p className="text-slate-500 mt-1">Add a new machine to the system.</p>
          </div>
          <button
            onClick={() => navigate("/admin/machines")}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Machine List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col gap-4 mb-4">
            {/* {message && <div className="text-emerald-600 font-medium text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-200">{message}</div>} */}
            {/* {error && <div className="text-rose-600 font-medium text-sm bg-rose-50 p-3 rounded-lg border border-rose-200">{error}</div>} */}
          </div>

          <form className="space-y-6" onSubmit={handleAddMachine}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Machine Number <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. M-101"
                  value={newMachine.machineNumber}
                  onChange={(e) => setNewMachine({ ...newMachine, machineNumber: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Machine Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter machine name"
                  value={newMachine.name}
                  onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Machine Type</label>
                <select
                  value={newMachine.machineTypeId}
                  onChange={(e) => setNewMachine({ ...newMachine, machineTypeId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] bg-white transition-colors text-slate-700"
                >
                  <option value="">Select type</option>
                  {machineTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.machine_type_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 500"
                    value={newMachine.capacity}
                    onChange={(e) => setNewMachine({ ...newMachine, capacity: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg pl-4 pr-16 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 text-sm font-medium">
                    Tons
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <select
                  value={newMachine.locationId}
                  onChange={(e) => setNewMachine({ ...newMachine, locationId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] bg-white transition-colors text-slate-700"
                >
                  <option value="">Select location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.location_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="Manufacturer / Company"
                  value={newMachine.companyName}
                  onChange={(e) => setNewMachine({ ...newMachine, companyName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Power Consumption</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 15"
                    value={newMachine.maxPowerConsumption}
                    onChange={(e) => setNewMachine({ ...newMachine, maxPowerConsumption: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg pl-4 pr-20 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 text-sm font-medium">
                    Unit/Hr.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Outgoing Job Work</label>
                <div className="flex gap-6 items-center h-10">
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="outgoing"
                      checked={newMachine.outgoingJobWork === true}
                      onChange={() => setNewMachine({ ...newMachine, outgoingJobWork: true })}
                      className="mr-2 h-4 w-4 text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                    />
                    Yes
                  </label>
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="outgoing"
                      checked={newMachine.outgoingJobWork === false}
                      onChange={() => setNewMachine({ ...newMachine, outgoingJobWork: false })}
                      className="mr-2 h-4 w-4 text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                    />
                    No
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Maintenance</label>
                <div className="flex gap-6 items-center h-10">
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="maintenance"
                      checked={newMachine.maintenance === true}
                      onChange={() => setNewMachine({ ...newMachine, maintenance: true })}
                      className="mr-2 h-4 w-4 text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                    />
                    Yes
                  </label>
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="maintenance"
                      checked={newMachine.maintenance === false}
                      onChange={() => setNewMachine({ ...newMachine, maintenance: false })}
                      className="mr-2 h-4 w-4 text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                    />
                    No
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Machine Shift</label>
                <div className="flex gap-6 items-center h-10">
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="shift"
                      value="day shift"
                      checked={newMachine.machineShift === "day shift"}
                      onChange={(e) => setNewMachine({ ...newMachine, machineShift: e.target.value })}
                      className="mr-2 h-4 w-4 text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                    />
                    Day shift
                  </label>
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="shift"
                      value="day-night shift"
                      checked={newMachine.machineShift === "day-night shift"}
                      onChange={(e) => setNewMachine({ ...newMachine, machineShift: e.target.value })}
                      className="mr-2 h-4 w-4 text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                    />
                    Day-Night
                  </label>
                  <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="shift"
                      value="3shift"
                      checked={newMachine.machineShift === "3shift"}
                      onChange={(e) => setNewMachine({ ...newMachine, machineShift: e.target.value })}
                      className="mr-2 h-4 w-4 text-[#369ACF] border-slate-300 focus:ring-[#369ACF]"
                    />
                    3 Shift
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate("/admin/machines")}
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm"
              >
                {saving ? "Saving..." : "Create Machine"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

