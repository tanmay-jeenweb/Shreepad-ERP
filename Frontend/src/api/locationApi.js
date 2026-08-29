import apiClient from "./authApi.js";

export const getLocations = async (includeInactive = false) => {
  return apiClient.get(`/locations/all?includeInactive=${includeInactive}`);
};

export const createLocation = async (data) => {
  return apiClient.post("/locations/add", data);
};

export const updateLocation = async (id, data) => {
  return apiClient.put(`/locations/update/${id}`, data);
};

export const deleteLocation = async (id) => {
  return apiClient.delete(`/locations/delete/${id}`);
};

export const toggleLocationActive = async (id, active) => {
  return apiClient.patch(`/locations/toggle/${id}`, { active });
};
