import apiClient from "./authApi.js";

export const getAllSOsForApproval = () => {
    return apiClient.get("/so-approvals/all");
};

export const getPendingSOs = () => {
    return apiClient.get("/so-approvals/pending");
};

export const approveSO = (id) => {
    return apiClient.post(`/so-approvals/${id}/approve`);
};

export const rejectSO = (id, reason) => {
    return apiClient.post(`/so-approvals/${id}/reject`, { reason });
};

export const getApprovalLogs = (id) => {
    return apiClient.get(`/so-approvals/${id}/logs`);
};
