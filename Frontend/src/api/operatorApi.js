import apiClient from "./authApi.js";

export const getOperators = async (includeInactive = false) => {
    return apiClient.get("/operators/all", {
        params: includeInactive ? { includeInactive: "true" } : {}
    });
};

export const getOperatorById = async (id) => {
    return apiClient.get(`/operators/${id}`);
};

export const createOperator = async (data) => {
    return apiClient.post("/operators/add", data);
};

export const updateOperator = async (id, data) => {
    return apiClient.put(`/operators/update/${id}`, data);
};

export const toggleOperatorActive = async (id, active) => {
    return apiClient.patch(`/operators/toggle/${id}`, { active });
};

export const deleteOperator = async (id) => {
    return apiClient.delete(`/operators/delete/${id}`);
};
