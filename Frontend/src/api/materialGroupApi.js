import apiClient from "./authApi.js";

export const getMaterialGroups = async () => {
    return apiClient.get("/materialgroups/all");
};

export const createMaterialGroup = async (data) => {
    return apiClient.post("/materialgroups/add", data);
};

export const updateMaterialGroup = async (id, data) => {
    return apiClient.put(`/materialgroups/update/${id}`, data);
};

export const deleteMaterialGroup = async (id) => {
    return apiClient.delete(`/materialgroups/delete/${id}`);
};
