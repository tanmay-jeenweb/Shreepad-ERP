import apiClient from './authApi';

export const createSubSdReason = (data) => apiClient.post("/sub-sd-reasons", data);
export const getAllSubSdReasons = (includeInactive = false) => apiClient.get(`/sub-sd-reasons?includeInactive=${includeInactive}`);
export const getSubSdReasonById = (id) => apiClient.get(`/sub-sd-reasons/${id}`);
export const updateSubSdReason = (id, data) => apiClient.put(`/sub-sd-reasons/${id}`, data);
export const deleteSubSdReason = (id) => apiClient.delete(`/sub-sd-reasons/${id}`);
export const toggleSubSdReasonActive = (id, active) => apiClient.patch(`/sub-sd-reasons/toggle/${id}`, { active });
