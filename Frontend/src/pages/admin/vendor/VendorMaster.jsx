import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import DataTable from "../../../components/DataTable";
import { getAllVendors, deleteVendor, toggleVendorActive } from "../../../api/vendorApi";
import toast from "react-hot-toast";
import { usePermission } from "../../../context/PermissionContext";

// ── View Modal ─────────────────────────────────────────────────────────────────
function VendorViewModal({ vendor, onClose }) {
    if (!vendor) return null;

    const Section = ({ title, children }) => (
        <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">{title}</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">{children}</div>
        </div>
    );

    const Field = ({ label, value }) => (
        <div>
            <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
            <p className="text-sm text-slate-800 font-medium">{value || <span className="text-slate-300">—</span>}</p>
        </div>
    );

    const contacts   = Array.isArray(vendor.contacts)   ? vendor.contacts   : [];
    const addresses  = Array.isArray(vendor.addresses)  ? vendor.addresses  : [];
    const documents  = Array.isArray(vendor.documents)  ? vendor.documents  : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-[#369ACF] to-[#065a9e] text-white">
                    <div>
                        <h2 className="text-lg font-bold">{vendor.vendor_name}</h2>
                        <p className="text-blue-200 text-sm">{vendor.vendor_code}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            vendor.vendor_status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}>
                            {vendor.vendor_status || 'Not Approved'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            vendor.active !== false && vendor.active !== 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                        }`}>
                            {vendor.active !== false && vendor.active !== 0 ? 'Active' : 'Inactive'}
                        </span>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors ml-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6">

                    {/* 1. General */}
                    <Section title="1. General Information">
                        <Field label="Vendor Name"    value={vendor.vendor_name} />
                        <Field label="Vendor Code"    value={vendor.vendor_code} />
                        <Field label="Contact Phone"  value={vendor.contact_phone} />
                        <Field label="Email"          value={vendor.contact_email} />
                        <Field label="Industry"       value={vendor.industry} />
                        <Field label="Currency"       value={vendor.currency} />
                        <Field label="Status"         value={vendor.vendor_status} />
                        <Field label="Time Zone"      value={vendor.time_zone} />
                    </Section>

                    {/* 2. Bank Details */}
                    <Section title="2. Bank Details">
                        <Field label="Bank Name"           value={vendor.bank_name} />
                        <Field label="Account Number"      value={vendor.bank_account_number} />
                        <Field label="IFSC Code"           value={vendor.bank_ifsc} />
                        <Field label="Cheque Printing Name" value={vendor.cheque_printing_name} />
                        <Field label="PAN Number"          value={vendor.pan_no} />
                    </Section>

                    {/* 3. Addresses */}
                    {addresses.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">3. Addresses</h3>
                            <div className="space-y-3">
                                {addresses.map((addr, i) => (
                                    <div key={i} className="bg-slate-50 rounded-lg p-3 text-sm">
                                        <p className="font-medium text-slate-800">{addr.address}</p>
                                        <p className="text-slate-500">{[addr.city, addr.state, addr.country, addr.zip_code].filter(Boolean).join(', ')}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. Contact Persons */}
                    {contacts.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">4. Contact Persons</h3>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Number</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Designation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {contacts.map((c, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2 text-sm text-slate-800">{c.contact_name}</td>
                                                <td className="px-4 py-2 text-sm text-slate-600">{c.contact_number || '—'}</td>
                                                <td className="px-4 py-2 text-sm text-slate-600">{c.designation || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 5. GST / Documents */}
                    <div className="mb-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-100">5. License & Docs</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-4">
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-0.5">GST No</p>
                                <p className="text-sm text-slate-800 font-mono font-medium">{vendor.gst_no || <span className="text-slate-300 font-sans">—</span>}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-0.5">State Code</p>
                                <p className="text-sm text-slate-800 font-mono font-medium">{vendor.state_code || <span className="text-slate-300 font-sans">—</span>}</p>
                            </div>
                        </div>
                        {documents.length > 0 && (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Document</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Number</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {documents.map((d, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2 text-sm text-slate-800">{d.document_name}</td>
                                                <td className="px-4 py-2 text-sm text-slate-600 font-mono">{d.document_number || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ──────────────────────────────────────────────────────────────
export default function VendorMaster() {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [viewingVendor, setViewingVendor] = useState(null);

    const canWrite  = hasPermission("vendor", "write");
    const canUpdate = hasPermission("vendor", "update");
    const canDelete = hasPermission("vendor", "delete");

    const loadVendors = async () => {
        setLoading(true);
        try {
            const res = await getAllVendors(showInactive);
            setVendors(res.data.data || []);
        } catch (error) {
            console.error("Failed to load vendors:", error);
            toast.error("Failed to load vendors");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVendors();
    }, [showInactive]);

    const handleToggleActive = async (id, currentActive) => {
        const newState = !currentActive;
        if (!window.confirm(`Are you sure you want to ${newState ? 'activate' : 'deactivate'} this vendor?`)) return;
        setSaving(true);
        try {
            await toggleVendorActive(id, newState);
            toast.success(`Vendor ${newState ? 'activated' : 'deactivated'}`);
            loadVendors();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update vendor status");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this vendor?")) return;
        setSaving(true);
        try {
            await deleteVendor(id);
            toast.success("Vendor deleted successfully");
            loadVendors();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to delete vendor");
        } finally {
            setSaving(false);
        }
    };

    const columns = useMemo(() => {
        const cols = [
            { key: "vendor_code",   label: "Code",        minWidth: "100px" },
            { key: "vendor_name",   label: "Vendor Name", minWidth: "160px",
              render: (row) => <span className="font-semibold text-slate-900">{row.vendor_name}</span> },
            { key: "industry",      label: "Industry",    minWidth: "130px",
              render: (row) => row.industry || '—' },
            { key: "contact_phone", label: "Contact No.", minWidth: "130px",
              render: (row) => row.contact_phone || '—' },
            { key: "contact_email", label: "Email",       minWidth: "160px",
              render: (row) => row.contact_email || '—' },
            { key: "vendor_status", label: "Approval",    minWidth: "120px",
              render: (row) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    row.vendor_status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                }`}>
                    {row.vendor_status || 'Not Approved'}
                </span>
              )
            },
            { key: "active", label: "Status", minWidth: "100px",
              render: (row) => {
                const isActive = row.active !== false && row.active !== 0;
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                );
              }
            },
        ];

        // Actions column
        cols.push({
            key: "actions",
            label: "Actions",
            sortable: false,
            minWidth: "140px",
            render: (row) => {
                const isActive = row.active !== false && row.active !== 0;
                return (
                    <div className="flex items-center gap-1.5">
                        {/* View */}
                        <button
                            onClick={() => setViewingVendor(row)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            title="View Details"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>

                        {/* Edit */}
                        {canUpdate && (
                            <button
                                onClick={() => navigate(`/admin/vendors/edit/${row.id}`)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0]"
                                title="Edit"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                                </svg>
                            </button>
                        )}

                        {/* Active/Inactive toggle */}
                        {canUpdate && (
                            <button
                                onClick={() => handleToggleActive(row.id, isActive)}
                                disabled={saving}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                                    isActive
                                        ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                                title={isActive ? 'Deactivate' : 'Activate'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                                </svg>
                            </button>
                        )}

                        {/* Delete */}
                        {canDelete && (
                            <button
                                onClick={() => handleDelete(row.id)}
                                disabled={saving}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                title="Delete"
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

        return cols;
    }, [saving, canUpdate, canDelete, showInactive]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
            <Navbar title="ERP Admin" />
            <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <DataTable
                    tableId="vendor_master"
                    title="Vendor Master"
                    data={vendors}
                    columns={columns}
                    loading={loading}
                    searchPlaceholder="Search vendors..."
                    toggleActions={
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 select-none">
                            <div
                                onClick={() => setShowInactive(v => !v)}
                                className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${showInactive ? 'bg-amber-400' : 'bg-slate-200'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${showInactive ? 'translate-x-4' : ''}`} />
                            </div>
                            Show Inactive
                        </label>
                    }
                    actionButton={
                        canWrite && (
                            <button
                                onClick={() => navigate("/admin/vendors/create")}
                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white transition-all hover:bg-[#2583b4] shadow-sm hover:shadow"
                                title="Create Vendor"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                        )
                    }
                />
            </main>

            {/* View Modal */}
            {viewingVendor && (
                <VendorViewModal vendor={viewingVendor} onClose={() => setViewingVendor(null)} />
            )}
        </div>
    );
}
