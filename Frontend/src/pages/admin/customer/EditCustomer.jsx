import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import { getCustomerById, updateCustomer } from "../../../api/customerApi";
import { getAllDocuments } from "../../../api/documentApi";
import toast from "react-hot-toast";

const INDUSTRIES = [
    "Manufacturing","Retail","Wholesale / Distribution","Technology / IT",
    "Construction","Logistics & Transportation","Healthcare & Pharma",
    "Agriculture","Food & Beverage","Textiles & Apparel","Chemicals",
    "Automotive","Energy & Utilities","Financial Services","Other",
];
const TIME_ZONES = [
    { label: "IST — India Standard Time (UTC+5:30)", value: "Asia/Kolkata" },
    { label: "UTC — Coordinated Universal Time (UTC+0)", value: "UTC" },
    { label: "EST — Eastern Standard Time (UTC-5)", value: "America/New_York" },
    { label: "PST — Pacific Standard Time (UTC-8)", value: "America/Los_Angeles" },
    { label: "GMT — Greenwich Mean Time (UTC+0)", value: "Europe/London" },
    { label: "CET — Central European Time (UTC+1)", value: "Europe/Paris" },
    { label: "GST — Gulf Standard Time (UTC+4)", value: "Asia/Dubai" },
    { label: "SGT — Singapore Time (UTC+8)", value: "Asia/Singapore" },
    { label: "JST — Japan Standard Time (UTC+9)", value: "Asia/Tokyo" },
    { label: "AEST — Australian Eastern Time (UTC+10)", value: "Australia/Sydney" },
];
const CURRENCIES = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
];

