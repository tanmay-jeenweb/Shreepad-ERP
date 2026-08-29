import apiClient from './authApi.js';

export const createProcess = (data) => {
    return apiClient.post('/process-masters', data);
};

export const getProcesses = () => {
    return apiClient.get('/process-masters');
};

export const updateProcess = (id, data) => {
    return apiClient.put(`/process-masters/${id}`, data);
};

export const deleteProcess = (id) => {
    return apiClient.delete(`/process-masters/${id}`);
};
