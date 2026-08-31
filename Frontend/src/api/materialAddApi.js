import apiClient from "./authApi.js";

export const createMaterialAdd = (data) => apiClient.post("/material-add/add", data);
export const getAllMaterialAdds = () => apiClient.get("/material-add/all");
export const getMaterialAddById = (id) => apiClient.get(`/material-add/${id}`);
export const updateMaterialAdd = (id, data) => apiClient.put(`/material-add/update/${id}`, data);
export const deleteMaterialAdd = (id) => apiClient.delete(`/material-add/delete/${id}`);

export const getNextBatchNumber = (materialId) =>
    apiClient.get(`/material-add/preview-batch-number?materialId=${materialId}`);

export const getMaterialTypes = () => apiClient.get("/material-add/material-types");

export const getMaterialsByType = (type) =>
    apiClient.get(`/material-add/materials-by-type?type=${encodeURIComponent(type)}`);
