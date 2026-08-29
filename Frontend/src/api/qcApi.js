import apiClient from "./authApi.js";

export const getPendingQcGrns = () => apiClient.get('/qc/pending');
export const getPendingQcItemsByGrnId = (id) => apiClient.get(`/qc/pending-items/${id}`);
export const getPendingQcMas = () => apiClient.get('/qc/pending-mas');
export const getPendingQcItemsByMaId = (id) => apiClient.get(`/qc/pending-items/ma/${id}`);
export const getAllQcDocuments = () => apiClient.get('/qc/history');
export const getQcById = (id) => apiClient.get(`/qc/${id}`);
export const createQcDocument = (data) => apiClient.post('/qc/create', data);
