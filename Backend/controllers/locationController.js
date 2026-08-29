const { createLocation, getAllLocations, updateLocation, deleteLocation, getLocationById, toggleLocationActive } = require("../models/locationModel.js");
const { createAuditLog } = require("../models/auditLogModel.js");

const addLocation = async (req, res) => {
  try {
    const { locationName, address, locationPlantNo, plantTypeId, plantAddress } = req.body;
    const addedBy = req.user.id;
    const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

    if (!locationName || !plantTypeId) {
      return res.status(400).json({ message: "Location name and plant type are required" });
    }

    const result = await createLocation(locationName, address, locationPlantNo, plantTypeId, plantAddress, addedBy, deviceId);
    await createAuditLog(
        addedBy,
        req.user?.name || req.user?.username || 'Unknown',
        deviceId,
        'Location Master',
        'created',
        null,
        {
            id: result.insertId,
            location_name: locationName,
            address,
            location_plant_no: locationPlantNo,
            plant_type_id: plantTypeId,
            plant_address: plantAddress,
            added_by: addedBy,
            device_id: deviceId
        }
    );

    res.status(201).json({
      message: "Location added successfully",
      data: result
    });
  } catch (error) {
    console.error("Error adding location:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Location name already exists" });
    }
    res.status(500).json({ message: "Error adding location" });
  }
};

const getAllLocationsController = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const locations = await getAllLocations(includeInactive);
    res.status(200).json({
      message: "Locations retrieved successfully",
      data: locations
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ message: "Error fetching locations" });
  }
};

const updateLocationController = async (req, res) => {
  try {
    const { id } = req.params;
    const { locationName, address, locationPlantNo, plantTypeId, plantAddress } = req.body;

    if (!locationName || !plantTypeId) {
      return res.status(400).json({ message: "Location name and plant type are required" });
    }

    const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";
    const beforeData = await getLocationById(id);
    if (!beforeData) {
      return res.status(404).json({ message: "Location not found" });
    }

    const result = await updateLocation(id, locationName, address, locationPlantNo, plantTypeId, plantAddress);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Location not found" });
    }

    await createAuditLog(
        req.user?.id,
        req.user?.name || req.user?.username || 'Unknown',
        deviceId,
        'Location Master',
        'updated',
        beforeData,
        {
            ...beforeData,
            location_name: locationName,
            address,
            location_plant_no: locationPlantNo,
            plant_type_id: plantTypeId,
            plant_address: plantAddress
        }
    );

    res.status(200).json({ message: "Location updated successfully" });
  } catch (error) {
    console.error("Error updating location:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Location name already exists" });
    }
    res.status(500).json({ message: "Error updating location" });
  }
};

const deleteLocationController = async (req, res) => {
  try {
    const { id } = req.params;

    const beforeData = await getLocationById(id);
    if (!beforeData) {
      return res.status(404).json({ message: "Location not found" });
    }

    const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";
    const result = await deleteLocation(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Location not found" });
    }

    await createAuditLog(
        req.user?.id,
        req.user?.name || req.user?.username || 'Unknown',
        deviceId,
        'Location Master',
        'deleted',
        beforeData,
        null
    );

    res.status(200).json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({ message: "Error deleting location" });
  }
};

const toggleLocationActiveController = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    if (active === undefined) {
      return res.status(400).json({ message: "Active status is required" });
    }

    const beforeData = await getLocationById(id);
    if (!beforeData) {
      return res.status(404).json({ message: "Location not found" });
    }

    const deviceId = req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";
    const result = await toggleLocationActive(id, active);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Location not found" });
    }

    await createAuditLog(
      req.user?.id,
      req.user?.name || req.user?.username || 'Unknown',
      deviceId,
      'Location Master',
      'updated',
      beforeData,
      { ...beforeData, active }
    );

    res.status(200).json({ message: `Location ${active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error("Error toggling location status:", error);
    res.status(500).json({ message: "Error toggling location status" });
  }
};

module.exports = {
  addLocation,
  getAllLocationsController,
  updateLocationController,
  deleteLocationController,
  toggleLocationActiveController
};
