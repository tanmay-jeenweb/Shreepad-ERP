const {
    createMaterial,
    getAllMaterials,
    getMaterialById,
    updateMaterial,
    toggleMaterialActive,
    deleteMaterial
} = require('../models/materialModel.js');
const { createAuditLog } = require('../models/auditLogModel.js');

const addMaterial = async (req, res) => {
    try {
        const {
            materialCode,
            prefix,
            materialName,
            unitId,
            hsnCode,
            materialType,
            gstPercent,
            selfVal,
            purchaseVal,
            unitWeight,
            details,
            remarks,
            mouldIds
        } = req.body;

        const addedBy = req.user.id;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        if (!materialCode || !materialCode.trim()) {
            return res.status(400).json({ success: false, message: 'Material code is required' });
        }
        if (!materialName || !materialName.trim()) {
            return res.status(400).json({ success: false, message: 'Material name is required' });
        }

        const data = {
            materialCode: materialCode.trim(),
            prefix: prefix ? prefix.trim().toUpperCase().slice(0, 10) : null,
            materialName: materialName.trim(),
            unitId: unitId || null,
            hsnCode: hsnCode ? hsnCode.trim() : null,
            materialType: materialType || null,
            gstPercent: gstPercent ? gstPercent.trim() : null,
            selfVal: selfVal !== undefined && selfVal !== null && selfVal !== '' ? Number(selfVal) : null,
            purchaseVal: purchaseVal !== undefined && purchaseVal !== null && purchaseVal !== '' ? Number(purchaseVal) : null,
            unitWeight: unitWeight !== undefined && unitWeight !== null && unitWeight !== '' ? Number(unitWeight) : null,
            details: details ? details.trim() : null,
            remarks: remarks ? remarks.trim() : null
        };

        const material = await createMaterial(data, addedBy, deviceId);

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Material Master',
            'created',
            null,
            {
                id: material.insertId,
                ...data,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        res.status(201).json({
            success: true,
            message: 'Material added successfully',
            data: material
        });
    } catch (error) {
        console.error('Error adding material:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Material code already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllMaterialsController = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const materials = await getAllMaterials(includeInactive);
        res.status(200).json({
            success: true,
            message: 'Materials retrieved successfully',
            data: materials
        });
    } catch (error) {
        console.error('Error retrieving materials:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getMaterialByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const material = await getMaterialById(id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }
        res.status(200).json({ success: true, message: 'Material retrieved successfully', data: material });
    } catch (error) {
        console.error('Error retrieving material:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateMaterialController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            materialCode,
            prefix,
            materialName,
            unitId,
            hsnCode,
            materialType,
            gstPercent,
            selfVal,
            purchaseVal,
            unitWeight,
            details,
            remarks,
            mouldIds
        } = req.body;

        if (!materialCode || !materialCode.trim()) {
            return res.status(400).json({ success: false, message: 'Material code is required' });
        }
        if (!materialName || !materialName.trim()) {
            return res.status(400).json({ success: false, message: 'Material name is required' });
        }

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
        const beforeData = await getMaterialById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        const data = {
            materialCode: materialCode.trim(),
            prefix: prefix !== undefined ? (prefix ? prefix.trim().toUpperCase().slice(0, 10) : null) : (beforeData ? beforeData.prefix : null),
            materialName: materialName.trim(),
            unitId: unitId || null,
            hsnCode: hsnCode ? hsnCode.trim() : null,
            materialType: materialType || null,
            gstPercent: gstPercent ? gstPercent.trim() : null,
            selfVal: selfVal !== undefined && selfVal !== null && selfVal !== '' ? Number(selfVal) : null,
            purchaseVal: purchaseVal !== undefined && purchaseVal !== null && purchaseVal !== '' ? Number(purchaseVal) : null,
            unitWeight: unitWeight !== undefined && unitWeight !== null && unitWeight !== '' ? Number(unitWeight) : null,
            details: details ? details.trim() : null,
            remarks: remarks ? remarks.trim() : null
        };

        await updateMaterial(id, data);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Material Master',
            'updated',
            beforeData,
            { ...beforeData, ...data }
        );

        res.status(200).json({ success: true, message: 'Material updated successfully' });
    } catch (error) {
        console.error('Error updating material:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Material code already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteMaterialController = async (req, res) => {
    try {
        const { id } = req.params;
        const existingMaterial = await getMaterialById(id);
        if (!existingMaterial) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';

        const beforeData = await getMaterialById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        await deleteMaterial(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Material Master',
            'deleted',
            { material_name: existingMaterial.material_name, material_code: existingMaterial.material_code },
            null
        );

        res.status(200).json({ success: true, message: 'Material deleted successfully' });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const toggleMaterialActiveController = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        const existingMaterial = await getMaterialById(id);
        if (!existingMaterial) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        await toggleMaterialActive(id, active);

        // Audit log
        try {
            const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || 'Unknown';
            await createAuditLog(
                req.user?.id,
                req.user?.name || req.user?.username || 'Unknown',
                deviceId,
                'Material Master',
                'updated',
                { material_name: existingMaterial.material_name, active: existingMaterial.active },
                { material_name: existingMaterial.material_name, active }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: `Material ${active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error('Error toggling material status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addMaterial,
    getAllMaterialsController,
    getMaterialByIdController,
    updateMaterialController,
    toggleMaterialActiveController,
    deleteMaterialController
};
