import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import { createWorkOrder, getNextWorkOrderNo } from "../../../api/workOrderApi";
import { getAllSalesOrders, getSalesOrderById } from "../../../api/salesOrderApi";
import { getAllMoulds } from "../../../api/mouldApi";
import { getAllMachines } from "../../../api/machineApi";
import { getNextFreeSlot } from "../../../api/machineScheduleApi";
import { getBOMs } from "../../../api/bomApi";
import { getJobParties } from "../../../api/jobPartyApi";
import toast from "react-hot-toast";
import MachineMouldPlanner from "../../../components/MachineMouldPlanner";
import DateInput from "../../../components/DateInput";

export default function CreateWorkOrder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nextWONo, setNextWONo] = useState("");
  const [salesOrders, setSalesOrders] = useState([]);
  const [moulds, setMoulds] = useState([]);
  const [machines, setMachines] = useState([]);

  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const [boms, setBoms] = useState([]);
  const [jobParties, setJobParties] = useState([]);

  // Form states
  const [selectedSOId, setSelectedSOId] = useState("");
  const [selectedSO, setSelectedSO] = useState(null);
  const [workOrderDate, setWorkOrderDate] = useState(new Date().toISOString().substring(0, 10));
  const [items, setItems] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Modal states for row edit
  const [showModal, setShowModal] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(null);
  const [modalData, setModalData] = useState({
    quantity: 0,
    production_quantity: 0,
    exp_delivery_date: "",
    batch_no: "",
    actual_delivery_date: "",
    remarks: "",
    mould_id: "",
    machine_id: "",
    job_party_id: ""
  });
  const [estProdTime, setEstProdTime] = useState(null);
  const [nextSlotInfo, setNextSlotInfo] = useState(null);
  const [confirmSlots, setConfirmSlots] = useState({});

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

        const soRes = await getAllSalesOrders();
        // Filter to only approved sales orders
        const approvedSOs = (soRes.data.data || []).filter(
          (so) => so.status === "approved"
        );
        setSalesOrders(approvedSOs);

        const mouldRes = await getAllMoulds();
        setMoulds(mouldRes.data || []);

        const machineRes = await getAllMachines();
        setMachines(machineRes.data || []);

        const bomRes = await getBOMs();
        setBoms(bomRes.data?.data || []);

        const jobPartiesRes = await getJobParties();
        setJobParties(jobPartiesRes.data?.data || []);
      } catch (err) {
        console.error("Failed to load initial data", err);
        toast.error("Failed to initialize creation screen");
      }
    };
    fetchInitialData();
  }, []);

  const handleSOChange = async (soId) => {
    setSelectedSOId(soId);
    if (!soId) {
      setSelectedSO(null);
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const res = await getSalesOrderById(soId);
      const soDetails = res.data;
      setSelectedSO(soDetails);

      // Prepopulate items automatically as requested
      const mappedItems = (soDetails.items || []).map((item) => {
        const matchingBOM = boms.find(b => b.material_id === item.material_id);
        return {
          sales_order_item_id: item.id,
          material_id: item.material_id,
          material_name: item.material_name || "Unknown Material",
          material_code: item.material_code || "",
          customer_code: soDetails.customer_code || soDetails.customer_id,
          quantity: Number(item.quantity),
          production_quantity: Number(item.quantity), // default to item qty
          exp_delivery_date: "",
          batch_no: "",
          actual_delivery_date: "",
          remarks: "",
          mould_id: matchingBOM ? (matchingBOM.mould_ids ? String(matchingBOM.mould_ids).split(',')[0] : (matchingBOM.mould_id || "")) : "",
          machine_id: "",
          job_party_id: ""
        };
      });
      setItems(mappedItems);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch sales order details");
    } finally {
      setLoading(false);
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
      mould_id: items[index].mould_id || "",
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
    // Calculate estimated time
    if (modalData.mould_id && modalData.quantity) {
      const mould = moulds.find(m => String(m.id) === String(modalData.mould_id));
      if (mould && mould.cavity && mould.std_cycle_time) {
        const totalSecs = modalData.quantity * (mould.std_cycle_time / mould.cavity);
        const totalHours = totalSecs / 3600;
        setEstProdTime(totalHours);
      } else {
        setEstProdTime(null);
      }
    } else {
      setEstProdTime(null);
    }
  }, [modalData.mould_id, modalData.quantity, moulds]);

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
    if (!selectedSOId) {
      toast.error("Please select a sales order");
      return;
    }
    fetchConfirmSlots();
    setShowConfirmModal(true);
  };

  const submitWorkOrder = async () => {
    setLoading(true);
    try {
      const payload = {
        sales_order_id: selectedSO.id,
        work_order_date: workOrderDate,
        items: items.map((it) => ({
          sales_order_item_id: it.sales_order_item_id,
          quantity: it.quantity,
          production_quantity: it.production_quantity,
          exp_delivery_date: it.exp_delivery_date || null,
          batch_no: it.batch_no || null,
          actual_delivery_date: it.actual_delivery_date || null,
          remarks: it.remarks || null,
          mould_id: it.mould_id ? Number(it.mould_id) : null,
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

  const selectedMouldObj = moulds.find(m => String(m.id) === String(modalData.mould_id));
  const compatibleMachineIds = selectedMouldObj?.machine_ids ? selectedMouldObj.machine_ids.split(',').map(Number) : [];
  const filteredMachines = modalData.mould_id
    ? machines.filter(m => compatibleMachineIds.includes(m.id))
    : [];

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
              Select an approved sales order to auto-populate items and configure production details.
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
              <i className="fa-solid fa-file-invoice text-indigo-500"></i>
              Header Info
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  Approved Sales Order <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSOId}
                  onChange={(e) => handleSOChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Sales Order --</option>
                  {salesOrders.map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.sales_order_id} ({so.customer_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={selectedSO ? selectedSO.customer_name : ""}
                  placeholder="Prefilled from Sales Order"
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Card: Item Rows */}
          {selectedSO && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-boxes-stacked text-indigo-500"></i>
                  Sales Order Items
                </h2>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {items.length} Items Listed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Material Details</th>
                      <th className="px-6 py-3.5">Customer Number</th>
                      <th className="px-6 py-3.5">Job of Party</th>
                      <th className="px-6 py-3.5 text-right">Quantity</th>
                      <th className="px-6 py-3.5 text-right">Prod Qty</th>
                      <th className="px-6 py-3.5">Mould</th>
                      <th className="px-6 py-3.5">Machine</th>
                      <th className="px-6 py-3.5">Exp Deliv.</th>
                      <th className="px-6 py-3.5">Batch No</th>
                      <th className="px-6 py-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {items.map((item, idx) => {
                      const mouldName = moulds.find(m => String(m.id) === String(item.mould_id))?.mould_name || "";
                      const machineName = machines.find(m => String(m.id) === String(item.machine_id))?.name || "";

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{item.material_name}</span>
                              <span className="text-xs text-slate-500 font-mono mt-0.5">{item.material_code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                            {selectedSO.customer_code || selectedSO.customer_name}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                            {jobParties.find(jp => String(jp.id) === String(item.job_party_id))?.party_name || <span className="text-slate-400 italic text-xs">Not Set</span>}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-950">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-right text-indigo-600 font-semibold">
                            {item.production_quantity}
                          </td>
                          <td className="px-6 py-4">
                            {mouldName ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">
                                <i className="fa-solid fa-shapes text-slate-400"></i>
                                {mouldName}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Not Set</span>
                            )}
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
                            <button
                              type="button"
                              onClick={() => openEditModal(idx)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                              title="Edit Row Details"
                            >
                              <i className="fa-solid fa-plus text-sm"></i>
                            </button>
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
                  {loading ? "Saving..." : "Save Work Order"}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>

      {/* Row Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-indigo-500"></i>
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
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Mould & Machine Selection
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPlanner(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    <i className="fa-solid fa-calendar-days"></i>
                    Open Planner Modal
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Select Mould
                    </label>
                  <select
                    value={modalData.mould_id}
                    onChange={(e) => {
                      const newMouldId = e.target.value;
                      const selMould = moulds.find(m => String(m.id) === String(newMouldId));
                      const linkedMachineIds = selMould?.machine_ids ? selMould.machine_ids.split(',').map(Number) : [];
                      let newMachineId = modalData.machine_id;
                      if (newMouldId && newMachineId && !linkedMachineIds.includes(Number(newMachineId))) {
                        newMachineId = "";
                      }
                      setModalData({ ...modalData, mould_id: newMouldId, machine_id: newMachineId });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- None --</option>
                    {(() => {
                      const itemMaterialId = items[currentEditIndex]?.material_id;
                      const matchingBOM = boms.find(b => b.material_id === itemMaterialId);
                      let allowedMoulds = moulds;
                      if (matchingBOM && (matchingBOM.mould_ids || matchingBOM.mould_id)) {
                        const compatibleIds = matchingBOM.mould_ids 
                          ? String(matchingBOM.mould_ids).split(',').map(Number) 
                          : [Number(matchingBOM.mould_id)];
                        allowedMoulds = moulds.filter(m => compatibleIds.includes(m.id));
                      }
                      return allowedMoulds.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.mould_name}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Machine
                  </label>
                  <select
                    value={modalData.machine_id}
                    onChange={(e) => setModalData({ ...modalData, machine_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- None --</option>
                    {filteredMachines.map((m) => (
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
              {(estProdTime !== null || nextSlotInfo !== null) && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-2 mt-4">
                      {estProdTime !== null && (
                          <div className="flex items-center gap-2 text-sm text-indigo-800">
                              <i className="fa-regular fa-clock w-4"></i>
                              <span className="font-semibold">Est. Production Time:</span> 
                              {Math.floor(estProdTime)} hrs {Math.round((estProdTime % 1) * 60)} mins
                          </div>
                      )}
                      {nextSlotInfo !== null && (
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
                      )}
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

      {showConfirmModal && selectedSO && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-file-contract text-indigo-500"></i>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
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
                    {selectedSO.customer_name} ({selectedSO.customer_code || "—"})
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Sales Order ID
                  </span>
                  <span className="text-sm font-mono font-bold text-indigo-650 mt-1 block">
                    {selectedSO.sales_order_id}
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
                          <th className="px-5 py-3">Mould & Machine</th>
                          <th className="px-5 py-3">Job of Party</th>
                          <th className="px-5 py-3">BOM Raw Material</th>
                          <th className="px-5 py-3 text-right">RM Required</th>
                          <th className="px-5 py-3 text-right">Prod Hours</th>
                          <th className="px-5 py-3">Planned Start Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {items.map((item, idx) => {
                          const mouldName = moulds.find(m => String(m.id) === String(item.mould_id))?.mould_name || "—";
                          const machineName = machines.find(m => String(m.id) === String(item.machine_id))?.name || "—";
                          
                          const itemBOM = boms.find(b => b.material_id === item.material_id);
                          const rawMaterialName = itemBOM?.raw_material_label || "No BOM Configured";
                          const productWeight = itemBOM ? Number(itemBOM.product_weight) : 0;
                          const rmRequired = (productWeight * item.quantity).toFixed(3);

                          const itemMould = moulds.find(m => String(m.id) === String(item.mould_id));
                          let itemProdHrs = 0;
                          if (itemMould && itemMould.cavity && itemMould.std_cycle_time) {
                            itemProdHrs = (item.quantity * (itemMould.std_cycle_time / itemMould.cavity)) / 3600;
                          }
                          const prodHoursFormatted = itemProdHrs > 0 
                            ? `${itemProdHrs.toFixed(2)} hrs`
                            : "N/A";

                          const slotInfo = confirmSlots[item.machine_id];
                          let startSlotStr = "N/A";
                          if (item.machine_id) {
                            if (slotInfo) {
                              if (slotInfo.notConfigured) {
                                startSlotStr = "Unconfigured Hours";
                              } else if (slotInfo.date) {
                                startSlotStr = `${formatDate(slotInfo.date)} (Hr ${parseFloat(slotInfo.start_hour).toFixed(1)})`;
                              }
                            } else {
                              startSlotStr = "Loading...";
                            }
                          }

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-900">{item.material_name}</span>
                                  <span className="text-xs text-slate-500 font-mono mt-0.5">{item.material_code}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                                {Number(item.quantity).toFixed(3)}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-indigo-650">
                                {Number(item.production_quantity).toFixed(3)}
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-700">
                                <div className="flex flex-col gap-0.5">
                                  <span><span className="text-slate-400">Mould:</span> {mouldName}</span>
                                  <span><span className="text-slate-400">Machine:</span> {machineName}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-700 font-semibold">
                                {jobParties.find(jp => String(jp.id) === String(item.job_party_id))?.party_name || "—"}
                              </td>
                              <td className="px-5 py-3.5 max-w-[150px] truncate text-slate-800" title={rawMaterialName}>
                                {rawMaterialName}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                                {itemBOM ? `${rmRequired} kg` : "—"}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                                {prodHoursFormatted}
                              </td>
                              <td className="px-5 py-3.5 font-semibold text-slate-800">
                                {startSlotStr}
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

      <MachineMouldPlanner
        isOpen={showPlanner}
        onClose={() => setShowPlanner(false)}
        onConfirm={(mouldId, machineId) => {
          setModalData(prev => ({ ...prev, mould_id: mouldId, machine_id: machineId }));
        }}
        materialId={items[currentEditIndex]?.material_id}
        materialName={items[currentEditIndex]?.material_name}
        quantity={modalData.quantity}
        initialMouldId={modalData.mould_id}
        initialMachineId={modalData.machine_id}
        boms={boms}
        moulds={moulds}
        machines={machines}
      />
    </div>
  );
}
