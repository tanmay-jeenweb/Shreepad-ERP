import apiClient from "./authApi.js";

export const getStockBook = (filters = {}) => apiClient.get('/stock-book', { params: filters });
export const issueStock = (data) => apiClient.post('/stock-book/issue', data);
export const getStockIssueLogs = (materialId) => apiClient.get(`/stock-book/issues/${materialId}`);
export const getActiveBatches = () => apiClient.get('/stock-book/active-batches');
export const removeMaterialStock = (data) => apiClient.post('/stock-book/remove-material', data);
