import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import { createWorkOrder, getNextWorkOrderNo } from "../../../api/workOrderApi";
import { getAllCustomers } from "../../../api/customerApi";
import { getMaterials } from "../../../api/materialApi";
import { getAllMachines } from "../../../api/machineApi";
import { getNextFreeSlot } from "../../../api/machineScheduleApi";
import { getBOMs } from "../../../api/bomApi";
import { getJobParties } from "../../../api/jobPartyApi";
import toast from "react-hot-toast";
import DateInput from "../../../components/DateInput";

export default function CreateWorkOrder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nextWONo, setNextWONo] = useState("");
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [machines, setMachines] = useState([]);
  const [boms, setBoms] = useState([]);
  const [jobParties, setJobParties] = useState([]);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [workOrderDate, setWorkOrderDate] = useState(new Date().toISOString().substring(0, 10));
  const [items, setItems] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Modal states for row edit
  const [showModal, setShowModal] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(null);
  const [modalData, setModalData] = useState({
    quantity: 0,
    production_quantity: 0,
    exp_delivery_date: "",
    batch_no: "",
    actual_delivery_date: "",
    remarks: "",
    machine_id: "",
    job_party_id: ""
  });
  const [nextSlotInfo, setNextSlotInfo] = useState(null);
  const [confirmSlots, setConfirmSlots] = useState({});

  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fetchConfirmSlots = async () => {
    const uniqueMachineIds = [...new Set(items.map(it => it.machine_id).filter(Boolean))];
    const slotsMap = {};
    await Promise.all(uniqueMachineIds.map(async (mId) => {
      try {
        const res = await getNextFreeSlot(mId);
        slotsMap[mId] = res.data.data;
      } catch (err) {
        console.error("Failed to fetch slot for machine", mId, err);
      }
    }));
    setConfirmSlots(slotsMap);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const noRes = await getNextWorkOrderNo();
        setNextWONo(`WO-${String(noRes.data.nextNo).padStart(4, "0")}`);

        const [custRes, matRes, machineRes, bomRes, jobPartiesRes] = await Promise.all([
          getAllCustomers(),
          getMaterials(),
          getAllMachines(),
          getBOMs(),
          getJobParties()
        ]);

        setCustomers(custRes.data.data || []);
        
        // Filter materials for Finished / Semi-Finished
        const allMaterials = matRes.data.data || [];
        const filteredMat = allMaterials.filter(m => {
          const type = (m.material_type || "").toLowerCase();
          const group = (m.material_group_name || "").toLowerCase();
          return type.includes("finish") || type.includes("semi") || group.includes("finish") || group.includes("semi");
        });
        setMaterials(filteredMat);

        const machinesList = Array.isArray(machineRes.data) ? machineRes.data : (machineRes.data?.data || []);
        setMachines(machinesList);
        setBoms(bomRes.data?.data || []);
        setJobParties(jobPartiesRes.data?.data || []);

        // Start with one empty row
        setItems([{
          material_id: "",
          material_name: "",
          material_code: "",
          quantity: 1,
          production_quantity: 1,
          exp_delivery_date: "",
          batch_no: "",
          actual_delivery_date: "",
          remarks: "",
          machine_id: "",
          job_party_id: ""
        }]);
      } catch (err) {
        console.error("Failed to load initial data", err);
        toast.error("Failed to initialize creation screen");
      }
    };
    fetchInitialData();
  }, []);

  const handleMaterialChange = (index, materialId) => {
    const updated = [...items];
    const material = materials.find(m => String(m.id) === String(materialId));

    updated[index] = {
      ...updated[index],
      material_id: materialId,
      material_name: material ? material.material_name : "",
      material_code: material ? material.material_code : "",
      machine_id: "",
      job_party_id: "",
      exp_delivery_date: "",
      batch_no: "",
      actual_delivery_date: "",
      remarks: ""
    };
    setItems(updated);
  };

  const handleQtyChange = (index, qty) => {
    const updated = [...items];
    updated[index].quantity = Number(qty);
    updated[index].production_quantity = Number(qty); // default prod qty to total qty
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, {
      material_id: "",
      material_name: "",
      material_code: "",
      quantity: 1,
      production_quantity: 1,
      exp_delivery_date: "",
      batch_no: "",
      actual_delivery_date: "",
      remarks: "",
      machine_id: "",
      job_party_id: ""
    }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    } else {
      toast.error("Work order must have at least one item");
    }
  };

  const openEditModal = (index) => {
    setCurrentEditIndex(index);
    setModalData({
      quantity: items[index].quantity,
      production_quantity: items[index].production_quantity,
      exp_delivery_date: items[index].exp_delivery_date || "",
      batch_no: items[index].batch_no || "",
      actual_delivery_date: items[index].actual_delivery_date || "",
      remarks: items[index].remarks || "",
      machine_id: items[index].machine_id || "",
      job_party_id: items[index].job_party_id || ""
    });
    setShowModal(true);
  };

  const saveModalData = () => {
    const updated = [...items];
    updated[currentEditIndex] = {
      ...updated[currentEditIndex],
      ...modalData,
      quantity: Number(modalData.quantity),
      production_quantity: Number(modalData.production_quantity)
    };
    setItems(updated);
    setShowModal(false);
    toast.success("Row details updated");
  };

  useEffect(() => {
    // Fetch next slot
    const fetchSlot = async () => {
      if (modalData.machine_id) {
        try {
          const res = await getNextFreeSlot(modalData.machine_id);
          if (res.data.data) {
             setNextSlotInfo(res.data.data);
          } else {
             setNextSlotInfo({ notConfigured: true });
          }
        } catch (err) {
          console.error(err);
          setNextSlotInfo({ error: true });
        }
      } else {
        setNextSlotInfo(null);
      }
    };
    fetchSlot();
  }, [modalData.machine_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }
    const hasInvalid = items.some(it => !it.material_id || Number(it.quantity) <= 0);
    if (hasInvalid) {
      toast.error("Please select materials and quantities for all rows");
      return;
    }
    fetchConfirmSlots();
    setShowConfirmModal(true);
  };

  const submitWorkOrder = async () => {
    setLoading(true);
    try {
      const payload = {
        customer_id: Number(selectedCustomerId),
        work_order_date: workOrderDate,
        items: items.map((it) => ({
          material_id: Number(it.material_id),
          quantity: Number(it.quantity),
          production_quantity: Number(it.production_quantity),
          exp_delivery_date: it.exp_delivery_date || null,
          batch_no: it.batch_no || null,
          actual_delivery_date: it.actual_delivery_date || null,
          remarks: it.remarks || null,
          machine_id: it.machine_id ? Number(it.machine_id) : null,
          job_party_id: it.job_party_id ? Number(it.job_party_id) : null
        }))
      };

      await createWorkOrder(payload);
      toast.success("Work Order created successfully!");
      setShowConfirmModal(false);
      navigate("/sales/work-orders");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create work order");
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => String(c.id) === String(selectedCustomerId));

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
      <Navbar title="ERP Admin" />
      <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Create Work Order
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create a direct work order by selecting a customer and configuring items.
            </p>
          </div>
          <button
            onClick={() => navigate("/sales/work-orders")}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Header details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-file-invoice text-[#369ACF]"></i>
              Header Info
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Work Order No.
                </label>
                <input
                  type="text"
                  value={nextWONo}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={workOrderDate}
                  onChange={(e) => setWorkOrderDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} ({c.customer_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card: Item Rows */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-boxes-stacked text-[#369ACF]"></i>
                Work Order Items
              </h2>
              <button
                type="button"
                onClick={addItemRow}
                className="text-sm font-semibold text-[#369ACF] hover:text-[#2583b4] flex items-center gap-1 cursor-pointer"
              >
                <i className="fa-solid fa-plus text-xs"></i> Add Item Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 min-w-[250px]">Material Details *</th>
                    <th className="px-6 py-3.5 w-32 text-right">Quantity *</th>
                    <th className="px-6 py-3.5 w-32 text-right">Prod Qty</th>
                    <th className="px-6 py-3.5">Machine</th>
                    <th className="px-6 py-3.5">Exp Deliv.</th>
                    <th className="px-6 py-3.5">Batch No</th>
                    <th className="px-6 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {items.map((item, idx) => {
                    const machineName = machines.find(m => String(m.id) === String(item.machine_id))?.name || "";

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <select
                            value={item.material_id}
                            onChange={(e) => handleMaterialChange(idx, e.target.value)}
                            required
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                          >
                            <option value="">Select Material</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.material_name} ({m.material_code})</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <input
                            type="number"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            required
                            className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-right text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 text-right text-indigo-600 font-semibold">
                          {item.production_quantity}
                        </td>
                        <td className="px-6 py-4">
                          {machineName ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">
                              <i className="fa-solid fa-industry text-slate-400"></i>
                              {machineName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Not Set</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {item.exp_delivery_date ? formatDate(item.exp_delivery_date) : <span className="text-slate-400 italic">Not Set</span>}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {item.batch_no || <span className="text-slate-400 italic">Not Set</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(idx)}
                              disabled={!item.material_id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer disabled:opacity-50"
                              title="Edit Setup Details"
                            >
                              <i className="fa-solid fa-gears text-sm"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-250 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              title="Delete Row"
                            >
                              <i className="fa-solid fa-trash-can text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
              >
                Save Work Order
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Row Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-[#369ACF]"></i>
                Configure Item Production Details
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Material Name
                </label>
                <input
                  type="text"
                  value={items[currentEditIndex]?.material_name}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Job of Party
                </label>
                <select
                  value={modalData.job_party_id || ""}
                  onChange={(e) => setModalData({ ...modalData, job_party_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- None --</option>
                  {jobParties.map((jp) => (
                    <option key={jp.id} value={jp.id}>
                      {jp.party_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={modalData.quantity}
                    onChange={(e) => setModalData({ ...modalData, quantity: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Production Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={modalData.production_quantity}
                    onChange={(e) => setModalData({ ...modalData, production_quantity: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Exp. Delivery Date
                  </label>
                  <DateInput
                    value={modalData.exp_delivery_date}
                    onChange={(e) => setModalData({ ...modalData, exp_delivery_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter batch number"
                    value={modalData.batch_no}
                    onChange={(e) => setModalData({ ...modalData, batch_no: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Machine Selection
                    </label>
                    <select
                      value={modalData.machine_id}
                      onChange={(e) => setModalData({ ...modalData, machine_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None --</option>
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Actual Delivery Date
                  </label>
                  <DateInput
                    value={modalData.actual_delivery_date}
                    onChange={(e) => setModalData({ ...modalData, actual_delivery_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="Enter remarks"
                    value={modalData.remarks}
                    onChange={(e) => setModalData({ ...modalData, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Informational Section for Scheduling */}
              {nextSlotInfo !== null && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                          <i className="fa-regular fa-calendar-check w-4 text-indigo-800"></i>
                          <span className="font-semibold text-indigo-800">Machine next available:</span> 
                          {nextSlotInfo.error ? (
                              <span className="text-red-600">Failed to fetch availability</span>
                          ) : nextSlotInfo.notConfigured ? (
                              <span className="text-red-600 font-bold">Unconfigured Working Hours (Cannot Schedule)</span>
                          ) : (
                              <span className="text-indigo-800">
                                  {formatDate(nextSlotInfo.date)} from Hour {parseFloat(nextSlotInfo.start_hour).toFixed(1)}
                              </span>
                          )}
                      </div>
                  </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveModalData}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-file-contract text-[#369ACF]"></i>
                  Confirm Work Order Creation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review header info and configured items before final submission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Info Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Work Order Number
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-800 mt-1 block">
                    {nextWONo}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Work Order Date
                  </span>
                  <span className="text-sm font-semibold text-slate-800 mt-1 block">
                    {workOrderDate ? formatDate(workOrderDate) : "—"}
                  </span>
                </div>
                 <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Customer
                  </span>
                  <span className="text-sm font-semibold text-slate-800 mt-1 block">
                    {selectedCustomer.customer_name} ({selectedCustomer.customer_code || "—"})
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-boxes-stacked text-slate-400"></i>
                  Configured Items ({items.length})
                </h4>

                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3">Material Details</th>
                          <th className="px-5 py-3 text-right">Quantity</th>
                          <th className="px-5 py-3 text-right">Prod Qty</th>
                          <th className="px-5 py-3">Machine</th>
                          <th className="px-5 py-3">BOM Raw Material</th>
                          <th className="px-5 py-3 text-right">RM Required</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {items.map((it, idx) => {
                          const matchingBOM = boms.find(b => b.material_id === Number(it.material_id));
                          const productWeight = matchingBOM ? Number(matchingBOM.product_weight) : 0;
                          const rmRequired = (productWeight * Number(it.quantity)).toFixed(3);
                          const rawMatLabel = matchingBOM?.raw_material_label || "N/A";
                          const machineName = machines.find(m => String(m.id) === String(it.machine_id))?.name || "Not Selected";

                          return (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="px-5 py-3">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-900">{it.material_name}</span>
                                  <span className="text-xs text-slate-500 font-mono mt-0.5">{it.material_code}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right text-slate-900 font-bold">{it.quantity}</td>
                              <td className="px-5 py-3 text-right text-indigo-650 font-bold">{it.production_quantity}</td>
                              <td className="px-5 py-3">{machineName}</td>
                              <td className="px-5 py-3 text-xs text-slate-655">{rawMatLabel}</td>
                              <td className="px-5 py-3 text-right font-mono text-xs text-slate-800">
                                {matchingBOM ? `${rmRequired} kg` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={submitWorkOrder}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-colors cursor-pointer"
              >
                {loading ? "Creating..." : "Confirm & Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
