const {
    createDocumentMasterTable, createDocumentMaster, getAllDocumentMasters, updateDocumentMaster, deleteDocumentMaster, getDocumentMasterById
} = require('../models/documentMaster');
const { createAuditLog } = require('../models/auditLogModel.js');

const addDocumentMaster = async (req, res) => {

    try {
        const { documentType, documentName } = req.body;
        const addedBy = req.user.id;
        const deviceId =  req.headers["x-device-id"] || req.headers["device-id"] || "Unknown";

        const documentMaster = await createDocumentMaster(documentType, documentName, addedBy, deviceId);
        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Document Master',
            'created',
            null,
            {
                id: documentMaster.insertId,
                document_type: documentType,
                document_name: documentName,
                added_by: addedBy,
                device_id: deviceId
            }
        );
        res.status(201).json({
            success: true,
            message: 'Document master added successfully',
            data: documentMaster
        });
    } catch (error) {
        console.error('Error adding document master:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllDocumentMastersController = async (req, res) => {
    try {
        const documentMasters = await getAllDocumentMasters();
        res.status(200).json({
            success: true,
            message: 'Document masters retrieved successfully',
            data: documentMasters
        });
    } catch (error) {
        console.error('Error retrieving document masters:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


const updateDocumentMasterController = async (req, res) => {

    try {
        const { id } = req.params;
        const { documentType, documentName } = req.body;

        if (!documentType && !documentName) {
            return res.status(400).json({
                success: false,
                message: 'Document type and name are required'
            });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getDocumentMasterById (id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Document master not found' });
        }

        await updateDocumentMaster(id, documentType, documentName);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Document Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                document_type: documentType,
                document_name: documentName
            }
        );

        res.status(200).json({
            success: true,
            message: 'Document master updated successfully'
        });
    } catch (error) {
        console.error('Error updating document master:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteDocumentMasterController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getDocumentMasterById(id);
        
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Document master not found' });
        }

        await deleteDocumentMaster(id);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Document Master',
            'deleted',
            beforeData,
            null
        );
        res.status(200).json({
            success: true,
            message: 'Document master deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting document master:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }   
};

module.exports = {
    addDocumentMaster,
    getAllDocumentMastersController,
    updateDocumentMasterController,
    deleteDocumentMasterController
};
