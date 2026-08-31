const {
    createMaterialAdd,
    getAllMaterialAdds,
    getMaterialAddById,
    updateMaterialAdd,
    deleteMaterialAdd,
    previewNextBatchNumber,
    getDistinctMaterialTypes,
    getMaterialsByType,
} = require("../models/materialAddModel.js");

const createMaterialAddHandler = async (req, res) => {
    try {
        const { header, items } = req.body;
        const addedBy = req.user.id;
        const { maId, maNumber } = await createMaterialAdd(header, items, addedBy);
        res.status(201).json({
            success: true,
            message: "Material Add created successfully",
            data: { id: maId, ma_number: maNumber }
        });
    } catch (error) {
        console.error("Create Material Add Error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create Material Add" });
    }
};

const getAllMaterialAddsHandler = async (req, res) => {
    try {
        const mas = await getAllMaterialAdds();
        res.status(200).json({ success: true, data: mas });
    } catch (error) {
        console.error("Get All Material Adds Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch Material Adds" });
    }
};

const getMaterialAddByIdHandler = async (req, res) => {
    try {
        const maId = req.params.id;
        const ma = await getMaterialAddById(maId);
        if (!ma) {
            return res.status(404).json({ success: false, message: "Material Add not found" });
        }
        res.status(200).json({ success: true, data: ma });
    } catch (error) {
        console.error("Get Material Add By ID Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch Material Add" });
    }
};

const updateMaterialAddHandler = async (req, res) => {
    try {
        const maId = req.params.id;
        const ma = await getMaterialAddById(maId);
        if (!ma) return res.status(404).json({ success: false, message: "Material Add not found" });

        const { header, items } = req.body;
        await updateMaterialAdd(maId, header, items);
        res.status(200).json({ success: true, message: "Material Add updated successfully" });
    } catch (error) {
        console.error("Update Material Add Error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update Material Add" });
    }
};

const deleteMaterialAddHandler = async (req, res) => {
    try {
        const maId = req.params.id;
        const ma = await getMaterialAddById(maId);
        if (!ma) return res.status(404).json({ success: false, message: "Material Add not found" });

        await deleteMaterialAdd(maId);
        res.status(200).json({ success: true, message: "Material Add deleted successfully" });
    } catch (error) {
        console.error("Delete Material Add Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete Material Add" });
    }
};

const previewBatchNumberHandler = async (req, res) => {
    try {
        const { materialId } = req.query;
        if (!materialId) {
            return res.status(400).json({ success: false, message: "materialId query param is required" });
        }
        const batchNumber = await previewNextBatchNumber(materialId);
        return res.json({ success: true, data: batchNumber });
    } catch (err) {
        console.error("previewBatchNumberHandler error:", err);
        return res.status(500).json({ success: false, message: "Failed to preview batch number" });
    }
};

const getMaterialTypesHandler = async (req, res) => {
    try {
        const types = await getDistinctMaterialTypes();
        return res.json({ success: true, data: types });
    } catch (err) {
        console.error("getMaterialTypesHandler error:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch material types" });
    }
};

const getMaterialsByTypeHandler = async (req, res) => {
    try {
        const { type } = req.query;
        if (!type) {
            return res.status(400).json({ success: false, message: "type query param is required" });
        }
        const materials = await getMaterialsByType(type);
        return res.json({ success: true, data: materials });
    } catch (err) {
        console.error("getMaterialsByTypeHandler error:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch materials by type" });
    }
};

module.exports = {
    createMaterialAddHandler,
    getAllMaterialAddsHandler,
    getMaterialAddByIdHandler,
    updateMaterialAddHandler,
    deleteMaterialAddHandler,
    previewBatchNumberHandler,
    getMaterialTypesHandler,
    getMaterialsByTypeHandler,
};
