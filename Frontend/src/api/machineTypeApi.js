import apiClient from "./authApi.js";

export const getMachineTypes = async () => {
    return apiClient.get("/machinetypes/all");
};

export const createMachineType = async (data) => {
    return apiClient.post("/machinetypes/add", data);
};

export const updateMachineType = async (id, data) => {
    return apiClient.put(`/machinetypes/update/${id}`, data);
};

export const deleteMachineType = async (id) => {
    return apiClient.delete(`/machinetypes/delete/${id}`);
};
