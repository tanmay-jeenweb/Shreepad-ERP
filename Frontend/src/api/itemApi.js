import apiClient from "./authApi.js";

export const getItems = async () => {
    return apiClient.get("/items/all");
};

export const createItem = async (data) => {
    return apiClient.post("/items/add", data);
};

export const updateItem = async (id, data) => {
    return apiClient.put(`/items/update/${id}`, data);
};

export const deleteItem = async (id) => {
    return apiClient.delete(`/items/delete/${id}`);
};
