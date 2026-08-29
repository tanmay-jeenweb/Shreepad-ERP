import apiClient from "./authApi.js";

export const createRmReturn = (data) => apiClient.post("/rm-returns/add", data);
export const getAllRmReturns = () => apiClient.get("/rm-returns/all");
