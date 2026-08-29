const {
    createLocationType,
    getAllLocationTypes,
    updateLocationType,
    deleteLocationType,
    getLocationTypeById
} = require('../models/locationTypeModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addLocationType = async (req, res) => {

    try {
        const { locationTypeName } = req.body;
        const addedBy = req.user.id;
        const deviceId =  req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        const locationType = await createLocationType(locationTypeName, addedBy, deviceId);
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Location Type Master',
            'created',
            null,
            {
                id: locationType.insertId,
                location_type_name: locationTypeName,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Location type added successfully',
            data: locationType
        });
    } catch (error) {
        console.error('Error adding location type:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllLocationTypesController = async (req, res) => {

    try {
        const locationTypes = await getAllLocationTypes();

        res.status(200).json({
            success: true,
            message: 'Location types retrieved successfully',
            data: locationTypes
        });
    } catch (error) {
        console.error('Error retrieving location types:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateLocationTypeController = async (req, res) => {

    try {
        const { id } = req.params;
        const { locationTypeName } = req.body;

        if (!locationTypeName) {
            return res.status(400).json({
                success: false,
                message: 'Location type name is required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getLocationTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Location type not found' });
        }

        await updateLocationType(id, locationTypeName);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Location Type Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                location_type_name: locationTypeName
            }
        );

        res.status(200).json({
            success: true,
            message: 'Location type updated successfully'
        });
    } catch (error) {
        console.error('Error updating location type:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteLocationTypeController = async (req, res) => {

    try {
        const { id } = req.params;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getLocationTypeById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Location type not found' });
        }

        await deleteLocationType(id);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Location Type Master',
            'deleted',
            beforeData,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Location type deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting location type:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    addLocationType,
    getAllLocationTypesController,
    updateLocationTypeController,
    deleteLocationTypeController
};
