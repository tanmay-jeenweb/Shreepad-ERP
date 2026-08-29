import apiClient from "./authApi.js";

export const getSettings = async () => {
    return apiClient.get("/settings/get");
};

export const getBatchConfig = async () => {
    return apiClient.get("/settings/batch-config");
};

export const saveSettings = async (data) => {
    return apiClient.post("/settings/save", data);
};
