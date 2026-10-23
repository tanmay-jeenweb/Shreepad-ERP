import apiClient from './authApi';

export const createWorkOrder = async (data) => {
    return await apiClient.post("/work-orders/add", data);
};

export const getAllWorkOrders = async (includeHeld = true) => {
    return await apiClient.get("/work-orders/all", {
        params: { includeHeld }
    });
};

export const getNextWorkOrderNo = async () => {
    return await apiClient.get("/work-orders/next-number");
};

export const getWorkOrderById = async (id) => {
    return await apiClient.get(`/work-orders/${id}`);
};

export const deleteWorkOrder = async (id) => {
    return await apiClient.delete(`/work-orders/delete/${id}`);
};

export const getMaterialStock = async (materialId) => {
    return await apiClient.get(`/work-orders/material-stock/${materialId}`);
};

export const updateWorkOrderItemDelay = async (id, data) => {
    return await apiClient.put(`/work-orders/item/${id}/delay`, data);
};

export const updateWorkOrderItemPriority = async (id, data) => {
    return await apiClient.put(`/work-orders/item/${id}/priority`, data);
};

export const updateWorkOrderItemRemarks = async (id, data) => {
    return await apiClient.put(`/work-orders/item/${id}/remarks`, data);
};

export const updateWorkOrder = async (id, data) => {
    return await apiClient.put(`/work-orders/update/${id}`, data);
};

export const startWorkOrder = async (id) => {
    return await apiClient.put(`/work-orders/start/${id}`);
};

export const holdWorkOrder = async (id, data) => {
    return await apiClient.put(`/work-orders/hold/${id}`, data);
};

export const resumeWorkOrder = async (id) => {
    return await apiClient.put(`/work-orders/resume/${id}`);
};

export const completeWorkOrder = async (id, data) => {
    return await apiClient.put(`/work-orders/complete/${id}`, data);
};

export const stopWorkOrder = completeWorkOrder;

export const reopenWorkOrder = async (id) => {
    return await apiClient.put(`/work-orders/reopen/${id}`);
};

export const restartWorkOrder = reopenWorkOrder;

export const getWorkOrderReports = async () => {
    return await apiClient.get("/work-orders/reports");
};

export const downloadWorkOrderExcel = async (id, termsId = null, customNotes = null) => {
    return await apiClient.get(`/work-orders/${id}/excel`, {
        params: { termsId, customNotes },
        responseType: "blob"
    });
};

