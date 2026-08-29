import apiClient from "./authApi";

export const getAllMachines = async (includeInactive = false) => {
    return apiClient.get(`/machines/all${includeInactive ? '?includeInactive=true' : ''}`);
};

export const getMachineById = async (id) => {
    return apiClient.get(`/machines/${id}`);
};

export const createMachine = async (data) => {
    return apiClient.post("/machines/add", data);
};

export const updateMachine = async (id, data) => {
    return apiClient.put(`/machines/update/${id}`, data);
};

export const toggleMachineActive = async (id, active) => {
    return apiClient.patch(`/machines/${id}/toggle-active`, { active });
};

export const deleteMachine = async (id) => {
    return apiClient.delete(`/machines/delete/${id}`);
};

export default apiClient;
