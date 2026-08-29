import apiClient from "./authApi.js";

export const getRawMaterials = async () => {
    return apiClient.get("/raw-materials/all");
};

export const getRawMaterialById = async (id) => {
    return apiClient.get(`/raw-materials/${id}`);
};

export const createRawMaterial = async (data) => {
    return apiClient.post("/raw-materials/add", data);
};

export const updateRawMaterial = async (id, data) => {
    return apiClient.put(`/raw-materials/update/${id}`, data);
};

export const deleteRawMaterial = async (id) => {
    return apiClient.delete(`/raw-materials/delete/${id}`);
};
