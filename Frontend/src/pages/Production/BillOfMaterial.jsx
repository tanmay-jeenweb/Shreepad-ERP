import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { getBOMs, deleteBOM } from "../../api/bomApi";
import { usePermission } from "../../context/PermissionContext";
import toast from "react-hot-toast";

export default function BillOfMaterial() {
    const formatDateTime = (d) => {
        if (!d) return "-";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "-";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    const canWrite = hasPermission("bom", "write");
    const canUpdate = hasPermission("bom", "update");
    const canDelete = hasPermission("bom", "delete");

    const [boms, setBoms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewData, setViewData] = useState(null);

    const fetchBOMs = async () => {
        try {
            setLoading(true);
            const res = await getBOMs();
            setBoms(res.data?.data || []);
        } catch (err) {
            console.error("Failed to fetch BOMs", err);
            toast.error("Failed to fetch Bill of Materials");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBOMs();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this BOM?")) return;
        try {
            await deleteBOM(id);
            toast.success("BOM deleted successfully");
            fetchBOMs();
        } catch (err) {
            console.error("Failed to delete BOM", err);
            toast.error("Failed to delete BOM");
        }
    };

    const columns = useMemo(() => {
        const cols = [
            {
                label: "Product Name",
                key: "material_name",
                render: (row) => (
                    <div>
                        <p className="font-semibold text-slate-800">{row.material_name}</p>
                        <p className="text-xs text-slate-500">{row.material_type}</p>
                    </div>
                )
            },
            {
                label: "Product Insert",
                key: "product_insert",
            },
            {
                label: "Raw Material",
                key: "raw_material_label",
                render: (row) => {
                    const label = row.raw_material_label;
                    return label ? (
                        <span className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium border border-violet-100">
                            {label}
                        </span>
                    ) : (
                        <span className="text-slate-400">-</span>
                    );
                }
            },
            {
                label: "Mould",
                key: "mould_name",
                render: (row) => row.mould_name || "-"
            },
            {
                label: "Process",
                key: "process_name",
                render: (row) => row.process_name || "-"
            },
            {
                label: "Price",
                key: "price",
                render: (row) => {
                    const val = row.price;
                    return val ? `₹${Number(val).toFixed(2)}` : "-";
                }
            }
        ];

        if (canUpdate || canDelete) {
            cols.push({
                label: "Actions",
                key: "actions",
                render: (row) => {
                    const hasBom = !!row.id;
                    return (
                        <div className="flex gap-2 items-center">
                            {hasBom && (
                                <button
                                    onClick={() => setViewData(row)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 cursor-pointer"
                                    title="View Details"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            )}
                            {canUpdate && (
                                <button
                                    onClick={() => navigate(`/production/bom/edit?material_id=${row.material_id}`)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border cursor-pointer ${hasBom ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                                    title={hasBom ? "Edit BOM" : "Configure BOM"}
                                >
                                    {hasBom ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            )}
                            {canDelete && hasBom && (
                                <button
                                    onClick={() => handleDelete(row.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                                    title="Delete BOM"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    );
                }
            });
        }

        return cols;
    }, [canUpdate, canDelete, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            
            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <DataTable 
                        title="Bill of Material"
                        tableId="bom_master_table"
                        data={boms} 
                        columns={columns} 
                        searchPlaceholder="Search materials..."
                    />
                )}
            </div>

            {/* View Modal */}
            {viewData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Bill of Material Details</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{viewData.material_name} {viewData.material_code ? `(${viewData.material_code})` : ''}</p>
                            </div>
                            <button
                                onClick={() => setViewData(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-8">
                            <div>
                                <h3 className="text-sm font-bold text-indigo-600 mb-4 border-b border-indigo-100 pb-2 uppercase tracking-wider">Primary Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Name</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.material_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Type</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.material_type}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Insert</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.product_insert || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raw Material</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.raw_material_label || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Counting Type</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.product_counting_type || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-teal-600 mb-4 border-b border-teal-100 pb-2 uppercase tracking-wider">Production Settings</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Compatible Mould</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.mould_name || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Process</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.process_name || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Color</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.color || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Packing Method</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.packing_method || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-amber-600 mb-4 border-b border-amber-100 pb-2 uppercase tracking-wider">Measurements & Valuation</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Weight</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.product_weight || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit Wt. Tolerance [+/-]</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.unit_weight_tolerance || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RM Formulation</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.rm_formulation || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Wt. For Sale</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.product_weight_for_sale || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Difference</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.difference || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</p>
                                        <p className="text-sm font-medium text-slate-800">{viewData.price ? `₹${Number(viewData.price).toFixed(2)}` : "-"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                <span>Configured By: <span className="font-medium text-slate-600">{viewData.added_by_name || "-"}</span></span>
                                <span>Configured On: <span className="font-medium text-slate-600">{viewData.created_at ? formatDateTime(viewData.created_at) : "-"}</span></span>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setViewData(null)}
                                className="px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
