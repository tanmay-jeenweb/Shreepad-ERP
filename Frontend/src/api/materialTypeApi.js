import apiClient from "./authApi.js";

export const getMaterialTypes = async () => {
    return apiClient.get("/material-types/all");
};

export const createMaterialType = async (data) => {
    return apiClient.post("/material-types/add", data);
};

export const updateMaterialType = async (id, data) => {
    return apiClient.put(`/material-types/update/${id}`, data);
};

export const deleteMaterialType = async (id) => {
    return apiClient.delete(`/material-types/delete/${id}`);
};
