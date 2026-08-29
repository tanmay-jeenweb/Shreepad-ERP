import apiClient from "./authApi.js";

export const getOperatorTypes = async () => {
    return apiClient.get("/operator-types/all");
};

export const createOperatorType = async (data) => {
    return apiClient.post("/operator-types/add", data);
};

export const updateOperatorType = async (id, data) => {
    return apiClient.put(`/operator-types/update/${id}`, data);
};

export const deleteOperatorType = async (id) => {
    return apiClient.delete(`/operator-types/delete/${id}`);
};
