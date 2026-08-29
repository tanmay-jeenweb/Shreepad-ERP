import apiClient from "./authApi.js";

export const getJobPartyTypes = async () => {
    return apiClient.get("/job-party-types/all");
};

export const createJobPartyType = async (data) => {
    return apiClient.post("/job-party-types/add", data);
};

export const updateJobPartyType = async (id, data) => {
    return apiClient.put(`/job-party-types/update/${id}`, data);
};

export const deleteJobPartyType = async (id) => {
    return apiClient.delete(`/job-party-types/delete/${id}`);
};
