import apiClient from "./authApi.js";

export const getMaterialGroups = async () => {
    return apiClient.get("/material-groups/all");
};

export const createMaterialGroup = async (data) => {
    return apiClient.post("/material-groups/add", data);
};

export const updateMaterialGroup = async (id, data) => {
    return apiClient.put(`/material-groups/update/${id}`, data);
};

export const deleteMaterialGroup = async (id) => {
    return apiClient.delete(`/material-groups/delete/${id}`);
};

// Backwards-compatible aliases
export const getMaterialTypes = getMaterialGroups;
export const createMaterialType = createMaterialGroup;
export const updateMaterialType = updateMaterialGroup;
export const deleteMaterialType = deleteMaterialGroup;
