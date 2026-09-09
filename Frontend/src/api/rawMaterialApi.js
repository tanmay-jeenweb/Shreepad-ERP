import apiClient from "./authApi.js";

export const getRawMaterials = async () => {
    try {
        const res = await apiClient.get('/materials/all?includeInactive=false');
        const list = res.data?.data || [];
        const rawMaterials = list
            .filter(m => !m.material_type || m.material_type.toLowerCase().includes('raw') || m.material_type.toLowerCase().includes('semi') || m.prefix === 'RM' || m.prefix === 'SFG')
            .map(m => ({
                ...m,
                material_id: m.id,
                material_name: m.material_name,
                material_code: m.material_code
            }));
        const finalData = rawMaterials.length > 0 ? rawMaterials : list.map(m => ({
            ...m,
            material_id: m.id,
            material_name: m.material_name,
            material_code: m.material_code
        }));
        return {
            ...res,
            data: {
                success: true,
                data: finalData
            }
        };
    } catch (err) {
        console.error("Failed to get raw materials:", err);
        return { data: { success: false, data: [] } };
    }
};

export const getRawMaterialById = () => Promise.resolve({ data: {} });
export const createRawMaterial = () => Promise.resolve({ data: {} });
export const updateRawMaterial = () => Promise.resolve({ data: {} });
export const deleteRawMaterial = () => Promise.resolve({ data: {} });
