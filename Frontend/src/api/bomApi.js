import apiClient from "./authApi.js";

export const getBOMProducts     = () => apiClient.get("/bom/products");
export const getBOMs            = () => apiClient.get("/bom/all");
export const getBOMByMaterialId = (materialId) => apiClient.get(`/bom/by-material/${materialId}`);
export const createBOM          = (data) => apiClient.post("/bom/add", data);
export const updateBOM          = (id, data) => apiClient.put(`/bom/update/${id}`, data);
export const deleteBOM          = (id) => apiClient.delete(`/bom/delete/${id}`);
