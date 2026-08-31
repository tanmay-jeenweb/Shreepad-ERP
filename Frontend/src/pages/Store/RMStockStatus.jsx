import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { getStockStatus } from "../../api/stockStatusApi";
import { getAllVendors } from "../../api/vendorApi";
import { getLocations } from "../../api/locationApi";
import { getRawMaterials } from "../../api/rawMaterialApi";
import { useSearchParams } from "react-router-dom";

export default function RMStockStatus() {
    const [searchParams] = useSearchParams();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [vendors, setVendors] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [rmGradesList, setRmGradesList] = useState([]);
    const [locations, setLocations] = useState([]);
    const [filters, setFilters] = useState({
        vendor_id: searchParams.get("vendor_id") || "",
        material_id: searchParams.get("material_id") || "",
        rm_grade: "",
        location_id: ""
    });

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await getStockStatus("rm", filters);
            setRecords(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch stock status records:", error);
            toast.error("Failed to load stock status records");
        } finally {
            setLoading(false);
        }
    };

    const loadFilterOptions = async () => {
        try {
            const [vendorsRes, rawMaterialsRes, locationsRes] = await Promise.all([
                getAllVendors(),
                getRawMaterials(),
                getLocations()
            ]);
            setVendors(vendorsRes.data?.data || []);
            
            // Extract unique materials from raw_materials
            const allRMs = rawMaterialsRes.data?.data || [];
            const uniqueMats = [];
            const seenMatIds = new Set();
            const uniqueGrades = [];
            const seenGrades = new Set();

            allRMs.forEach(rm => {
                if (rm.material_id && !seenMatIds.has(rm.material_id)) {
                    seenMatIds.add(rm.material_id);
                    uniqueMats.push({ id: rm.material_id, material_name: rm.material_name });
                }
                if (rm.grade && !seenGrades.has(rm.grade)) {
                    seenGrades.add(rm.grade);
                    uniqueGrades.push(rm.grade);
                }
            });

            // Store unique materials in the materials state, and unique grades in a new state
            setMaterials(uniqueMats);
            // We can attach uniqueGrades to the window or create a new state, let's just add it to a state
            setRmGradesList(uniqueGrades);

            setLocations(locationsRes.data?.data || []);
        } catch (error) {
            console.error("Failed to load filter options:", error);
            toast.error("Failed to load filter options");
        }
    };

    useEffect(() => {
        loadFilterOptions();
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [filters]);

    const columns = useMemo(() => [
        {
            key: "material_name",
            label: "Material Name",
            minWidth: "150px",
            render: (row) => <span className="font-semibold text-slate-700">{row.material_name || "—"}</span>,
        },

        {
            key: "location",
            label: "Location",
            minWidth: "150px",
            render: (row) => (
                <span className="text-slate-700 font-medium">{row.location || "—"}</span>
            ),
        },
        {
            key: "party",
            label: "Vendor/Supplier",
            minWidth: "180px",
            render: (row) => (
                <span className="font-semibold text-slate-800">{row.party || "—"}</span>
            ),
        },

        {
            key: "supplier_batch_number",
            label: "Supplier No.",
            minWidth: "160px",
            render: (row) => (
                <span className="text-slate-600 font-medium">
                    {row.supplier_batch_number || "—"}
                </span>
            ),
        },
        {
            key: "internal_batch_number",
            label: "Internal No.",
            minWidth: "160px",
            render: (row) => (
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded border border-blue-100">
                    {row.internal_batch_number || "—"}
                </span>
            ),
        },
        {
            key: "mfi",
            label: "MFI",
            minWidth: "80px",
            render: (row) => (
                <span className="text-slate-500">{row.mfi || "—"}</span>
            ),
        },
        {
            key: "number_of_bags",
            label: "Bags",
            minWidth: "180px",
            render: (row) => {
                const n = parseInt(row.number_of_bags || 0);
                const k = parseFloat(row.kgs_per_bag || 0);
                if (n === 0 && k === 0) return <span className="text-slate-400 italic">—</span>;
                return (
                    <span className="font-semibold text-slate-800 font-mono">
                        {n}
                        {k > 0 && (
                            <span className="text-slate-400 font-normal">
                                {" "}({k} kgs/bag)
                            </span>
                        )}
                    </span>
                );
            },
        },
        {
            key: "remaining_kg",
            label: "Remaining",
            minWidth: "130px",
            render: (row) => {
                const val = parseFloat(row.remaining_kg || 0);
                return (
                    <span className={`font-bold px-2 py-0.5 rounded-md text-sm ${val > 0 ? "text-amber-700 bg-amber-50 border border-amber-200" : "text-slate-500 bg-slate-100 border border-slate-200"}`}>
                        {val % 1 === 0 ? val : val.toFixed(4)} kg
                    </span>
                );
            },
        },
        {
            key: "total_kg",
            label: "Total",
            minWidth: "120px",
            render: (row) => {
                const val = parseFloat(row.total_kg || 0);
                return (
                    <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-sm">
                        {val % 1 === 0 ? val : val.toFixed(4)} kg
                    </span>
                );
            },
        },
    ], []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="RM Stock Status" />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 mx-auto w-full">
                {/* Filters Section */}
                <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-slate-200">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-sm">
                        <i className="fa-solid fa-filter text-indigo-600"></i>
                        Filter Stock Records
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                        {/* Vendor Filter */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor</label>
                            <select
                                value={filters.vendor_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, vendor_id: e.target.value }))}
                                className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                            >
                                <option value="">All Vendors</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.vendor_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Material Filter */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Material</label>
                            <select
                                value={filters.material_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, material_id: e.target.value }))}
                                className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                            >
                                <option value="">All Raw Materials</option>
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.material_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Location Filter */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                            <select
                                value={filters.location_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, location_id: e.target.value }))}
                                className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                            >
                                <option value="">All Locations</option>
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>{l.location_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Reset Button */}
                    {(filters.vendor_id || filters.material_id || filters.rm_grade || filters.location_id) && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setFilters({
                                    vendor_id: "",
                                    material_id: "",
                                    rm_grade: "",
                                    location_id: ""
                                })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-rotate-left"></i>
                                Reset Filters
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <DataTable
                        tableId="rm_stock_status_table"
                        title="RM Stock Status"
                        data={records}
                        columns={columns}
                        loading={loading}
                        searchPlaceholder="Search party, location, batch number..."
                    />
                </div>
            </main>
        </div>
    );
}
