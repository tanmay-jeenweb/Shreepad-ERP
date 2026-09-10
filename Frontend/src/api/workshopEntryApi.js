import apiClient from "./authApi.js";

export const getAllWorkshopEntries = () => apiClient.get("/workshop-entries");
export const getWorkshopEntryDetails = (id) => apiClient.get(`/workshop-entries/${id}`);
export const saveWorkshopEntry = (data) => apiClient.post("/workshop-entries", data);

// Shifts
export const getWorkshopShifts = (pmemoId) => apiClient.get(`/workshop-entries/${pmemoId}/shifts`);
export const saveWorkshopShift = (pmemoId, data) => apiClient.post(`/workshop-entries/${pmemoId}/shifts`, data);
export const deleteWorkshopShift = (shiftId) => apiClient.delete(`/workshop-entries/shifts/${shiftId}`);

// Shift Hourly Logs
export const saveShiftHourlyLog = (shiftId, data) => apiClient.post(`/workshop-entries/shifts/${shiftId}/logs`, data);
export const deleteShiftHourlyLog = (logId) => apiClient.delete(`/workshop-entries/shift-logs/${logId}`);
