import apiClient from "./authApi.js";

export const getReasonsForDelay = async () => {
    return apiClient.get("/reasons-for-delay/all");
};

export const getReasonForDelayById = async (id) => {
    return apiClient.get(`/reasons-for-delay/${id}`);
};

export const createReasonForDelay = async (data) => {
    return apiClient.post("/reasons-for-delay/add", data);
};

export const updateReasonForDelay = async (id, data) => {
    return apiClient.put(`/reasons-for-delay/update/${id}`, data);
};

export const deleteReasonForDelay = async (id) => {
    return apiClient.delete(`/reasons-for-delay/delete/${id}`);
};
