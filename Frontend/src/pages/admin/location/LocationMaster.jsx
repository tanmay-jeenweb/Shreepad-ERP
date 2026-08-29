import { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { getLocations, updateLocation, deleteLocation, toggleLocationActive } from "../../../api/locationApi.js";
import { getLocationTypes } from "../../../api/locationTypeApi.js";
import toast from "react-hot-toast";
import DataTable from "../../../components/DataTable";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../../context/PermissionContext";

export default function LocationMaster() {
  const [locations, setLocations] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({
    locationName: "",
    address: "",
    locationPlantNo: "",
    plantTypeId: "",
    plantAddress: ""
  });

  const loadLocations = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getLocations(showInactive);
      setLocations(response.data.data || []);
    } catch (err) {
      console.error("Failed to load locations", err);
      setError("Unable to load locations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadLocationTypes = async () => {
    try {
      const response = await getLocationTypes();
      setLocationTypes(response.data.data || []);
    } catch (err) {
      console.error("Failed to load location types", err);
    }
  };

  useEffect(() => {
    loadLocations();
  }, [showInactive]);

  useEffect(() => {
    loadLocationTypes();
  }, []);



  const handleStartEdit = (id, location) => {
    setEditingId(id);
    setEditingData({
      locationName: location.location_name,
      address: location.address || "",
      locationPlantNo: location.location_plant_no || "",
      plantTypeId: location.plant_type_id || "",
      plantAddress: location.plant_address || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({
      locationName: "",
      address: "",
      locationPlantNo: "",
      plantTypeId: "",
      plantAddress: ""
    });
  };

  const handleUpdateLocation = async (id) => {
    if (!editingData.locationName.trim() || !editingData.plantTypeId) {
      setError("Location name and plant type are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateLocation(id, editingData);
      toast.success("Location updated successfully");
      setEditingId(null);
      setEditingData({
        locationName: "",
        address: "",
        locationPlantNo: "",
        plantTypeId: "",
        plantAddress: ""
      });
      await loadLocations();
    } catch (err) {
      console.error("Failed to update location", err);
      setError(err?.response?.data?.message || "Unable to update location.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this location?")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteLocation(id);
      toast.success("Location deleted successfully");
      await loadLocations();
    } catch (err) {
      console.error("Failed to delete location", err);
      setError(err?.response?.data?.message || "Unable to delete location.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    const newState = !currentActive;
    if (!window.confirm(`Are you sure you want to ${newState ? 'activate' : 'deactivate'} this location?`)) return;
    setSaving(true);
    try {
      await toggleLocationActive(id, newState);
      toast.success(`Location ${newState ? 'activated' : 'deactivated'}`);
      await loadLocations();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const { hasPermission } = usePermission();

  const columns = useMemo(() => {
    const cols = [
      { key: 'id', label: 'ID', minWidth: '60px' },
      { 
        key: 'location_name', 
        label: 'Location Name',
        render: (row) => editingId === row.id ? (
          <input
            type="text"
            value={editingData.locationName}
            onChange={(e) => setEditingData({ ...editingData, locationName: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
          />
        ) : (
          <span className="font-semibold text-blue-900">{row.location_name}</span>
        )
      },
      {
        key: 'address',
        label: 'Address',
        render: (row) => editingId === row.id ? (
          <input
            type="text"
            value={editingData.address}
            onChange={(e) => setEditingData({ ...editingData, address: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
          />
        ) : (
          row.address
        )
      },
      {
        key: 'location_plant_no',
        label: 'Plant No.',
        render: (row) => editingId === row.id ? (
          <input
            type="text"
            value={editingData.locationPlantNo}
            onChange={(e) => setEditingData({ ...editingData, locationPlantNo: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
          />
        ) : (
          row.location_plant_no
        )
      },
      {
        key: 'plant_type_name',
        label: 'Plant Type',
        render: (row) => editingId === row.id ? (
          <select
            value={editingData.plantTypeId}
            onChange={(e) => setEditingData({ ...editingData, plantTypeId: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white"
          >
            <option value="">Select type</option>
            {locationTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.location_type_name}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 border border-indigo-100">
            {row.plant_type_name}
          </span>
        )
      },
      {
        key: 'plant_address',
        label: 'Plant Address',
        render: (row) => editingId === row.id ? (
          <input
            type="text"
            value={editingData.plantAddress}
            onChange={(e) => setEditingData({ ...editingData, plantAddress: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
          />
        ) : (
          row.plant_address
        )
      },
      { 
        key: "active", 
        label: "Status", 
        minWidth: "100px",
        render: (row) => {
          const isActive = row.active !== false && row.active !== 0;
          return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          );
        }
      }
      // {
      //   key: 'created_at',
      //   label: 'Added Date',
      //   render: (row) => new Date(row.created_at).toLocaleDateString()
      // },
      // {
      //   key: 'added_by_name',
      //   label: 'Added By',
      //   render: (row) => row.added_by_name || "Unknown"
      // }
    ];

    const canUpdate = hasPermission("location", "update");
    const canDelete = hasPermission("location", "delete");

    if (canUpdate || canDelete) {
      cols.push({
        key: 'actions',
        label: 'Actions',
        sortable: false,
        minWidth: '120px',
        render: (row) => (
          <div className="flex items-center justify-start gap-2">
            {editingId === row.id ? (
              <>
                <button
                  onClick={() => handleUpdateLocation(row.id)}
                  disabled={saving}
                  className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50 font-medium text-xs bg-emerald-50 px-2 py-1 rounded"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="text-slate-600 hover:text-slate-800 disabled:opacity-50 font-medium text-xs bg-slate-100 px-2 py-1 rounded"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {canUpdate && (
                  <button
                    onClick={() => handleStartEdit(row.id, row)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0]"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                )}
                {canUpdate && (
                  <button
                    onClick={() => handleToggleActive(row.id, row.active !== false && row.active !== 0)}
                    disabled={saving}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                      row.active !== false && row.active !== 0
                        ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                    title={row.active !== false && row.active !== 0 ? 'Deactivate' : 'Activate'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                    </svg>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDeleteLocation(row.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        )
      });
    }

    return cols;
  }, [editingId, editingData, locationTypes, saving, hasPermission]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">

        <DataTable 
          tableId="location_master"
          title="Location Master"
          data={locations}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search locations..."
          toggleActions={
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 select-none">
              <div
                onClick={() => setShowInactive(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${showInactive ? 'bg-amber-400' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${showInactive ? 'translate-x-4' : ''}`} />
              </div>
              Show Inactive
            </label>
          }
          actionButton={
            hasPermission("location", "write") && (
              <button
                onClick={() => navigate('/admin/locations/create')}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white transition-all hover:bg-[#2583b4] shadow-sm hover:shadow"
                title="Create Location"
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

