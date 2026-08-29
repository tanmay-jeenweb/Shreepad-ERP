const {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    toggleVendorActive,
    deleteVendor
} = require('../models/vendorModel');
const { createAuditLog } = require('../models/auditLogModel');

const MASTER_NAME = 'Vendor Master';

const addVendorController = async (req, res) => {
    try {
        const {
            vendor_code, vendor_name, vendor_status, currency, contact_name,
            contact_phone, contact_email, industry, time_zone, gst_no, state_code,
            bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no,
            documents, contacts, addresses
        } = req.body;

        if (!vendor_code || !vendor_name) {
            return res.status(400).json({ success: false, message: 'Vendor Code and Vendor Name are required' });
        }

        const vendorData = {
            vendor_code, vendor_name, vendor_status, currency, contact_name,
            contact_phone, contact_email, industry, time_zone, gst_no, state_code,
            bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no,
            added_by: req.user?.id || null,
            device_id: req.user?.deviceId || null
        };

        const vendorId = await createVendor(vendorData, documents, contacts, addresses);

        // Audit log
        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'created', null,
                { ...vendorData, id: vendorId, vendor_name }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(201).json({ success: true, message: 'Vendor created successfully', data: { id: vendorId } });
    } catch (error) {
        console.error('Error adding vendor:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Vendor code already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllVendorsController = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const vendors = await getAllVendors(includeInactive);
        res.status(200).json({ success: true, message: 'Vendors retrieved successfully', data: vendors });
    } catch (error) {
        console.error('Error retrieving vendors:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getVendorByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await getVendorById(id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        res.status(200).json({ success: true, message: 'Vendor retrieved successfully', data: vendor });
    } catch (error) {
        console.error('Error retrieving vendor:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateVendorController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            vendor_code, vendor_name, vendor_status, currency, contact_name,
            contact_phone, contact_email, industry, time_zone, gst_no, state_code,
            bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no,
            documents, contacts, addresses
        } = req.body;

        if (!vendor_code || !vendor_name) {
            return res.status(400).json({ success: false, message: 'Vendor Code and Vendor Name are required' });
        }

        const existingVendor = await getVendorById(id);
        if (!existingVendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        const vendorData = {
            vendor_code, vendor_name, vendor_status, currency, contact_name,
            contact_phone, contact_email, industry, time_zone, gst_no, state_code,
            bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no
        };

        await updateVendor(id, vendorData, documents, contacts, addresses);

        // Audit log
        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'updated',
                { vendor_name: existingVendor.vendor_name, vendor_code: existingVendor.vendor_code },
                { ...vendorData, vendor_name }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: 'Vendor updated successfully' });
    } catch (error) {
        console.error('Error updating vendor:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Vendor code already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const toggleVendorActiveController = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        const existingVendor = await getVendorById(id);
        if (!existingVendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        await toggleVendorActive(id, active);

        // Audit log
        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'updated',
                { vendor_name: existingVendor.vendor_name, active: existingVendor.active },
                { vendor_name: existingVendor.vendor_name, active }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: `Vendor ${active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error('Error toggling vendor status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteVendorController = async (req, res) => {
    try {
        const { id } = req.params;
        const existingVendor = await getVendorById(id);
        if (!existingVendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        await deleteVendor(id);

        // Audit log
        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'deleted',
                { vendor_name: existingVendor.vendor_name, vendor_code: existingVendor.vendor_code },
                null
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: 'Vendor deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addVendorController,
    getAllVendorsController,
    getVendorByIdController,
    updateVendorController,
    toggleVendorActiveController,
    deleteVendorController
};
