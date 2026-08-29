import apiClient from "./authApi.js";

export const getAllPOsForApproval = () => {
    return apiClient.get("/po-approvals/all");
};

export const getPendingPOs = () => {
    return apiClient.get("/po-approvals/pending");
};

export const approvePO = (id) => {
    return apiClient.post(`/po-approvals/${id}/approve`);
};

export const rejectPO = (id, reason) => {
    return apiClient.post(`/po-approvals/${id}/reject`, { reason });
};

export const getApprovalLogs = (id) => {
    return apiClient.get(`/po-approvals/${id}/logs`);
};
