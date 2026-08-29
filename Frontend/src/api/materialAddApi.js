import apiClient from "./authApi.js";

export const createMaterialAdd = (data) => apiClient.post("/material-add/add", data);
export const getAllMaterialAdds = () => apiClient.get("/material-add/all");
export const getMaterialAddById = (id) => apiClient.get(`/material-add/${id}`);
export const updateMaterialAdd = (id, data) => apiClient.put(`/material-add/update/${id}`, data);
export const deleteMaterialAdd = (id) => apiClient.delete(`/material-add/delete/${id}`);
