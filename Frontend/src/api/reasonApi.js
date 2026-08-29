import apiClient from './authApi';

export const createReason = (data) => apiClient.post("/reasons", data);
export const getAllReasons = (includeInactive = false) => apiClient.get(`/reasons?includeInactive=${includeInactive}`);
export const getReasonById = (id) => apiClient.get(`/reasons/${id}`);
export const updateReason = (id, data) => apiClient.put(`/reasons/${id}`, data);
export const deleteReason = (id) => apiClient.delete(`/reasons/${id}`);
export const toggleReasonActive = (id, active) => apiClient.patch(`/reasons/toggle/${id}`, { active });
