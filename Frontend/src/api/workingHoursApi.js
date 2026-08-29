import apiClient from "./authApi.js";

export const getWorkingHoursLogs = () => apiClient.get("/working-hours");

export const createWorkingHoursLogs = (data) => apiClient.post("/working-hours/create", data);

export const getWorkingHourById = (id) => apiClient.get(`/working-hours/${id}`);

export const updateWorkingHoursLog = (id, data) => apiClient.put(`/working-hours/${id}`, data);
