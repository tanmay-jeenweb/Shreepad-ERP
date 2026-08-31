import apiClient from "./authApi.js";

export const getGrns = async () => {
    return apiClient.get("/grns/all");
};

export const getGrnsUnified = async () => {
    return apiClient.get("/grns/unified");
};

export const getGrnById = async (id) => {
    return apiClient.get(`/grns/${id}`);
};

export const createGrn = async (data) => {
    return apiClient.post("/grns/add", data);
};

export const updateGrn = async (id, data) => {
    return apiClient.put(`/grns/update/${id}`, data);
};

export const deleteGrn = async (id) => {
    return apiClient.delete(`/grns/delete/${id}`);
};

export const partiallyCloseGrn = async (id) => {
    return apiClient.put(`/grns/partially-close/${id}`);
};





export const getVendorsForGrn = async () => {
    return apiClient.get("/grns/vendors");
};

export const getNextBatchNumber = async (materialId) => {
    return apiClient.get(`/grns/next-batch-number?material_id=${materialId}`);
};

// Re-export shared PO helpers (same data sources)
export { getMaterialTypes, getMaterialsByType } from "./purchaseOrderApi.js";
