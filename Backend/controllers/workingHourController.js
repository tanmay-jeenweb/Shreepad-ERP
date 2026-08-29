const workingHourModel = require("../models/workingHourModel.js");
const machineScheduleModel = require("../models/machineScheduleModel.js");
const { getSettings } = require("../models/settingMasterModel.js");
const db = require("../config/db.js");

const getWorkingHours = async (req, res) => {
    try {
        const logs = await workingHourModel.getAllWorkingHours();
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error("Error fetching working hours logs:", error);
        res.status(500).json({ success: false, message: "Failed to fetch working hours logs" });
    }
};

const createWorkingHours = async (req, res) => {
    try {
        const { machineIds, fromDate, toDate, workingHour, noWork } = req.body;
        const addedBy = req.user.id;

        if (!machineIds || !Array.isArray(machineIds) || machineIds.length === 0) {
            return res.status(400).json({ success: false, message: "At least one machine must be selected." });
        }

        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: "From Date and To Date are required." });
        }

        const parsedWorkingHour = noWork ? 0 : parseFloat(workingHour || 0);

        if (isNaN(parsedWorkingHour) || parsedWorkingHour < 0) {
            return res.status(400).json({ success: false, message: "Working hours must be a non-negative number." });
        }

        await workingHourModel.createWorkingHoursLog(
            machineIds,
            fromDate,
            toDate,
            parsedWorkingHour,
            noWork,
            addedBy
        );

        res.status(201).json({ success: true, message: "Working hours logged successfully" });
    } catch (error) {
        console.error("Error logging working hours:", error);
        res.status(500).json({ success: false, message: "Failed to log working hours" });
    }
};

const getWorkingHourById = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await workingHourModel.getWorkingHourById(id);
        if (!log) {
            return res.status(404).json({ success: false, message: "Working hour record not found." });
        }
        res.json({ success: true, data: log });
    } catch (error) {
        console.error("Error fetching working hour log:", error);
        res.status(500).json({ success: false, message: "Failed to fetch working hour log" });
    }
};

const updateWorkingHours = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { fromDate, toDate, workingHour, noWork } = req.body;

        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: "From Date and To Date are required." });
        }

        const parsedWorkingHour = noWork ? 0 : parseFloat(workingHour || 0);

        if (isNaN(parsedWorkingHour) || parsedWorkingHour < 0) {
            return res.status(400).json({ success: false, message: "Working hours must be a non-negative number." });
        }

        // Fetch current working hour record to know machine_id
        const existingRecord = await workingHourModel.getWorkingHourById(id);
        if (!existingRecord) {
            return res.status(404).json({ success: false, message: "Working hour record not found." });
        }

        await connection.beginTransaction();

        // Update the working hour log
        await workingHourModel.updateWorkingHour(id, {
            fromDate,
            toDate,
            workingHour: parsedWorkingHour,
            noWork
        });

        // Determine if reschedule is needed: if change affects today or future
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        
        // If the record's to_date is >= todayStr, it could affect future schedule.
        if (toDate >= todayStr) {
            // Fetch wait_hour from settings
            const settings = await getSettings();
            const waitHour = settings ? parseInt(settings.wait_hour || 0, 10) : 0;

            await machineScheduleModel.rescheduleFromToday(existingRecord.machine_id, connection, waitHour);
        }

        await connection.commit();
        res.json({ success: true, message: "Working hours updated and rescheduled successfully." });
    } catch (error) {
        await connection.rollback();
        console.error("Error updating working hours:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update working hours" });
    } finally {
        connection.release();
    }
};

module.exports = {
    getWorkingHours,
    createWorkingHours,
    getWorkingHourById,
    updateWorkingHours
};
