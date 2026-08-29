const {
    createRmReturn,
    getAllRmReturns
} = require("../models/rmReturnModel.js");

const createRmReturnHandler = async (req, res) => {
    try {
        const {
            pmemo_id,
            return_date,
            material_id,
            job_party_id,
            grade,
            location_id,
            quantity
        } = req.body;

        if (!job_party_id) {
            return res.status(400).json({
                success: false,
                message: "Job of Party is required for raw material returns."
            });
        }

        const addedBy = req.user.id;
        const result = await createRmReturn({
            pmemo_id,
            return_date,
            material_id,
            job_party_id,
            grade,
            location_id,
            quantity
        }, addedBy);

        res.status(201).json({
            success: true,
            message: "Raw Material Return recorded successfully",
            data: result
        });
    } catch (error) {
        console.error("Create RM Return Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to record Raw Material Return"
        });
    }
};

const getAllRmReturnsHandler = async (req, res) => {
    try {
        const returns = await getAllRmReturns();
        res.status(200).json({
            success: true,
            data: returns
        });
    } catch (error) {
        console.error("Get All RM Returns Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch Raw Material Returns"
        });
    }
};

module.exports = {
    createRmReturnHandler,
    getAllRmReturnsHandler
};
