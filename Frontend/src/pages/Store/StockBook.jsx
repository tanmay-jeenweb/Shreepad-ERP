import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { getStockBook, issueStock, getStockIssueLogs } from "../../api/stockBookApi";
import { getAllVendors } from "../../api/vendorApi";
import { getMaterials } from "../../api/materialApi";
import { getLocations } from "../../api/locationApi";
import { getMaterialTypes } from "../../api/materialAddApi";
import DateInput from "../../components/DateInput";

export default function StockBook() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter states
    const [materialTypes, setMaterialTypes] = useState([]);
    const [allMaterials, setAllMaterials] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [locations, setLocations] = useState([]);
    const [filters, setFilters] = useState({
        material_type: "",
        vendor_id: "",
        material_id: "",
        location_id: "",
        start_date: "",
        end_date: ""
    });

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
            const res = await getStockBook(filters);
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
            const [typesRes, vendorsRes, materialsRes, locationsRes] = await Promise.all([
                getMaterialTypes(),
                getAllVendors(),
                getMaterials(),
                getLocations()
            ]);
            setMaterialTypes(typesRes.data?.data || []);
            setVendors(vendorsRes.data?.data || []);
            setAllMaterials(materialsRes.data?.data || []);
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

    // Filter materials dynamically based on selected material type
    const filteredMaterials = useMemo(() => {
        if (!filters.material_type) return allMaterials;
        return allMaterials.filter(
            (m) => String(m.material_type).toLowerCase() === String(filters.material_type).toLowerCase()
        );
    }, [allMaterials, filters.material_type]);

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
            const res = await getStockIssueLogs(item.material_id);
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
        return [
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
                label: "Product / Material",
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
            {
                key: "vendor_name",
                label: "Vendor/Supplier",
                minWidth: "180px",
                render: (row) => <span className="text-slate-800 font-medium">{row.vendor_name || "—"}</span>,
            },
            {
                key: "invoice_number",
                label: "Invoice Number",
                minWidth: "130px",
                render: (row) => <span className="text-slate-600 font-mono">{row.invoice_number || "—"}</span>,
            },
            {
                key: "grn_number",
                label: "Receipt No.",
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
                label: "Received Qty",
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
        ];
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar title="Stock Book" />
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 mx-auto w-full max-w-[1600px]">
                {/* Filters Section */}
                <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-slate-200">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-sm">
                        <i className="fa-solid fa-filter text-indigo-600"></i>
                        Filter Stock Records
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {/* Material Type Filter */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Material Type</label>
                            <select
                                value={filters.material_type}
                                onChange={(e) => setFilters(prev => ({ ...prev, material_type: e.target.value, material_id: "" }))}
                                className="h-10 px-3 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                            >
                                <option value="">All Types</option>
                                {materialTypes.map((t, idx) => (
                                    <option key={idx} value={t}>{t}</option>
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
                                {filteredMaterials.map(m => (
                                    <option key={m.id} value={m.id}>{m.material_name}</option>
                                ))}
                            </select>
                        </div>

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
                    {(filters.material_type || filters.material_id || filters.vendor_id || filters.location_id || filters.start_date || filters.end_date) && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setFilters({
                                    material_type: "",
                                    material_id: "",
                                    vendor_id: "",
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

                {/* Table or Empty State */}
                {(!filters.material_id || !filters.start_date || !filters.end_date) ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                            <i className="fa-solid fa-filter"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Select Required Filters</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            Please select a <span className="font-semibold text-indigo-600">Material</span>, <span className="font-semibold text-indigo-600">Start Date</span>, and <span className="font-semibold text-indigo-600">End Date</span> to view the Stock Book ledger.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <DataTable
                            tableId="stock_book_table"
                            title="Stock Book Records"
                            data={records}
                            columns={columns}
                            loading={loading}
                            searchPlaceholder="Search particular, batch number, vendor, invoice..."
                        />
                    </div>
                )}
            </main>

            {/* Issue Stock Modal */}
            {issueModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-[#369ACF] to-[#2B82B0] px-6 py-4 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-bold text-lg leading-snug">Issue Material Stock</h3>
                                <p className="text-white/80 text-xs mt-0.5">{selectedItem.product}</p>
                            </div>
                            <button
                                onClick={() => setIssueModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
                            >
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                    <span className="text-xs text-slate-500 block">Internal Batch</span>
                                    <span className="text-sm font-bold text-slate-800 font-mono">{selectedItem.internal_batch_number || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">Available Balance</span>
                                    <span className="text-sm font-extrabold text-indigo-700">{selectedItem.balance_quantity}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Issue Quantity <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    required
                                    placeholder="Enter quantity to issue"
                                    value={issueQuantity}
                                    onChange={(e) => setIssueQuantity(e.target.value)}
                                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        P. Memo Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Optional P.Memo No."
                                        value={pMemoNumber}
                                        onChange={(e) => setPMemoNumber(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-indigo-600 transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        Issue Date <span className="text-rose-500">*</span>
                                    </label>
                                    <DateInput
                                        value={issueDate}
                                        onChange={(e) => setIssueDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Remarks
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Add any additional notes..."
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-indigo-600 transition-all resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIssueModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingIssue}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-all shadow-md shadow-indigo-200 cursor-pointer"
                                >
                                    {submittingIssue ? "Processing..." : "Confirm Issue"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Issue History Modal */}
            {historyModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-bold text-lg">Stock Issue History</h3>
                                <p className="text-slate-400 text-xs mt-0.5">{selectedItem?.product}</p>
                            </div>
                            <button
                                onClick={() => setHistoryModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer text-white"
                            >
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingHistory ? (
                                <div className="text-center py-8 text-slate-400">
                                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-indigo-600"></i>
                                    <p className="text-sm">Loading issue logs...</p>
                                </div>
                            ) : issueHistory.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <i className="fa-solid fa-inbox text-3xl mb-2 text-slate-300"></i>
                                    <p className="text-sm">No issue records found for this material.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {issueHistory.map((log) => (
                                        <div key={log.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 text-sm">Issued: {log.issue_quantity}</span>
                                                    {log.p_memo_number && (
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded">
                                                            {log.p_memo_number}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Date: <span className="font-medium text-slate-700">{formatDate(log.issue_date)}</span> | Batch: <span className="font-mono text-slate-700">{log.internal_batch_number || "—"}</span>
                                                </p>
                                                {log.remarks && (
                                                    <p className="text-xs text-slate-600 mt-1 bg-white p-2 rounded border border-slate-100">
                                                        {log.remarks}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-slate-400 block">{formatDate(log.created_at)}</span>
                                                <span className="text-xs font-semibold text-slate-600 block mt-0.5">By {log.added_by_name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
