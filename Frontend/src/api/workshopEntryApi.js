import apiClient from "./authApi.js";

export const getAllWorkshopEntries = () => apiClient.get("/workshop-entries");
export const getAllWorkshopRmIssues = () => apiClient.get("/workshop-entries/all-rm-issues");
export const getWorkshopEntryDetails = (id) => apiClient.get(`/workshop-entries/${id}`);
export const getAvailableBatches = (materialId) => apiClient.get("/workshop-entries/stock-batches", { params: { material_id: materialId } });
export const issueWorkshopRm = (data) => apiClient.post("/workshop-entries/rm-issue", data);
export const addProductionLog = (data) => apiClient.post("/workshop-entries/production-log", data);
export const revertProductionLog = (data) => apiClient.post("/workshop-entries/production-revert", data);
export const deleteProductionLog = (id) => apiClient.delete(`/workshop-entries/production-log/${id}`);

