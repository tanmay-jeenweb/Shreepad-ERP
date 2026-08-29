import apiClient from './authApi';

export const getAllDocuments = async () => {
    return await apiClient.get("/document-masters/");
};

export const createDocument = async (documentData) => {
    return await apiClient.post("/document-masters/", documentData);
};

export const updateDocument = async (id, documentData) => {
    return await apiClient.put(`/document-masters/${id}`, documentData);
};

export const deleteDocument = async (id) => {
    return await apiClient.delete(`/document-masters/${id}`);
};
