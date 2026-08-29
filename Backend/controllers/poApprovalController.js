const {
    getPendingPOs,
    getAllApprovalPOs,
    approvePO,
    rejectPO,
    getApprovalLogs
} = require("../models/poApprovalModel.js");

const getAllPOsForApproval = async (req, res) => {
    try {
        const rows = await getAllApprovalPOs();
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("Error fetching all POs for approval:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const getPendingPOsController = async (req, res) => {
    try {
        const rows = await getPendingPOs();
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("Error fetching pending POs:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const approvePOController = async (req, res) => {
    try {
        const { id } = req.params;
        const actionBy = req.user.id;
        const actionByName = req.user.name;

        await approvePO(id, actionBy, actionByName);
        res.status(200).json({ success: true, message: "Purchase order approved successfully" });
    } catch (error) {
        console.error("Error approving PO:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const rejectPOController = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const actionBy = req.user.id;
        const actionByName = req.user.name;

        if (!reason || reason.trim() === "") {
            return res.status(400).json({ success: false, message: "Rejection reason is required" });
        }

        await rejectPO(id, actionBy, actionByName, reason);
        res.status(200).json({ success: true, message: "Purchase order rejected successfully" });
    } catch (error) {
        console.error("Error rejecting PO:", error);
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
    getAllPOsForApproval,
    getPendingPOsController,
    approvePOController,
    rejectPOController,
    getApprovalLogsController
};
