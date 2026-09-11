import apiClient from "./authApi.js";

export const getPMemoDetails = (workOrderItemId) => apiClient.get(`/p-memos/work-order-item/${workOrderItemId}`);
export const createPMemo = (data) => apiClient.post("/p-memos/add", data);
export const getAvailableBatches = (materialId) => apiClient.get(`/p-memos/stock-batches`, { params: { material_id: materialId } });
