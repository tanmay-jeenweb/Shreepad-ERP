const { getPreference, savePreference } = require("../models/userPreferenceModel.js");

const getPreferenceController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tableId } = req.params;

        if (!tableId) {
            return res.status(400).json({ success: false, message: "Table ID is required" });
        }

        const pref = await getPreference(userId, tableId);
        if (!pref) {
            return res.status(200).json({ success: true, data: null });
        }

        let columnOrder = pref.column_order;
        if (typeof columnOrder === "string") {
            columnOrder = JSON.parse(columnOrder);
        }

        return res.status(200).json({ success: true, data: columnOrder });
    } catch (error) {
        console.error("Error fetching table preference:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const savePreferenceController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tableId } = req.params;
        const { columnOrder } = req.body;

        if (!tableId) {
            return res.status(400).json({ success: false, message: "Table ID is required" });
        }

        if (!Array.isArray(columnOrder)) {
            return res.status(400).json({ success: false, message: "columnOrder must be an array of strings" });
        }

        await savePreference(userId, tableId, columnOrder);
        return res.status(200).json({ success: true, message: "Preference saved successfully" });
    } catch (error) {
        console.error("Error saving table preference:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    getPreferenceController,
    savePreferenceController
};