export default function EditCustomer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading]     = useState(false);
    const [fetching, setFetching]   = useState(true);
    const [documentMasters, setDocumentMasters] = useState([]);

    const [formData, setFormData] = useState({
        customer_code: "", customer_name: "", contact_phone: "", contact_email: "",
        industry: "", currency: "INR", customer_status: "Not Approved",
        time_zone: "Asia/Kolkata", contact_name: "",
        bank_name: "", bank_account_number: "", bank_ifsc: "",
        cheque_printing_name: "", pan_no: "", gst_no: "", state_code: "",
    });

    const [documents, setDocuments]           = useState([]);
    const [currentDoc, setCurrentDoc]         = useState({ document_master_id: "", document_number: "" });
    const [contacts, setContacts]             = useState([]);
    const [currentContact, setCurrentContact] = useState({ contact_name: "", contact_number: "", designation: "" });
    const [addresses, setAddresses]           = useState([]);
    const [currentAddress, setCurrentAddress] = useState({ address: "", country: "", state: "", city: "", zip_code: "" });

    useEffect(() => {
        const init = async () => {
            try {
                const [customerRes, docsRes] = await Promise.all([
                    getCustomerById(id),
                    getAllDocuments(),
                ]);
                const v = customerRes.data?.data;
                setDocumentMasters(docsRes.data?.data || []);
                if (v) {
                    setFormData({
                        customer_code:          v.customer_code          || "",
                        customer_name:          v.customer_name          || "",
                        contact_phone:        v.contact_phone        || "",
                        contact_email:        v.contact_email        || "",
                        industry:             v.industry             || "",
                        currency:             v.currency             || "INR",
                        customer_status:        v.customer_status        || "Not Approved",
                        time_zone:            v.time_zone            || "Asia/Kolkata",
                        contact_name:         v.contact_name         || "",
                        bank_name:            v.bank_name            || "",
                        bank_account_number:  v.bank_account_number  || "",
                        bank_ifsc:            v.bank_ifsc            || "",
                        cheque_printing_name: v.cheque_printing_name || "",
                        pan_no:               v.pan_no               || "",
                        gst_no:               v.gst_no               || "",
                        state_code:           v.state_code           || "",
                    });
                    setContacts(Array.isArray(v.contacts)  ? v.contacts  : []);
                    setAddresses(Array.isArray(v.addresses) ? v.addresses : []);
                    setDocuments(
                        (Array.isArray(v.documents) ? v.documents : []).map(d => ({
                            document_master_id: String(d.document_master_id),
                            document_name:      d.document_name,
                            document_number:    d.document_number || "",
                        }))
                    );
                }
            } catch (err) {
                toast.error("Failed to load customer data");
                navigate("/admin/customers");
            } finally {
                setFetching(false);
            }
        };
        init();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddDocument = () => {
        if (!currentDoc.document_master_id) { toast.error("Please select a document type"); return; }
        const dm = documentMasters.find(d => d.id.toString() === currentDoc.document_master_id);
        setDocuments(prev => [...prev, { document_master_id: currentDoc.document_master_id, document_name: dm?.document_name, document_number: currentDoc.document_number }]);
        setCurrentDoc({ document_master_id: "", document_number: "" });
    };

    const handleAddContact = () => {
        if (!currentContact.contact_name.trim()) { toast.error("Contact name is required"); return; }
        setContacts(prev => [...prev, { ...currentContact }]);
        setCurrentContact({ contact_name: "", contact_number: "", designation: "" });
    };

    const handleAddAddress = () => {
        if (!currentAddress.address.trim() && !currentAddress.city.trim()) { toast.error("Enter at least address or city"); return; }
        setAddresses(prev => [...prev, { ...currentAddress }]);
        setCurrentAddress({ address: "", country: "", state: "", city: "", zip_code: "" });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customer_code || !formData.customer_name) { toast.error("Customer Code and Customer Name are required"); return; }
        setLoading(true);
        try {
            await updateCustomer(id, { ...formData, documents, contacts, addresses });
            toast.success("Customer updated successfully");
            navigate("/admin/customers");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update customer");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#369ACF] text-sm bg-white";
    const labelCls = "block text-sm font-semibold text-slate-700";

    if (fetching) {
        return (
            <div className="flex-1 flex flex-col bg-slate-50">
                <Navbar title="ERP Admin" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-slate-500 text-sm">Loading customer data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 h-screen overflow-hidden">
            <Navbar title="ERP Admin" />
            <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <button onClick={() => navigate("/admin/customers")}
                            className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                            Back to Customers
                        </button>
                        <h1 className="text-2xl font-bold text-slate-900">Edit Customer</h1>
                        <p className="text-sm text-slate-500 mt-1">{formData.customer_name} ({formData.customer_code})</p>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => navigate("/admin/customers")}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={loading}
                            className="px-6 py-2 text-sm font-medium text-white bg-[#369ACF] hover:bg-[#2583b4] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>

                <div className="space-y-6 pb-20">

                    {/* Box 1: General */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">1. General Fields</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className={labelCls}>Customer Name <span className="text-rose-500">*</span></label>
                                <input type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className={inputCls} placeholder="e.g. Acme Corp" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Customer Code <span className="text-rose-500">*</span></label>
                                <input type="text" name="customer_code" value={formData.customer_code} onChange={handleChange} className={inputCls} placeholder="e.g. V-001" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Contact Number</label>
                                <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleChange} className={inputCls} placeholder="e.g. +91 98765 43210" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Email</label>
                                <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} className={inputCls} placeholder="e.g. customer@example.com" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Industry</label>
                                <select name="industry" value={formData.industry} onChange={handleChange} className={inputCls}>
                                    <option value="">Select industry...</option>
                                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Currency</label>
                                <select name="currency" value={formData.currency} onChange={handleChange} className={inputCls}>
                                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} — {c.code} ({c.name})</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Status</label>
                                <select name="customer_status" value={formData.customer_status} onChange={handleChange} className={inputCls}>
                                    <option value="Approved">Approved</option>
                                    <option value="Not Approved">Not Approved</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Time Zone</label>
                                <select name="time_zone" value={formData.time_zone} onChange={handleChange} className={inputCls}>
                                    {TIME_ZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Box 2: Bank Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">2. Bank Details</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className={labelCls}>Bank Name</label>
                                <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className={inputCls} placeholder="e.g. State Bank of India" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Bank Account Number</label>
                                <input type="text" name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} className={inputCls} placeholder="e.g. 1234567890" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Bank Branch IFSC Number</label>
                                <input type="text" name="bank_ifsc" value={formData.bank_ifsc} onChange={handleChange} className={`${inputCls} uppercase`} placeholder="e.g. SBIN0001234" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Cheque Printing Name</label>
                                <input type="text" name="cheque_printing_name" value={formData.cheque_printing_name} onChange={handleChange} className={inputCls} placeholder="Name as on cheque" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>PAN Card Number</label>
                                <input type="text" name="pan_no" value={formData.pan_no} onChange={handleChange} className={`${inputCls} uppercase`} placeholder="e.g. ABCDE1234F" />
                            </div>
                        </div>
                    </div>

                    {/* Box 3: Address */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">3. Address</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-3 space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600">Address</label>
                                    <input type="text" value={currentAddress.address} onChange={(e) => setCurrentAddress({ ...currentAddress, address: e.target.value })} className={inputCls} placeholder="Street / building address" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600">Country</label>
                                    <input type="text" value={currentAddress.country} onChange={(e) => setCurrentAddress({ ...currentAddress, country: e.target.value })} className={inputCls} placeholder="e.g. India" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600">State</label>
                                    <input type="text" value={currentAddress.state} onChange={(e) => setCurrentAddress({ ...currentAddress, state: e.target.value })} className={inputCls} placeholder="e.g. Maharashtra" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600">City</label>
                                    <input type="text" value={currentAddress.city} onChange={(e) => setCurrentAddress({ ...currentAddress, city: e.target.value })} className={inputCls} placeholder="e.g. Mumbai" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600">Zip / Postal Code</label>
                                    <input type="text" value={currentAddress.zip_code} onChange={(e) => setCurrentAddress({ ...currentAddress, zip_code: e.target.value })} className={inputCls} placeholder="e.g. 400001" />
                                </div>
                                <div className="flex items-end">
                                    <button type="button" onClick={handleAddAddress} className="h-10 w-full px-4 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors">Add</button>
                                </div>
                            </div>
                            {addresses.length > 0 && (
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                {["Address","Country","State","City","Zip","Action"].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {addresses.map((addr, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 text-sm text-slate-800">{addr.address || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{addr.country || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{addr.state || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{addr.city || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{addr.zip_code || '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button type="button" onClick={() => setAddresses(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-700 text-sm font-medium">Remove</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Box 4: Contact Person */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">4. Contact Person</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600">Name <span className="text-rose-500">*</span></label>
                                    <input type="text" value={currentContact.contact_name} onChange={(e) => setCurrentContact({ ...currentContact, contact_name: e.target.value })} className={inputCls} placeholder="Contact person name" />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600">Number</label>
                                    <input type="text" value={currentContact.contact_number} onChange={(e) => setCurrentContact({ ...currentContact, contact_number: e.target.value })} className={inputCls} placeholder="Phone / mobile" />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600">Designation</label>
                                    <input type="text" value={currentContact.designation} onChange={(e) => setCurrentContact({ ...currentContact, designation: e.target.value })} className={inputCls} placeholder="e.g. Purchase Manager" />
                                </div>
                                <button type="button" onClick={handleAddContact} className="h-10 px-4 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors shrink-0">Add</button>
                            </div>
                            {contacts.length > 0 && (
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                {["Name","Number","Designation","Action"].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {contacts.map((c, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 text-sm text-slate-800">{c.contact_name}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{c.contact_number || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{c.designation || '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button type="button" onClick={() => setContacts(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-700 text-sm font-medium">Remove</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Box 5: License & Docs */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">5. License and Docs</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className={labelCls}>GST No</label>
                                    <input type="text" name="gst_no" value={formData.gst_no} onChange={handleChange} className={`${inputCls} uppercase`} placeholder="e.g. 22AAAAA0000A1Z5" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>State Code</label>
                                    <input type="text" name="state_code" value={formData.state_code} onChange={handleChange} className={inputCls} placeholder="e.g. 22" />
                                </div>
                            </div>
                            <hr className="border-slate-200" />
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-4">Additional Documents</h3>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="block text-xs font-semibold text-slate-600">Document Type</label>
                                        <select value={currentDoc.document_master_id} onChange={(e) => setCurrentDoc({ ...currentDoc, document_master_id: e.target.value })} className={inputCls}>
                                            <option value="">Select a document type...</option>
                                            {documentMasters.map(d => <option key={d.id} value={d.id}>{d.document_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <label className="block text-xs font-semibold text-slate-600">License / Document Number</label>
                                        <input type="text" value={currentDoc.document_number} onChange={(e) => setCurrentDoc({ ...currentDoc, document_number: e.target.value })} className={inputCls} placeholder="Enter number..." />
                                    </div>
                                    <button type="button" onClick={handleAddDocument} className="h-10 px-4 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors">Add</button>
                                </div>
                                {documents.length > 0 && (
                                    <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    {["Document Name","Document Number","Action"].map(h => (
                                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {documents.map((doc, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3 text-sm text-slate-800">{doc.document_name}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">{doc.document_number || '—'}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button type="button" onClick={() => setDocuments(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-700 text-sm font-medium">Remove</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
