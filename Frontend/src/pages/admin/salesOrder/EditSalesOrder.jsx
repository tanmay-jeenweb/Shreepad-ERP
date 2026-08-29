import { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { getSalesOrderById, updateSalesOrder, reviseSalesOrder } from "../../../api/salesOrderApi";
import { getAllCustomers } from "../../../api/customerApi";
import { getMaterials } from "../../../api/materialApi";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

export default function EditSalesOrder() {
  const { id } = useParams();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isReviseMode = queryParams.get("mode") === "revise";
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({
    salesOrderId: "",
    customerId: "",
    customerOrderNo: ""
  });
  const [items, setItems] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, materialsRes, salesOrderRes] = await Promise.all([
          getAllCustomers(),
          getMaterials(),
          getSalesOrderById(id)
        ]);

        setCustomers(customersRes.data.data || []);

        const allMaterials = materialsRes.data.data || [];
        const filtered = allMaterials.filter(m => {
          const type = (m.material_type || "").toLowerCase();
          const group = (m.material_group_name || "").toLowerCase();
          return type.includes("finish") || type.includes("semi") || group.includes("finish") || group.includes("semi");
        });

        setMaterials(filtered);

        const so = salesOrderRes.data.data;
        if (so) {
          setForm({
            salesOrderId: so.sales_order_id || "",
            customerId: so.customer_id || "",
            customerOrderNo: so.customer_order_no || ""
          });

          if (so.items && so.items.length > 0) {
              setItems(so.items.map(i => ({
                  materialId: i.material_id,
                  quantity: i.quantity,
                  price: i.price,
                  discount: i.discount || "0",
                  gst: i.gst || "0",
                  totalPrice: i.total_price || 0
              })));
          } else {
              setItems([{ materialId: "", quantity: "", price: "", discount: "0", gst: "0", totalPrice: 0 }]);
          }
        }
      } catch (err) {
        console.error("Failed to load data for sales order edit", err);
        setError("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === Number(form.customerId)) || null;
  }, [form.customerId, customers]);

  const handleItemChange = (index, field, value) => {
      const newItems = [...items];
      newItems[index][field] = value;
      
      // Calculate row total
      const qty = Number(newItems[index].quantity) || 0;
      const prc = Number(newItems[index].price) || 0;
      const gstPerc = Number(newItems[index].gst) || 0;
      const discPerc = Number(newItems[index].discount) || 0;

      const subtotal = qty * prc;
      const discountAmount = (subtotal * discPerc) / 100;
      const taxableAmount = subtotal - discountAmount;
      const gstAmount = (taxableAmount * gstPerc) / 100;
      
      newItems[index].totalPrice = taxableAmount + gstAmount;

      setItems(newItems);
  };

  const addItemRow = () => {
      setItems([...items, { materialId: "", quantity: "", price: "", discount: "0", gst: "0", totalPrice: 0 }]);
  };

  const removeItemRow = (index) => {
      if (items.length > 1) {
          const newItems = items.filter((_, i) => i !== index);
          setItems(newItems);
      }
  };

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.salesOrderId || !form.customerId || items.length === 0) {
      setError("Please fill all required fields.");
      return;
    }

    const hasInvalidItem = items.some(i => !i.materialId || !i.quantity || !i.price);
    if (hasInvalidItem) {
        setError("Please complete all item details.");
        return;
    }

    setSaving(true);
    setError("");

    try {
      if (isReviseMode) {
        await reviseSalesOrder(id, {
          ...form,
          items: items.map(item => ({
              ...item,
              quantity: Number(item.quantity),
              price: Number(item.price),
              gst: Number(item.gst),
              discount: Number(item.discount),
              totalPrice: Number(item.totalPrice)
          }))
        });
        toast.success(`Sales Order revision submitted successfully.`);
      } else {
        await updateSalesOrder(id, {
          ...form,
          items: items.map(item => ({
              ...item,
              quantity: Number(item.quantity),
              price: Number(item.price),
              gst: Number(item.gst),
              discount: Number(item.discount),
              totalPrice: Number(item.totalPrice)
          }))
        });
        toast.success(`Sales Order '${form.salesOrderId}' updated successfully.`);
      }
      setTimeout(() => navigate("/sales/sales-orders"), 900);
    } catch (err) {
      console.error("Failed to save sales order", err);
      setError(err?.response?.data?.message || "Unable to save sales order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors text-slate-800";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";
  const infoCardClass = "mt-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 space-y-1.5";

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 flex items-center justify-center h-screen">
        <p className="text-slate-500 font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isReviseMode ? "Revise Sales Order" : "Edit Sales Order"}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              {isReviseMode
                ? `Create a new revision of sales order '${form.salesOrderId}'.`
                : "Update the details of an existing sales order."}
            </p>
          </div>
          <button
            onClick={() => navigate("/sales/sales-orders")}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Sales Orders List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mx-auto">
          {error && <div className="text-rose-600 font-medium text-sm bg-rose-50 p-3 rounded-lg border border-rose-200 mb-5">{error}</div>}

          <form className="space-y-8" onSubmit={handleSubmit}>
            {isReviseMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <i className="fa-solid fa-circle-info text-amber-600 mt-0.5 text-lg"></i>
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Revising Sales Order</h4>
                  <p className="text-xs text-amber-700 font-medium mt-0.5">
                    You are revising the approved or rejected Sales Order <strong>{form.salesOrderId}</strong>. 
                    Saving this will create a new Sales Order revision and reset its approval status to pending.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">

              <div>
                <label className={labelClass}>Sales Order ID <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. SO-1001"
                  value={form.salesOrderId}
                  className={`${inputClass} bg-slate-50 cursor-not-allowed`}
                  disabled
                />
              </div>

              {/* Customer Section */}
              <div className="flex flex-col">
                <label className={labelClass}>Customer <span className="text-rose-500">*</span></label>
                <select
                  value={form.customerId}
                  onChange={e => setForm({ ...form, customerId: e.target.value })}
                  className={inputClass}
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.customer_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Customer Order Number</label>
                <input
                  type="text"
                  placeholder="e.g. CO-12345"
                  value={form.customerOrderNo}
                  onChange={e => setForm({ ...form, customerOrderNo: e.target.value })}
                  className={inputClass}
                />
              </div>

              {selectedCustomer && (
                  <div className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-5">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#369ACF]"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                        Customer Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-700">
                        <div><span className="font-medium text-slate-500 block mb-0.5">Code</span> {selectedCustomer.customer_code}</div>
                        <div><span className="font-medium text-slate-500 block mb-0.5">Email</span> {selectedCustomer.contact_email || 'N/A'}</div>
                        <div><span className="font-medium text-slate-500 block mb-0.5">Phone</span> {selectedCustomer.contact_phone || 'N/A'}</div>
                        <div><span className="font-medium text-slate-500 block mb-0.5">GST No</span> {selectedCustomer.gst_no || 'N/A'}</div>
                        {selectedCustomer.addresses?.[0] && (
                            <div className="md:col-span-4 mt-1 pt-3 border-t border-slate-200/60">
                                <span className="font-medium text-slate-500 inline-block mr-2">Billing City:</span> 
                                {selectedCustomer.addresses[0].city || 'N/A'}
                            </div>
                        )}
                    </div>
                  </div>
              )}
            </div>

            {/* Items Section */}
            <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Order Items</h3>
                    <button
                        type="button"
                        onClick={addItemRow}
                        className="text-sm font-medium text-[#369ACF] bg-[#369ACF]/10 hover:bg-[#369ACF]/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Add Item
                    </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[250px]">Material <span className="text-rose-500">*</span></th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Quantity <span className="text-rose-500">*</span></th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Price <span className="text-rose-500">*</span></th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Disc (%)</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">GST (%)</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Total</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {items.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-50/30">
                                    <td className="px-4 py-3">
                                        <select
                                            value={item.materialId}
                                            onChange={e => handleItemChange(index, "materialId", e.target.value)}
                                            className="w-full border-0 bg-transparent text-sm text-slate-800 focus:ring-2 focus:ring-[#369ACF] focus:outline-none rounded p-1"
                                            required
                                        >
                                            <option value="">Select Material</option>
                                            {materials.map(m => (
                                                <option key={m.id} value={m.id}>{m.material_name} ({m.material_code})</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(index, "quantity", e.target.value)}
                                            className="w-full border-0 bg-transparent text-sm text-slate-800 text-right focus:ring-2 focus:ring-[#369ACF] focus:outline-none rounded p-1"
                                            placeholder="0.00"
                                            required
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={e => handleItemChange(index, "price", e.target.value)}
                                            className="w-full border-0 bg-transparent text-sm text-slate-800 text-right focus:ring-2 focus:ring-[#369ACF] focus:outline-none rounded p-1"
                                            placeholder="0.00"
                                            required
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={item.discount}
                                            onChange={e => handleItemChange(index, "discount", e.target.value)}
                                            className="w-full border-0 bg-transparent text-sm text-rose-600 text-right focus:ring-2 focus:ring-rose-400 focus:outline-none rounded p-1"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={item.gst}
                                            onChange={e => handleItemChange(index, "gst", e.target.value)}
                                            className="w-full border-0 bg-transparent text-sm text-slate-800 text-right focus:ring-2 focus:ring-[#369ACF] focus:outline-none rounded p-1"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold text-[#369ACF]">
                                        ₹{Number(item.totalPrice || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItemRow(index)}
                                                className="text-rose-400 hover:text-rose-600 p-1"
                                                title="Remove Item"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end items-center gap-4">
                        <span className="text-sm font-medium text-slate-500">Order Total:</span>
                        <span className="text-xl font-bold text-[#369ACF]">₹{grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate("/sales/sales-orders")}
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
              >
                {saving ? "Saving..." : (isReviseMode ? "Submit Revision" : "Update Sales Order")}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
