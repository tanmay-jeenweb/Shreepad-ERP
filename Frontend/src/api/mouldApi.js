import apiClient from "./authApi";

export const getAllMoulds = async (includeInactive = false) => {
    return apiClient.get(`/moulds/all${includeInactive ? '?includeInactive=true' : ''}`);
};

export const getMouldById = async (id) => {
    return apiClient.get(`/moulds/${id}`);
};

export const createMould = async (formData) => {
    return apiClient.post("/moulds/add", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const updateMould = async (id, formData) => {
    return apiClient.put(`/moulds/update/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const toggleMouldActive = async (id, isActive) => {
    return apiClient.patch(`/moulds/${id}/toggle-active`, { isActive });
};

export const deleteMould = async (id) => {
    return apiClient.delete(`/moulds/delete/${id}`);
};

export const downloadMouldFile = async (id, fileName) => {
    const response = await apiClient.get(`/moulds/${id}/file`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'mould-file');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export default apiClient;
