import apiClient from "./authApi.js";

export const getClasses = async () => {
    return apiClient.get("/classes/all");
};

export const createClass = async (data) => {
    return apiClient.post("/classes/add", data);
};

export const updateClass = async (id, data) => {
    return apiClient.put(`/classes/update/${id}`, data);
};

export const deleteClass = async (id) => {
    return apiClient.delete(`/classes/delete/${id}`);
};
