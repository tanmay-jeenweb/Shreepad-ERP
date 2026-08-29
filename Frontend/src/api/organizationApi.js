import apiClient from "./authApi";

export const getOrganizationDetails = async () => {
    return await apiClient.get('/organizations');
};

export const upsertOrganizationDetails = async (data) => {
    return await apiClient.post('/organizations', data);
};
