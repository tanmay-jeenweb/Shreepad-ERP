import apiClient from './authApi';

export const getAllVendors = async (includeInactive = false) => {
    return await apiClient.get(`/vendors/all?includeInactive=${includeInactive}`);
};

export const getVendorById = async (id) => {
    return await apiClient.get(`/vendors/${id}`);
};

export const createVendor = async (data) => {
    return await apiClient.post("/vendors/add", data);
};

export const updateVendor = async (id, data) => {
    return await apiClient.put(`/vendors/update/${id}`, data);
};

export const toggleVendorActive = async (id, active) => {
    return await apiClient.patch(`/vendors/toggle/${id}`, { active });
};

export const deleteVendor = async (id) => {
    return await apiClient.delete(`/vendors/delete/${id}`);
};
