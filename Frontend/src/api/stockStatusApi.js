import apiClient from "./authApi.js";

export const getStockStatus = (filtersOrType = {}, optionalFilters = {}) => {
    if (typeof filtersOrType === 'string') {
        return apiClient.get('/stock-status', { params: { material_type: filtersOrType, ...optionalFilters } });
    }
    return apiClient.get('/stock-status', { params: filtersOrType });
};
