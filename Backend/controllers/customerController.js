const {
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    toggleCustomerActive,
    deleteCustomer
} = require('../models/customerModel');
const { createAuditLog } = require('../models/auditLogModel');

const MASTER_NAME = 'Customer Master';

const addCustomerController = async (req, res) => {
    try {
        const {
            customer_code, customer_name, customer_status, currency, contact_name,
            contact_phone, contact_email, industry, time_zone, gst_no, state_code,
            bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no,
            documents, contacts, addresses
        } = req.body;

        if (!customer_code || !customer_name) {
            return res.status(400).json({ success: false, message: 'Customer Code and Customer Name are required' });
        }

        const customerData = {
            customer_code, customer_name, customer_status, currency, contact_name,
            contact_phone, contact_email, industry, time_zone, gst_no, state_code,
            bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no,
            added_by: req.user?.id || null,
            device_id: req.user?.deviceId || null
        };

        const customerId = await createCustomer(customerData, documents, contacts, addresses);

        // Audit log
        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'created', null,
                { ...customerData, id: customerId, customer_name }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(201).json({ success: true, message: 'Customer created successfully', data: { id: customerId } });
    } catch (error) {
        console.error('Error adding customer:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Customer code already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllCustomersController = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const customers = await getAllCustomers(includeInactive);
        res.status(200).json({ success: true, message: 'Customers retrieved successfully', data: customers });
    } catch (error) {
        console.error('Error retrieving customers:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getCustomerByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await getCustomerById(id);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.status(200).json({ success: true, message: 'Customer retrieved successfully', data: customer });
    } catch (error) {
        console.error('Error retrieving customer:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateCustomerController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            customer_code, customer_name, customer_status, currency, contact_name,
            contact_phone, contact_email, industry, time_zone, gst_no, state_code,
            bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no,
            documents, contacts, addresses
        } = req.body;

        if (!customer_code || !customer_name) {
            return res.status(400).json({ success: false, message: 'Customer Code and Customer Name are required' });
        }

        const existingCustomer = await getCustomerById(id);
        if (!existingCustomer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const customerData = {
            customer_code, customer_name, customer_status, currency, contact_name,
            contact_phone, contact_email, industry, time_zone, gst_no, state_code,
            bank_name, bank_account_number, bank_ifsc, cheque_printing_name, pan_no
        };

        await updateCustomer(id, customerData, documents, contacts, addresses);

        // Audit log
        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'updated',
                { customer_name: existingCustomer.customer_name, customer_code: existingCustomer.customer_code },
                { ...customerData, customer_name }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: 'Customer updated successfully' });
    } catch (error) {
        console.error('Error updating customer:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Customer code already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const toggleCustomerActiveController = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        const existingCustomer = await getCustomerById(id);
        if (!existingCustomer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        await toggleCustomerActive(id, active);

        // Audit log
        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'updated',
                { customer_name: existingCustomer.customer_name, active: existingCustomer.active },
                { customer_name: existingCustomer.customer_name, active }
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: `Customer ${active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error('Error toggling customer status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteCustomerController = async (req, res) => {
    try {
        const { id } = req.params;
        const existingCustomer = await getCustomerById(id);
        if (!existingCustomer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        await deleteCustomer(id);

        // Audit log
        try {
            await createAuditLog(
                req.user?.id, req.user?.username, req.user?.deviceId,
                MASTER_NAME, 'deleted',
                { customer_name: existingCustomer.customer_name, customer_code: existingCustomer.customer_code },
                null
            );
        } catch (auditErr) { console.error('Audit log error:', auditErr); }

        res.status(200).json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    addCustomerController,
    getAllCustomersController,
    getCustomerByIdController,
    updateCustomerController,
    toggleCustomerActiveController,
    deleteCustomerController
};
