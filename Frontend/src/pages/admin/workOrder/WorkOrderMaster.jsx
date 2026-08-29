import { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { getAllWorkOrders, createWorkOrder, deleteWorkOrder, getMaterialStock, getNextWorkOrderNo } from "../../../api/workOrderApi";
import { getAllMoulds } from "../../../api/mouldApi";
import { getAllMachines } from "../../../api/machineApi";
import { getBOMs } from "../../../api/bomApi";
import { getNextFreeSlot } from "../../../api/machineScheduleApi";
import { getJobParties } from "../../../api/jobPartyApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import DateInput from "../../../components/DateInput";
import { usePermission } from "../../../context/PermissionContext";
import WorkOrderViewModal from "./WorkOrderViewModal";
import MachineMouldPlanner from "../../../components/MachineMouldPlanner";
import { useNavigate } from "react-router-dom";

export default function WorkOrderMaster() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [moulds, setMoulds] = useState([]);
  const [machines, setMachines] = useState([]);
  const [boms, setBoms] = useState([]);
  const [jobParties, setJobParties] = useState([]);
  const [error, setError] = useState("");
  const [availableStock, setAvailableStock] = useState(0);
  
  // Modal states for row configuration
  const [showModal, setShowModal] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [nextWONo, setNextWONo] = useState("");
  const [estProdTime, setEstProdTime] = useState(null);
  const [nextSlotInfo, setNextSlotInfo] = useState(null);
  const [currentConfigureItem, setCurrentConfigureItem] = useState(null);

  // View modal state
  const [viewWorkOrderId, setViewWorkOrderId] = useState(null);
  const [modalData, setModalData] = useState({
    work_order_date: new Date().toISOString().substring(0, 10),
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

  const { hasPermission } = usePermission();

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllWorkOrders();
      setItems(res.data.data || []);
      
      const mouldRes = await getAllMoulds();
      const mouldsList = Array.isArray(mouldRes.data) ? mouldRes.data : (mouldRes.data?.data || []);
      setMoulds(mouldsList);

      const machineRes = await getAllMachines();
      const machinesList = Array.isArray(machineRes.data) ? machineRes.data : (machineRes.data?.data || []);
      setMachines(machinesList);

      const bomRes = await getBOMs();
      const bomsList = bomRes.data?.data || [];
      setBoms(bomsList);

      const jobPartiesRes = await getJobParties();
      const jobPartiesList = jobPartiesRes.data?.data || [];
      setJobParties(jobPartiesList);
    } catch (err) {
      console.error("Failed to load work order items", err);
      setError("Unable to load work order items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openConfigureModal = async (row) => {
    setCurrentConfigureItem(row);
    const matchingBOM = boms.find(b => b.material_id === row.material_id);
    setModalData({
      work_order_date: new Date().toISOString().substring(0, 10),
      quantity: row.so_quantity,
      production_quantity: row.so_quantity, // default to SO quantity
      exp_delivery_date: "",
      batch_no: "",
      actual_delivery_date: "",
      remarks: "",
      mould_id: row.mould_id || (matchingBOM ? matchingBOM.mould_id || "" : ""),
      machine_id: row.machine_id || "",
      job_party_id: row.job_party_id || ""
    });
    setAvailableStock(0);
    setShowModal(true);

    try {
      if (row.material_id) {
        const stockRes = await getMaterialStock(row.material_id);
        setAvailableStock(stockRes.data.stock || 0);
      }
    } catch (err) {
      console.error("Failed to fetch material stock balance", err);
      toast.error("Failed to fetch material stock balance");
    }

    try {
      const noRes = await getNextWorkOrderNo();
      setNextWONo(`WO-${String(noRes.data.nextNo).padStart(4, "0")}`);
    } catch (err) {
      console.error("Failed to fetch next WO number", err);
    }
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

  const handleSaveConfiguration = (e) => {
    e.preventDefault();
    if (!currentConfigureItem) return;

    const orderedQty = Number(currentConfigureItem.so_quantity);
    const plannedProdQty = Number(modalData.production_quantity);
    const stockQty = Number(availableStock);

    if (orderedQty > (stockQty + plannedProdQty)) {
      toast.error(`Error: Ordered Quantity (${orderedQty}) exceeds Available Stock (${stockQty}) + Production Quantity (${plannedProdQty})!`);
      return;
    }

    setShowConfirmModal(true);
  };

  const submitWorkOrderConfiguration = async () => {
    if (!currentConfigureItem) return;
    setLoading(true);
    try {
      const payload = {
        sales_order_id: currentConfigureItem.sales_order_id,
        work_order_date: modalData.work_order_date,
        item: {
          sales_order_item_id: currentConfigureItem.sales_order_item_id,
          quantity: Number(modalData.quantity),
          production_quantity: Number(modalData.production_quantity),
          exp_delivery_date: modalData.exp_delivery_date || null,
          batch_no: modalData.batch_no || null,
          actual_delivery_date: modalData.actual_delivery_date || null,
          remarks: modalData.remarks || null,
          mould_id: modalData.mould_id ? Number(modalData.mould_id) : null,
          machine_id: modalData.machine_id ? Number(modalData.machine_id) : null,
          job_party_id: modalData.job_party_id ? Number(modalData.job_party_id) : null
        }
      };

      await createWorkOrder(payload);
      toast.success("Work Order created successfully");
      setShowConfirmModal(false);
      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create work order");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this work order details? It will reset the item to pending status.")) return;
    try {
      await deleteWorkOrder(id);
      toast.success("Work order details deleted");
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete work order");
    }
  };

  const columns = useMemo(() => {
    const cols = [
      {
        key: "work_order_no",
        label: "Work Order No.",
        minWidth: "150px",
        render: row => row.work_order_no ? (
          <span className="font-semibold text-slate-800">
            WO-{String(row.work_order_no).padStart(4, '0')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded border border-amber-200 bg-amber-50 text-amber-700">
            Pending Setup
          </span>
        )
      },
      {
        key: "work_order_date",
        label: "Date",
        minWidth: "120px",
        render: row => {
          const formatDate = (d) => {
            if (!d) return "";
            const date = new Date(d);
            if (isNaN(date.getTime())) return "";
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          };
          return row.work_order_date ? formatDate(row.work_order_date) : <span className="text-slate-400 italic">Pending</span>;
        }
      },
      {
        key: "material_name",
        label: "Material Details",
        minWidth: "220px",
        render: row => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{row.material_name}</span>
            <span className="text-xs text-slate-500 font-mono mt-0.5">{row.material_code}</span>
          </div>
        )
      },
      {
        key: "customer_name",
        label: "Customer Details",
        minWidth: "220px",
        render: row => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{row.customer_name}</span>
            <span className="text-xs text-slate-500 font-mono mt-0.5">{row.customer_code}</span>
          </div>
        )
      },
      {
        key: "job_party_name",
        label: "Job of Party",
        minWidth: "180px",
        render: row => row.job_party_name ? (
          <span className="font-semibold text-slate-800">{row.job_party_name}</span>
        ) : (
          <span className="text-slate-400 italic">Not Configured</span>
        )
      },
      {
        key: "sales_order_code",
        label: "Sales Order ID",
        minWidth: "150px",
        render: row => <span className="font-mono text-xs font-semibold text-indigo-600">{row.sales_order_code}</span>
      },
      {
        key: "so_quantity",
        label: "S.O. Qty",
        minWidth: "100px",
        render: row => <span className="font-semibold text-slate-700">{row.so_quantity}</span>
      },
      {
        key: "production_quantity",
        label: "Prod Qty",
        minWidth: "100px",
        render: row => row.production_quantity !== null ? (
          <span className="font-semibold text-indigo-700">{row.production_quantity}</span>
        ) : (
          <span className="text-slate-400 italic">Pending</span>
        )
      },
      {
        key: "mould_name",
        label: "Mould",
        minWidth: "120px",
        render: row => row.mould_name ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
            {row.mould_name}
          </span>
        ) : (
          <span className="text-slate-400 italic">Not Set</span>
        )
      },
      {
        key: "machine_name",
        label: "Machine",
        minWidth: "120px",
        render: row => row.machine_name ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
            {row.machine_name}
          </span>
        ) : (
          <span className="text-slate-400 italic">Not Set</span>
        )
      }
    ];

    const canWrite = hasPermission("work_order", "write");
    const canDelete = hasPermission("work_order", "delete");
    const canUpdate = hasPermission("work_order", "update");

    cols.push({
      key: "actions",
      label: "Actions",
      sortable: false,
      minWidth: "140px",
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* View Work Order Details */}
          {row.work_order_no && (
            <button
              onClick={() => setViewWorkOrderId(row.work_order_id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 cursor-pointer"
              title="View Work Order Details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          {/* Edit Work Order */}
          {row.work_order_no && canUpdate && (
            <button
              onClick={() => navigate(`/sales/work-orders/edit/${row.work_order_id}`)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer"
              title="Edit Work Order"
            >
              <i className="fa-solid fa-pencil text-xs"></i>
            </button>
          )}

          {/* Configure/Create Work Order */}
          {!row.work_order_no && canWrite && (
            <button
              onClick={() => openConfigureModal(row)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
              title="Configure Work Order"
            >
              <i className="fa-solid fa-plus text-sm"></i>
            </button>
          )}

          {/* Delete Work Order */}
          {row.work_order_no && canDelete && (
            <button
              onClick={() => handleDelete(row.work_order_id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
              title="Reset Work Order"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z"
                />
              </svg>
            </button>
          )}
        </div>
      )
    });

    return cols;
  }, [hasPermission]);

  const selectedMouldObj = moulds.find(m => String(m.id) === String(modalData.mould_id));
  const compatibleMachineIds = selectedMouldObj?.machine_ids ? selectedMouldObj.machine_ids.split(',').map(Number) : [];
  const filteredMachines = modalData.mould_id
    ? machines.filter(m => compatibleMachineIds.includes(m.id))
    : [];

  const selectedMachineObj = machines.find(m => String(m.id) === String(modalData.machine_id));
  const selectedMachineName = selectedMachineObj ? selectedMachineObj.name : "Not Selected";

  const selectedMouldObjForConfirm = moulds.find(m => String(m.id) === String(modalData.mould_id));
  const selectedMouldName = selectedMouldObjForConfirm ? selectedMouldObjForConfirm.mould_name : "Not Selected";

  const matchingBOM = currentConfigureItem ? boms.find(b => b.material_id === currentConfigureItem.material_id) : null;
  const rawMaterialName = matchingBOM?.raw_material_label || "No Raw Material configured in BOM";
  const productWeight = matchingBOM ? Number(matchingBOM.product_weight) : 0;
  const rmRequired = (productWeight * Number(modalData.quantity)).toFixed(3);

  let plannedStartDateStr = "N/A";
  if (nextSlotInfo) {
    if (nextSlotInfo.error) {
      plannedStartDateStr = "Failed to fetch availability";
    } else if (nextSlotInfo.notConfigured) {
      plannedStartDateStr = "Unconfigured Working Hours";
    } else if (nextSlotInfo.date) {
      const formatDate = (d) => {
        if (!d) return "";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };
      plannedStartDateStr = `${formatDate(nextSlotInfo.date)} (Hour ${parseFloat(nextSlotInfo.start_hour).toFixed(1)})`;
    }
  }

  const productionHoursFormatted = estProdTime !== null 
    ? `${estProdTime.toFixed(2)} hrs (${Math.floor(estProdTime)}h ${Math.round((estProdTime % 1) * 60)}m)`
    : "N/A";

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
      <Navbar title="ERP Admin" />
      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg mb-6 font-medium text-sm">
            {error}
          </div>
        )}

        <DataTable
          tableId="work_order_master"
          title="Work Orders (Approved Sales Order Items)"
          data={items}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search materials, customers or order codes..."
        />
      </main>

      {/* Row Configuration Modal */}
      {showModal && currentConfigureItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form onSubmit={handleSaveConfiguration} className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-gears text-indigo-500"></i>
                  Configure Work Order Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  For: {currentConfigureItem.material_name} ({currentConfigureItem.sales_order_code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Premium Stock & Calculation Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 shrink-0">
                <div className="bg-white border border-slate-150 rounded-lg p-3 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ordered Quantity</span>
                  <span className="text-lg font-bold text-slate-800 mt-0.5 block">{Number(currentConfigureItem.so_quantity).toFixed(3)} units</span>
                </div>
                <div className="bg-white border border-slate-150 rounded-lg p-3 shadow-sm">
                  <span className="text-xs font-bold text-teal-500 uppercase tracking-wider block">Available Stock Balance</span>
                  <span className="text-lg font-bold text-teal-700 mt-0.5 block">{Number(availableStock).toFixed(3)} units</span>
                </div>
                <div className="bg-white border border-slate-150 rounded-lg p-3 shadow-sm">
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block">Planned Production</span>
                  <span className="text-lg font-bold text-indigo-700 mt-0.5 block">{Number(modalData.production_quantity || 0).toFixed(3)} units</span>
                </div>
              </div>

              {/* Dynamic Capacity Verification Alert */}
              {Number(currentConfigureItem.so_quantity) > (Number(availableStock) + Number(modalData.production_quantity || 0)) && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-start gap-2.5 text-xs font-semibold shrink-0">
                  <i className="fa-solid fa-circle-exclamation text-rose-500 text-sm mt-0.5"></i>
                  <div>
                    Ordered Quantity ({Number(currentConfigureItem.so_quantity).toFixed(3)}) exceeds Available Stock ({Number(availableStock).toFixed(3)}) + Production Quantity ({Number(modalData.production_quantity || 0).toFixed(3)}). Please increase Planned Production or verify stock.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Work Order Date <span className="text-red-500">*</span>
                  </label>
                  <DateInput
                    value={modalData.work_order_date}
                    onChange={(e) => setModalData({ ...modalData, work_order_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Customer Number
                  </label>
                  <input
                    type="text"
                    value={currentConfigureItem.customer_code || currentConfigureItem.customer_name}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      const itemMaterialId = currentConfigureItem?.material_id;
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
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-colors cursor-pointer"
              >
                {loading ? "Saving..." : "Configure Work Order"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showConfirmModal && currentConfigureItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-file-invoice text-indigo-500"></i>
                  Confirm Work Order Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify the configured details before creating the work order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Content (Form style with disabled inputs) */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Work Order Number
                  </label>
                  <input
                    type="text"
                    value={nextWONo || "Generating..."}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Work Order Date
                  </label>
                  <input
                    type="text"
                    value={(() => {
                      if (!modalData.work_order_date) return "—";
                      const date = new Date(modalData.work_order_date);
                      if (isNaN(date.getTime())) return "—";
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    })()}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Customer
                  </label>
                  <input
                    type="text"
                    value={`${currentConfigureItem.customer_name} (${currentConfigureItem.customer_code || "—"})`}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Job of Party
                  </label>
                  <input
                    type="text"
                    value={jobParties.find(jp => String(jp.id) === String(modalData.job_party_id))?.party_name || "—"}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Material
                  </label>
                  <input
                    type="text"
                    value={`${currentConfigureItem.material_name} (${currentConfigureItem.material_code})`}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Order Quantity
                  </label>
                  <input
                    type="text"
                    value={`${Number(modalData.quantity).toFixed(3)} units`}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Production Quantity
                  </label>
                  <input
                    type="text"
                    value={`${Number(modalData.production_quantity).toFixed(3)} units`}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed font-semibold text-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Mould
                  </label>
                  <input
                    type="text"
                    value={selectedMouldName}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Selected Machine
                  </label>
                  <input
                    type="text"
                    value={selectedMachineName}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Raw Material to be used
                  </label>
                  <input
                    type="text"
                    value={rawMaterialName}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    RM Required (product weight * Qty)
                  </label>
                  <input
                    type="text"
                    value={matchingBOM ? `${rmRequired} kg (${productWeight.toFixed(4)} kg/unit * ${Number(modalData.quantity).toFixed(3)} units)` : "No weight info in BOM"}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Production Hour
                  </label>
                  <input
                    type="text"
                    value={productionHoursFormatted}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Planned Start Date
                  </label>
                  <input
                    type="text"
                    value={plannedStartDateStr}
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed"
                  />
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
                onClick={submitWorkOrderConfiguration}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-colors cursor-pointer"
              >
                {loading ? "Creating..." : "Confirm & Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Work Order Modal */}
      {viewWorkOrderId && (
        <WorkOrderViewModal
          workOrderId={viewWorkOrderId}
          onClose={() => setViewWorkOrderId(null)}
        />
      )}

      <MachineMouldPlanner
        isOpen={showPlanner}
        onClose={() => setShowPlanner(false)}
        onConfirm={(mouldId, machineId) => {
          setModalData(prev => ({ ...prev, mould_id: mouldId, machine_id: machineId }));
        }}
        materialId={currentConfigureItem?.material_id}
        materialName={currentConfigureItem?.material_name}
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
