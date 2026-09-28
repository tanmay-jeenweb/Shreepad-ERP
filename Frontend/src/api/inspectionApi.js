import apiClient from "./authApi.js";

export const getInspections = async () => {
    return apiClient.get("/inspections/all");
};

export const createInspection = async (data) => {
    return apiClient.post("/inspections/add", data);
};

export const updateInspection = async (id, data) => {
    return apiClient.put(`/inspections/update/${id}`, data);
};

export const deleteInspection = async (id) => {
    return apiClient.delete(`/inspections/delete/${id}`);
};
