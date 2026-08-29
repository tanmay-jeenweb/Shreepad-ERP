import apiClient from "./authApi.js";

export const getPurchaseOrders = async () => {
    return apiClient.get("/purchase-orders/all");
};

export const getPurchaseOrderById = async (id) => {
    return apiClient.get(`/purchase-orders/${id}`);
};

export const createPurchaseOrder = async (data) => {
    return apiClient.post("/purchase-orders/add", data);
};

export const updatePurchaseOrder = async (id, data) => {
    return apiClient.put(`/purchase-orders/update/${id}`, data);
};

export const revisePurchaseOrder = async (id, data) => {
    return apiClient.post(`/purchase-orders/revise/${id}`, data);
};

export const deletePurchaseOrder = async (id) => {
    return apiClient.delete(`/purchase-orders/delete/${id}`);
};

export const getMaterialTypes = async () => {
    return apiClient.get("/purchase-orders/material-types");
};

export const getMaterialsByType = async (type) => {
    return apiClient.get(`/purchase-orders/materials-by-type?type=${encodeURIComponent(type)}`);
};

export const getVendorsForPO = async () => {
    return apiClient.get("/purchase-orders/vendors");
};

