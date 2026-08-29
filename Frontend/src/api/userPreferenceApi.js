import apiClient from "./authApi.js";

export const getTablePreference = async (tableId) => {
    return apiClient.get(`/table-preferences/${tableId}`);
};

export const saveTablePreference = async (tableId, columnOrder) => {
    return apiClient.post(`/table-preferences/${tableId}`, { columnOrder });
};
