import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar";
import { createLocation } from "../../../api/locationApi.js";
import { getLocationTypes } from "../../../api/locationTypeApi.js";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateLocation() {
  const [locationTypes, setLocationTypes] = useState([]);
  const [newLocation, setNewLocation] = useState({
    locationName: "",
    address: "",
    locationPlantNo: "",
    plantTypeId: "",
    plantAddress: ""
  });
  const [saving, setSaving] = useState(false);
  // const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadLocationTypes = async () => {
    try {
      const response = await getLocationTypes();
      setLocationTypes(response.data.data || []);
    } catch (err) {
      console.error("Failed to load location types", err);
    }
  };

  useEffect(() => {
    loadLocationTypes();
  }, []);

  const handleAddLocation = async (event) => {
    event.preventDefault();
    if (!newLocation.locationName.trim() || !newLocation.plantTypeId) {
      setError("Location name and plant type are required.");
      return;
    }

    setSaving(true);
    setError("");
    // setMessage("");

    try {
      await createLocation(newLocation);
      toast.success(`Location '${newLocation.locationName.trim()}' added successfully.`);
      setNewLocation({
        locationName: "",
        address: "",
        locationPlantNo: "",
        plantTypeId: "",
        plantAddress: ""
      });
      setTimeout(() => {
        navigate("/admin/locations");
      }, 1000);
    } catch (err) {
      console.error("Failed to add location", err);
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || "Unable to add location. Please try again.");
      // setError(serverMessage || "Unable to add location. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className=" mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create Location</h1>
            <p className="text-slate-500 mt-1">Add a new location to the system.</p>
          </div>
          <button
            onClick={() => navigate("/admin/locations")}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Location List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col gap-4 mb-4">
            {/* {message && <div className="text-emerald-600 font-medium text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-200">{message}</div>} */}
            {error && <div className="text-rose-600 font-medium text-sm bg-rose-50 p-3 rounded-lg border border-rose-200">{error}</div>}
          </div>

          <form className="space-y-4" onSubmit={handleAddLocation}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter location name"
                  value={newLocation.locationName}
                  onChange={(e) => setNewLocation({ ...newLocation, locationName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plant Type <span className="text-rose-500">*</span></label>
                <select
                  value={newLocation.plantTypeId}
                  onChange={(e) => setNewLocation({ ...newLocation, plantTypeId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] bg-white transition-colors"
                >
                  <option value="">Select plant type</option>
                  {locationTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.location_type_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location Plant No.</label>
                <input
                  type="text"
                  placeholder="e.g. P-123"
                  value={newLocation.locationPlantNo}
                  onChange={(e) => setNewLocation({ ...newLocation, locationPlantNo: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Full address"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Plant Address</label>
                <input
                  type="text"
                  placeholder="Specific plant address"
                  value={newLocation.plantAddress}
                  onChange={(e) => setNewLocation({ ...newLocation, plantAddress: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors"
                />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm"
              >
                {saving ? "Saving..." : "Create Location"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

