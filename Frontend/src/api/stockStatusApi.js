import apiClient from "./authApi.js";

export const getStockStatus = (type, filters = {}) => apiClient.get('/stock-status', { params: { type, ...filters } });
