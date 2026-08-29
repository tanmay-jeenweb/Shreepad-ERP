import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { getStockBook, issueStock, getStockIssueLogs } from "../../api/stockBookApi";
import { getVendorsForGrn, getJobPartiesForGrn } from "../../api/grnApi";
import { getMaterials } from "../../api/materialApi";
import { getLocations } from "../../api/locationApi";
import DateInput from "../../components/DateInput";

export default function StockBook({ type }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [vendors, setVendors] = useState([]);
    const [jobParties, setJobParties] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [locations, setLocations] = useState([]);
    const [filters, setFilters] = useState({
        vendor_id: "",
        job_party_id: "",
        material_id: "",
        location_id: "",
        start_date: "",
        end_date: ""
    });
    const [showFilters, setShowFilters] = useState(false);

    // Modal states
    const [issueModalOpen, setIssueModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [issueQuantity, setIssueQuantity] = useState("");
    const [pMemoNumber, setPMemoNumber] = useState("");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
    const [remarks, setRemarks] = useState("");
    const [submittingIssue, setSubmittingIssue] = useState(false);

    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [issueHistory, setIssueHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchRecords = async () => {
        if (!filters.material_id || !filters.start_date || !filters.end_date) {
            setRecords([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await getStockBook({ ...filters, material_type: type });
            setRecords(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch stock book records:", error);
            toast.error("Failed to load stock book records");
        } finally {
            setLoading(false);
        }
    };

    const loadFilterOptions = async () => {
        try {
            const [vendorsRes, jobPartiesRes, materialsRes, locationsRes] = await Promise.all([
                getVendorsForGrn(),
                getJobPartiesForGrn(),
                getMaterials(),
                getLocations()
            ]);
            setVendors(vendorsRes.data?.data || []);
            setJobParties(jobPartiesRes.data?.data || []);
            
            // Filter materials by type
            const allMaterials = materialsRes.data?.data || [];
            if (type === "rm") {
                setMaterials(allMaterials.filter(m => m.material_type === "Raw Materials"));
            } else if (type === "general") {
                setMaterials(allMaterials.filter(m => m.material_type !== "Raw Materials"));
            } else {
                setMaterials(allMaterials);
            }
            
            setLocations(locationsRes.data?.data || []);
        } catch (error) {
            console.error("Failed to load filter options:", error);
            toast.error("Failed to load filter options");
        }
    };

    useEffect(() => {
        setFilters({
            vendor_id: "",
            job_party_id: "",
            material_id: "",
            location_id: "",
            start_date: "",
            end_date: ""
        });
    }, [type]);

    useEffect(() => {
        loadFilterOptions();
    }, [type]);

    useEffect(() => {
        fetchRecords();
    }, [filters, type]);

    const handleOpenIssueModal = (item) => {
        setSelectedItem(item);
        setIssueQuantity("");
        setPMemoNumber("");
        setIssueDate(new Date().toISOString().split("T")[0]);
        setRemarks("");
        setIssueModalOpen(true);
    };

    const handleOpenHistoryModal = async (item) => {
        setSelectedItem(item);
        setHistoryModalOpen(true);
        setLoadingHistory(true);
        try {
            const res = await getStockIssueLogs(item.material_id, item.grade);
            setIssueHistory(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch issue logs:", error);
            toast.error("Failed to load issue history");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleIssueSubmit = async (e) => {
        e.preventDefault();
        const qty = parseFloat(issueQuantity);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Please enter a valid issue quantity greater than zero");
            return;
        }
        if (qty > parseFloat(selectedItem.balance_quantity)) {
            toast.error(`Cannot issue more than available balance (${selectedItem.balance_quantity})`);
            return;
        }

        setSubmittingIssue(true);
        try {
            await issueStock({
                material_id: selectedItem.material_id,
                grade: selectedItem.grade,
                issue_quantity: qty,
                p_memo_number: pMemoNumber,
                issue_date: issueDate,
                remarks: remarks
            });
            toast.success("Stock issued successfully!");
            setIssueModalOpen(false);
            fetchRecords();
        } catch (error) {
            console.error("Error issuing stock:", error);
            toast.error(error.response?.data?.message || "Failed to issue stock");
        } finally {
            setSubmittingIssue(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return "—";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const columns = useMemo(() => {
        const baseCols = [
            {
                key: "date",
                label: "Date",
                minWidth: "120px",
                render: (row) => <span className="text-slate-600">{formatDate(row.date)}</span>,
            },
            {
                key: "particular",
                label: "Particular",
                minWidth: "160px",
                render: (row) => <span className="text-slate-700 font-medium">{row.particular || "—"}</span>,
            },
            {
                key: "product",
                label: "Product",
                minWidth: "180px",
                render: (row) => <span className="font-semibold text-slate-800">{row.product || "—"}</span>,
            },
            {
                key: "internal_batch_number",
                label: "Internal Batch",
                minWidth: "150px",
                render: (row) => (
                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded border border-blue-100">
                        {row.internal_batch_number || "—"}
                    </span>
                ),
            },
            {
                key: "supplier_batch_number",
                label: "Supplier Batch",
                minWidth: "140px",
                render: (row) => (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-700 font-mono text-xs font-semibold rounded border border-slate-200">
                        {row.supplier_batch_number || "—"}
                    </span>
                ),
            },
        ];

        if (type !== "general") {
            baseCols.push({
                key: "grade",
                label: "Grade",
                minWidth: "100px",
                render: (row) => <span className="text-slate-700 font-medium">{row.grade || "—"}</span>,
            });
        }

        baseCols.push(
            {
                key: "vendor_name",
                label: "Vendor/Supplier",
                minWidth: "180px",
                render: (row) => <span className="text-slate-800 font-medium">{row.vendor_name || "—"}</span>,
            },
            {
                key: "job_party_name",
                label: "Job of Party",
                minWidth: "150px",
                render: (row) => <span className="text-slate-800 font-medium">{row.job_party_name || "—"}</span>,
            },
            {
                key: "invoice_number",
                label: "Invoice Number",
                minWidth: "130px",
                render: (row) => <span className="text-slate-600 font-mono">{row.invoice_number || "—"}</span>,
            },
            {
                key: "grn_number",
                label: "Received (GRN)",
                minWidth: "140px",
                render: (row) => (
                    <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded border border-indigo-100">
                        {row.grn_number}
                    </span>
                ),
            },
            {
                key: "p_memo_number",
                label: "P. Memo Number",
                minWidth: "130px",
                render: (row) => <span className="text-slate-600 font-mono">{row.p_memo_number || "—"}</span>,
            },
            {
                key: "approved_quantity",
                label: "Approved Qty",
                minWidth: "120px",
                render: (row) => (
                    <span className="font-bold text-emerald-600">
                        {Number(row.approved_quantity)}
                    </span>
                ),
            },
            {
                key: "issued_quantity",
                label: "Issued Qty",
                minWidth: "120px",
                render: (row) => (
                    <span className="font-bold text-amber-600">
                        {Number(row.issued_quantity)}
                    </span>
                ),
            },
            {
                key: "balance_quantity",
                label: "Balance Qty",
                minWidth: "120px",
                render: (row) => {
                    const balance = Number(row.balance_quantity);
                    return (
                        <span className={`font-extrabold px-2 py-0.5 rounded-md ${balance > 0 ? "text-indigo-700 bg-indigo-50 border border-indigo-200" : "text-slate-500 bg-slate-100 border border-slate-200"}`}>
                            {balance}
                        </span>
                    );
                },
            }
        );

        return baseCols;
    }, [type]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title={type === "rm" ? "Raw Material Stock Book" : type === "general" ? "General Stock Book" : "Stock Book"} />
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 mx-auto w-full">
                

                {/* Filters Section */}
                <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-slate-200">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-sm">
                        <i className="fa-solid fa-filter text-indigo-600"></i>
                        Filter Stock Records
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

                        {/* Job of Party Filter */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job of Party</label>
                            <select
                                value={filters.job_party_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, job_party_id: e.target.value }))}
                                className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                            >
                                <option value="">All Job Parties</option>
                                {jobParties.map(jp => (
                                    <option key={jp.id} value={jp.id}>{jp.party_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Material Filter */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Material <span className="text-rose-500">*</span></label>
                            <select
                                value={filters.material_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, material_id: e.target.value }))}
                                className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                            >
                                <option value="">Select Material</option>
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

                        {/* Start Date */}
                        <div className="flex flex-col gap-1.5 w-full min-w-[130px]">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date <span className="text-rose-500">*</span></label>
                            <DateInput
                                value={filters.start_date}
                                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                            />
                        </div>

                        {/* End Date */}
                        <div className="flex flex-col gap-1.5 w-full min-w-[130px]">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date <span className="text-rose-500">*</span></label>
                            <DateInput
                                value={filters.end_date}
                                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Reset Button */}
                    {(filters.vendor_id || filters.job_party_id || filters.material_id || filters.location_id || filters.start_date || filters.end_date) && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setFilters({
                                    vendor_id: "",
                                    job_party_id: "",
                                    material_id: "",
                                    location_id: "",
                                    start_date: "",
                                    end_date: ""
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
                    {(!filters.material_id || !filters.start_date || !filters.end_date) ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border border-indigo-100">
                                <i className="fa-solid fa-book-open text-indigo-600 text-2xl"></i>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Required Filters Missing</h3>
                            <p className="text-slate-500 text-sm max-w-sm">
                                Please select a <span className="font-semibold text-slate-700">Material</span>, <span className="font-semibold text-slate-700">Start Date</span>, and <span className="font-semibold text-slate-700">End Date</span> in the filters above to retrieve the Stock Book transactions and running balance.
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            tableId={type === "rm" ? "rm_stock_book_table" : type === "general" ? "general_stock_book_table" : "stock_book_table_v2"}
                            title={type === "rm" ? "Raw Material Stock Book" : type === "general" ? "General Stock Book" : "Stock Book"}
                            data={records}
                            columns={columns}
                            loading={loading}
                            searchPlaceholder="Search products, batch numbers, vendors..."
                        />
                    )}
                </div>
            </main>

            {/* Issue Stock Modal */}
            {issueModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-arrow-up-right-from-square text-indigo-600"></i>
                                Issue Stock
                            </h2>
                            <button
                                onClick={() => setIssueModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xl"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleIssueSubmit}>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-5 gap-4 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/50 text-xs text-indigo-950">
                                    <div>
                                        <span className="font-semibold block text-indigo-500 uppercase tracking-wider text-[9px] mb-0.5">Product</span>
                                        <span className="font-bold text-slate-900 truncate block" title={selectedItem.product}>{selectedItem.product}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-indigo-500 uppercase tracking-wider text-[9px] mb-0.5">Internal Batch</span>
                                        <span className="font-mono font-bold text-slate-900 truncate block" title={selectedItem.internal_batch_number}>{selectedItem.internal_batch_number}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-indigo-500 uppercase tracking-wider text-[9px] mb-0.5">Supplier Batch</span>
                                        <span className="font-mono font-bold text-slate-900 truncate block" title={selectedItem.supplier_batch_number}>{selectedItem.supplier_batch_number || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-indigo-500 uppercase tracking-wider text-[9px] mb-0.5">GRN Reference</span>
                                        <span className="font-mono font-bold text-slate-900 truncate block" title={selectedItem.grn_number}>{selectedItem.grn_number}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-indigo-500 uppercase tracking-wider text-[9px] mb-0.5">Available Balance</span>
                                        <span className="text-indigo-800 font-extrabold text-sm block">{selectedItem.balance_quantity}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700">Issue Quantity *</label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            required
                                            min="0.0001"
                                            max={selectedItem.balance_quantity}
                                            value={issueQuantity}
                                            onChange={(e) => setIssueQuantity(e.target.value)}
                                            placeholder={`Max ${selectedItem.balance_quantity}`}
                                            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-600"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700">P. Memo Number</label>
                                        <input
                                            type="text"
                                            value={pMemoNumber}
                                            onChange={(e) => setPMemoNumber(e.target.value)}
                                            placeholder="Leave blank for now"
                                            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-600"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700">Issue Date *</label>
                                        <DateInput
                                            required
                                            value={issueDate}
                                            onChange={(e) => setIssueDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700">Remarks</label>
                                        <input
                                            type="text"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder="Add any issue remarks..."
                                            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIssueModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingIssue}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {submittingIssue ? "Issuing..." : "Submit Issue"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fa-solid fa-history text-indigo-600"></i>
                                    Issue History
                                </h2>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                    {selectedItem.product} ({selectedItem.grade || "No Grade"})
                                </p>
                            </div>
                            <button
                                onClick={() => setHistoryModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xl"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {loadingHistory ? (
                                <div className="text-center text-slate-500 py-8 text-sm">
                                    Loading history logs...
                                </div>
                            ) : issueHistory.length > 0 ? (
                                <div className="overflow-hidden border border-slate-200 rounded-xl">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Quantity</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Allocated Batch</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Supplier Batch</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">P. Memo</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Issued By</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100 text-sm">
                                            {issueHistory.map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">{formatDate(log.issue_date)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-indigo-700 font-bold">{Number(log.issue_quantity)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-blue-700 font-semibold">{log.internal_batch_number || "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-700 font-medium">{log.supplier_batch_number || "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-500">{log.p_memo_number || "—"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">{log.added_by_name}</td>
                                                    <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate" title={log.remarks}>{log.remarks || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-slate-500 py-12">
                                    <i className="fa-solid fa-box-open text-slate-300 text-3xl block mb-2"></i>
                                    No issue history found for this item
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setHistoryModalOpen(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
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
