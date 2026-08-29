const qcModel = require('../models/qcModel.js');

const getPendingQcGrns = async (req, res) => {
    try {
        const grns = await qcModel.getPendingQcGrns();
        res.json({ success: true, data: grns });
    } catch (error) {
        console.error('Error fetching pending QC GRNs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pending QC GRNs' });
    }
};

const getPendingQcItemsByGrnId = async (req, res) => {
    try {
        const { id } = req.params;
        const items = await qcModel.getPendingQcItemsByGrnId(id);
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('Error fetching pending QC items:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pending QC items' });
    }
};

const getPendingQcMas = async (req, res) => {
    try {
        const mas = await qcModel.getPendingQcMas();
        res.json({ success: true, data: mas });
    } catch (error) {
        console.error('Error fetching pending QC MAs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pending QC MAs' });
    }
};

const getPendingQcItemsByMaId = async (req, res) => {
    try {
        const { id } = req.params;
        const items = await qcModel.getPendingQcItemsByMaId(id);
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('Error fetching pending QC MA items:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pending QC MA items' });
    }
};

const getAllQcDocuments = async (req, res) => {
    try {
        const documents = await qcModel.getAllQcDocuments();
        res.json({ success: true, data: documents });
    } catch (error) {
        console.error('Error fetching QC documents:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch QC documents' });
    }
};

const getAllQcHistoryLogs = async (req, res) => {
    try {
        const logs = await qcModel.getAllQcHistoryLogs();
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error fetching QC history logs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch QC history logs' });
    }
};

const getQcById = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await qcModel.getQcById(id);
        if (!document) {
            return res.status(404).json({ success: false, message: 'QC Document not found' });
        }
        res.json({ success: true, data: document });
    } catch (error) {
        console.error('Error fetching QC document:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch QC document' });
    }
};

const createQcDocument = async (req, res) => {
    try {
        const { headerData, itemsData } = req.body;
        const addedBy = req.user.id;

        if (!headerData || !itemsData || itemsData.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid data provided' });
        }

        const result = await qcModel.createQcDocument(headerData, itemsData, addedBy);
        res.status(201).json({ success: true, message: 'QC Document created successfully', data: result });
    } catch (error) {
        console.error('Error creating QC document:', error);
        res.status(500).json({ success: false, message: 'Failed to create QC document' });
    }
};

module.exports = {
    getPendingQcGrns,
    getPendingQcMas,
    getPendingQcItemsByGrnId,
    getPendingQcItemsByMaId,
    getAllQcDocuments,
    getAllQcHistoryLogs,
    getQcById,
    createQcDocument
};
