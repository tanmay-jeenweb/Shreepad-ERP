import apiClient from './authApi';

export const getAllCustomers = async (includeInactive = false) => {
    return await apiClient.get(`/customers/all?includeInactive=${includeInactive}`);
};

export const getCustomerById = async (id) => {
    return await apiClient.get(`/customers/${id}`);
};

export const createCustomer = async (data) => {
    return await apiClient.post("/customers/add", data);
};

export const updateCustomer = async (id, data) => {
    return await apiClient.put(`/customers/update/${id}`, data);
};

export const toggleCustomerActive = async (id, active) => {
    return await apiClient.patch(`/customers/toggle/${id}`, { active });
};

export const deleteCustomer = async (id) => {
    return await apiClient.delete(`/customers/delete/${id}`);
};
