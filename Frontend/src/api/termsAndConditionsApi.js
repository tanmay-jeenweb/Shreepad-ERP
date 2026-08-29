import apiClient from "./authApi.js";

export const getTermsAndConditions = async () => {
    return apiClient.get("/terms-and-conditions/all");
};

export const getTermsAndConditionsById = async (id) => {
    return apiClient.get(`/terms-and-conditions/${id}`);
};

export const createTermsAndConditions = async (data) => {
    return apiClient.post("/terms-and-conditions/add", data);
};

export const updateTermsAndConditions = async (id, data) => {
    return apiClient.put(`/terms-and-conditions/update/${id}`, data);
};

export const deleteTermsAndConditions = async (id) => {
    return apiClient.delete(`/terms-and-conditions/delete/${id}`);
};
