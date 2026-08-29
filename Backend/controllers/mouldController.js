const {
    createMould,
    getAllMoulds,
    getMouldById,
    getMouldFile,
    updateMould,
    toggleMouldActive,
    deleteMould
} = require("../models/mouldModel.js");
const { createAuditLog } = require("../models/auditLogModel.js");

const parseMachineIds = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
    if (typeof raw === 'string') {
        if (raw.trim() === '') return [];
        return raw.split(',').map(Number).filter(Boolean);
    }
    return [];
};

const addMould = async (req, res) => {
    try {
        const {
            mouldName, cavity, stdCycleTime, cycleTimeBandSec,
            stdProductionPerHour, cycleTimeTolerance, machineIds, isActive, maintenance
        } = req.body;

        if (!mouldName) {
            return res.status(400).json({ success: false, message: "Mould name is required" });
        }

        const addedBy = req.user?.id || null;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;
        const machineIdsArr = parseMachineIds(machineIds);

        const fileBuffer = req.file ? req.file.buffer : null;
        const fileName = req.file ? req.file.originalname : null;
        const fileMime = req.file ? req.file.mimetype : null;

        const result = await createMould(
            {
                mouldName,
                cavity: cavity || null,
                stdCycleTime: stdCycleTime || null,
                cycleTimeBandSec: cycleTimeBandSec || null,
                stdProductionPerHour: stdProductionPerHour || null,
                cycleTimeTolerance: cycleTimeTolerance || null,
                isActive: isActive !== 'false' && isActive !== false,
                maintenance: maintenance === 'true' || maintenance === true,
                addedBy,
                deviceId
            },
            machineIdsArr,
            fileBuffer, fileName, fileMime
        );

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Mould Master',
            'created',
            null,
            {
                id: result.insertId,
                mould_name: mouldName,
                cavity,
                std_cycle_time: stdCycleTime,
                machine_ids: machineIdsArr,
                file_name: fileName
            }
        );

        return res.status(201).json({ success: true, message: "Mould created", data: result });
    } catch (error) {
        console.error("Add Mould Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getAllMouldsController = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const moulds = await getAllMoulds(includeInactive);
        return res.status(200).json({ success: true, data: moulds });
    } catch (error) {
        console.error("Get Moulds Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getMouldByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const mould = await getMouldById(id);
        if (!mould) return res.status(404).json({ success: false, message: "Mould not found" });
        return res.status(200).json({ success: true, data: mould });
    } catch (error) {
        console.error("Get Mould Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const updateMouldController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            mouldName, cavity, stdCycleTime, cycleTimeBandSec,
            stdProductionPerHour, cycleTimeTolerance, machineIds, isActive, maintenance
        } = req.body;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;
        const beforeData = await getMouldById(id);
        if (!beforeData) return res.status(404).json({ success: false, message: "Mould not found" });

        const machineIdsArr = parseMachineIds(machineIds);
        const fileBuffer = req.file ? req.file.buffer : null;
        const fileName = req.file ? req.file.originalname : null;
        const fileMime = req.file ? req.file.mimetype : null;

        const isActiveVal = isActive === 'true' || isActive === true;

        await updateMould(
            id,
            {
                mouldName,
                cavity: cavity || null,
                stdCycleTime: stdCycleTime || null,
                cycleTimeBandSec: cycleTimeBandSec || null,
                stdProductionPerHour: stdProductionPerHour || null,
                cycleTimeTolerance: cycleTimeTolerance || null,
                isActive: isActiveVal,
                maintenance: maintenance === 'true' || maintenance === true
            },
            machineIdsArr,
            fileBuffer, fileName, fileMime
        );

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Mould Master',
            'updated',
            beforeData,
            { mould_name: mouldName, cavity, std_cycle_time: stdCycleTime, machine_ids: machineIdsArr }
        );

        return res.status(200).json({ success: true, message: "Mould updated" });
    } catch (error) {
        console.error("Update Mould Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const toggleMouldActiveController = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;

        const beforeData = await getMouldById(id);
        if (!beforeData) return res.status(404).json({ success: false, message: "Mould not found" });

        await toggleMouldActive(id, isActive);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Mould Master',
            isActive ? 'activated' : 'deactivated',
            beforeData,
            { ...beforeData, is_active: isActive }
        );

        return res.status(200).json({ success: true, message: `Mould ${isActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error("Toggle Mould Active Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const downloadMouldFileController = async (req, res) => {
    try {
        const { id } = req.params;
        const fileRecord = await getMouldFile(id);
        if (!fileRecord || !fileRecord.file_data) {
            return res.status(404).json({ success: false, message: "No file attached to this mould" });
        }
        res.setHeader('Content-Type', fileRecord.file_mime || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.file_name || 'mould-file')}"`);
        res.send(fileRecord.file_data);
    } catch (error) {
        console.error("Download Mould File Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const deleteMouldController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;
        const beforeData = await getMouldById(id);
        if (!beforeData) return res.status(404).json({ success: false, message: "Mould not found" });

        await deleteMould(id);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Mould Master',
            'deleted',
            beforeData,
            null
        );

        return res.status(200).json({ success: true, message: "Mould deleted" });
    } catch (error) {
        console.error("Delete Mould Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    addMould,
    getAllMouldsController,
    getMouldByIdController,
    updateMouldController,
    toggleMouldActiveController,
    downloadMouldFileController,
    deleteMouldController
};
