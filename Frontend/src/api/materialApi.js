import apiClient from "./authApi.js";

export const getMaterials = async (includeInactive = false) => {
    return apiClient.get(`/materials/all?includeInactive=${includeInactive}`);
};

export const getMaterialById = async (id) => {
    return apiClient.get(`/materials/${id}`);
};

export const createMaterial = async (data) => {
    return apiClient.post("/materials/add", data);
};

export const updateMaterial = async (id, data) => {
    return apiClient.put(`/materials/update/${id}`, data);
};

export const toggleMaterialActive = async (id, active) => {
    return apiClient.patch(`/materials/toggle/${id}`, { active });
};

export const deleteMaterial = async (id) => {
    return apiClient.delete(`/materials/delete/${id}`);
};
