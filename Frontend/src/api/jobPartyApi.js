import apiClient from "./authApi.js";

export const getJobParties = async () => {
    return apiClient.get("/job-parties/all");
};

export const getJobPartyById = async (id) => {
    return apiClient.get(`/job-parties/${id}`);
};

export const createJobParty = async (data) => {
    return apiClient.post("/job-parties/add", data);
};

export const updateJobParty = async (id, data) => {
    return apiClient.put(`/job-parties/update/${id}`, data);
};

export const deleteJobParty = async (id) => {
    return apiClient.delete(`/job-parties/delete/${id}`);
};
