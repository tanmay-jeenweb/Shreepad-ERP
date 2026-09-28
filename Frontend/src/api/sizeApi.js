import apiClient from "./authApi.js";

export const getSizes = async () => {
    return apiClient.get("/sizes/all");
};

export const createSize = async (data) => {
    return apiClient.post("/sizes/add", data);
};

export const updateSize = async (id, data) => {
    return apiClient.put(`/sizes/update/${id}`, data);
};

export const deleteSize = async (id) => {
    return apiClient.delete(`/sizes/delete/${id}`);
};
