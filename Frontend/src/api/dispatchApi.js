import apiClient from "./authApi.js";

export const getAvailableStockBatches = () => {
    return apiClient.get('/dispatch/available-batches');
};

export const getAllDispatches = (filters = {}) => {
    return apiClient.get('/dispatch', { params: filters });
};

export const createDispatch = (data) => {
    return apiClient.post('/dispatch', data);
};

export const getDispatchById = (id) => {
    return apiClient.get(`/dispatch/${id}`);
};
