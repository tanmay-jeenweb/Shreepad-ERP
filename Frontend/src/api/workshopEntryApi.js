import apiClient from "./authApi.js";

export const getAllWorkshopEntries = () => apiClient.get("/workshop-entries");
export const getWorkshopEntryDetails = (id) => apiClient.get(`/workshop-entries/${id}`);
export const saveWorkshopEntry = (data) => apiClient.post("/workshop-entries", data);
