import apiClient from "./authApi.js";

export const getReasonForDelayTypes = async () => {
    return apiClient.get("/reason-for-delay-types/all");
};

export const createReasonForDelayType = async (data) => {
    return apiClient.post("/reason-for-delay-types/add", data);
};

export const updateReasonForDelayType = async (id, data) => {
    return apiClient.put(`/reason-for-delay-types/update/${id}`, data);
};

export const deleteReasonForDelayType = async (id) => {
    return apiClient.delete(`/reason-for-delay-types/delete/${id}`);
};
