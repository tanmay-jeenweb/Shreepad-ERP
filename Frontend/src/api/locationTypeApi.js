import apiClient from "./authApi.js";

export const getLocationTypes = async () => {
    return apiClient.get("/locationtypes/all");
};

export const createLocationType = async (data) => {
    return apiClient.post("/locationtypes/add", data);
};

export const updateLocationType = async (id, data) => {
    return apiClient.put(`/locationtypes/update/${id}`, data);
};

export const deleteLocationType = async (id) => {
    return apiClient.delete(`/locationtypes/delete/${id}`);
};
