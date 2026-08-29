const {
    getPendingSOs,
    getAllApprovalSOs,
    approveSO,
    rejectSO,
    getApprovalLogs
} = require("../models/soApprovalModel.js");

const getAllSOsForApproval = async (req, res) => {
    try {
        const rows = await getAllApprovalSOs();
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("Error fetching all SOs for approval:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const getPendingSOsController = async (req, res) => {
    try {
        const rows = await getPendingSOs();
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("Error fetching pending SOs:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const approveSOController = async (req, res) => {
    try {
        const { id } = req.params;
        const actionBy = req.user.id;
        const actionByName = req.user.name;

        await approveSO(id, actionBy, actionByName);
        res.status(200).json({ success: true, message: "Sales order approved successfully" });
    } catch (error) {
        console.error("Error approving SO:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const rejectSOController = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const actionBy = req.user.id;
        const actionByName = req.user.name;

        if (!reason || reason.trim() === "") {
            return res.status(400).json({ success: false, message: "Rejection reason is required" });
        }

        await rejectSO(id, actionBy, actionByName, reason);
        res.status(200).json({ success: true, message: "Sales order rejected successfully" });
    } catch (error) {
        console.error("Error rejecting SO:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const getApprovalLogsController = async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await getApprovalLogs(id);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("Error fetching approval logs:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    getAllSOsForApproval,
    getPendingSOsController,
    approveSOController,
    rejectSOController,
    getApprovalLogsController
};
