const {
    createMachine,
    getAllMachines,
    getMachineById,
    updateMachine,
    toggleMachineActive,
    deleteMachine
} = require("../models/machineModel.js");
const { createAuditLog } = require("../models/auditLogModel.js");

const addMachine = async (req, res) => {
    try {
        const {
            machineNumber,
            name,
            machineTypeId,
            capacity,
            locationId,
            companyName,
            outgoingJobWork,
            machineShift,
            maintenance,
            active
        } = req.body;

        if (!machineNumber || !name) {
            return res.status(400).json({ success: false, message: "Machine number and name are required" });
        }

        const addedBy = req.user?.id || null;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;

        const result = await createMachine(
            machineNumber,
            name,
            machineTypeId || null,
            capacity || null,
            locationId || null,
            companyName || null,
            !!outgoingJobWork,
            machineShift || null,
            maintenance !== undefined ? maintenance : false,
            addedBy,
            deviceId,
            active !== undefined ? active : true
        );

        await createAuditLog(
            addedBy,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Machine Master',
            'created',
            null,
            {
                id: result.insertId,
                machine_number: machineNumber,
                name,
                machine_type_id: machineTypeId || null,
                capacity: capacity || null,
                location_id: locationId || null,
                company_name: companyName || null,
                outgoing_job_work: !!outgoingJobWork,
                machine_shift: machineShift || null,
                maintenance: maintenance !== undefined ? maintenance : false,
                added_by: addedBy,
                device_id: deviceId
            }
        );

        return res.status(201).json({ success: true, message: "Machine created", data: result });
    } catch (error) {
        console.error("Add Machine Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getAllMachinesController = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const machines = await getAllMachines(includeInactive);
        return res.status(200).json({ success: true, data: machines });
    } catch (error) {
        console.error("Get Machines Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getMachineByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const machine = await getMachineById(id);
        if (!machine) {
            return res.status(404).json({ success: false, message: "Machine not found" });
        }
        return res.status(200).json({ success: true, data: machine });
    } catch (error) {
        console.error("Get Machine By Id Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const updateMachineController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            machineNumber,
            name,
            machineTypeId,
            capacity,
            locationId,
            companyName,
            outgoingJobWork,
            machineShift,
            maintenance,
            active
        } = req.body;

        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;
        const beforeData = await getMachineById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: "Machine not found" });
        }

        await updateMachine(
            id,
            machineNumber,
            name,
            machineTypeId || null,
            capacity || null,
            locationId || null,
            companyName || null,
            !!outgoingJobWork,
            machineShift || null,
            maintenance !== undefined ? maintenance : false,
            active !== undefined ? !!active : true
        );

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Machine Master',
            'updated',
            beforeData,
            {
                ...beforeData,
                machine_number: machineNumber,
                name,
                machine_type_id: machineTypeId || null,
                capacity: capacity || null,
                location_id: locationId || null,
                company_name: companyName || null,
                outgoing_job_work: !!outgoingJobWork,
                machine_shift: machineShift || null,
                maintenance: maintenance !== undefined ? maintenance : false,
                active: active !== undefined ? !!active : true
            }
        );

        return res.status(200).json({ success: true, message: "Machine updated" });
    } catch (error) {
        console.error("Update Machine Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const toggleMachineActiveController = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;

        const beforeData = await getMachineById(id);
        if (!beforeData) return res.status(404).json({ success: false, message: "Machine not found" });

        await toggleMachineActive(id, active);

        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Machine Master',
            active ? 'activated' : 'deactivated',
            beforeData,
            { ...beforeData, active: active }
        );

        return res.status(200).json({ success: true, message: `Machine ${active ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error("Toggle Machine Active Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const deleteMachineController = async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = req.headers['x-device-id'] || req.headers['device-id'] || null;
        const beforeData = await getMachineById(id);
        if (!beforeData) {
            return res.status(404).json({ success: false, message: "Machine not found" });
        }

        await deleteMachine(id);
        await createAuditLog(
            req.user?.id,
            req.user?.name || req.user?.username || 'Unknown',
            deviceId,
            'Machine Master',
            'deleted',
            beforeData,
            null
        );

        return res.status(200).json({ success: true, message: "Machine deleted" });
    } catch (error) {
        console.error("Delete Machine Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    addMachine,
    getAllMachinesController,
    getMachineByIdController,
    updateMachineController,
    toggleMachineActiveController,
    deleteMachineController
};
