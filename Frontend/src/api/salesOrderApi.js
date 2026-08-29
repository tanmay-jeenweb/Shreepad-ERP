import apiClient from './authApi';

export const createSalesOrder = async (data) => {
    return await apiClient.post("/sales-orders", data);
};

export const getAllSalesOrders = async () => {
    return await apiClient.get("/sales-orders");
};

export const getSalesOrderById = async (id) => {
    return await apiClient.get(`/sales-orders/${id}`);
};

export const updateSalesOrder = async (id, data) => {
    return await apiClient.put(`/sales-orders/${id}`, data);
};

export const deleteSalesOrder = async (id) => {
    return await apiClient.delete(`/sales-orders/${id}`);
};

export const reviseSalesOrder = async (id, data) => {
    return await apiClient.post(`/sales-orders/revise/${id}`, data);
};
