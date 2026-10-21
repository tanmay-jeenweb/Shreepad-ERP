import { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { getAllWorkOrders, deleteWorkOrder, startWorkOrder, completeWorkOrder, reopenWorkOrder, resumeWorkOrder } from "../../../api/workOrderApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../../context/PermissionContext";
import WorkOrderViewModal from "./WorkOrderViewModal";
import HoldWorkOrderModal from "./HoldWorkOrderModal";
import { useNavigate } from "react-router-dom";

export default function WorkOrderMaster() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState(null);
  const [reopeningId, setReopeningId] = useState(null);
  const [resumingId, setResumingId] = useState(null);
  
  // Hold modal state
  const [holdingRow, setHoldingRow] = useState(null);

  // Complete modal state
  const [completingRow, setCompletingRow] = useState(null);
  const [completionRemark, setCompletionRemark] = useState("");
  const [completingLoading, setCompletingLoading] = useState(false);
  
  // View modal state
  const [activeTab, setActiveTab] = useState("ongoing");
  const [viewWorkOrderId, setViewWorkOrderId] = useState(null);

  const { hasPermission } = usePermission();

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllWorkOrders();
      setItems(res.data.data || []);
    } catch (err) {
      console.error("Failed to load work orders", err);
      setError("Unable to load work orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartWorkOrder = async (row) => {
    const woNumber = `WO-${String(row.work_order_no).padStart(4, '0')}`;
    if (!window.confirm(`Are you sure you want to START Work Order ${woNumber}?\n\nOnce started, this work order will become active and visible in Workshop Entry and Material Issue & Return.`)) {
      return;
    }
    setStartingId(row.work_order_id);
    try {
      await startWorkOrder(row.work_order_id);
      toast.success(`Work Order ${woNumber} started successfully! It is now active in Workshop Entry.`);
      await loadData();
    } catch (err) {
      console.error("Failed to start work order:", err);
      toast.error(err?.response?.data?.message || "Failed to start work order");
    } finally {
      setStartingId(null);
    }
  };

  const handleConfirmComplete = async (e) => {
    e.preventDefault();
    if (!completingRow) return;

    const woNumber = `WO-${String(completingRow.work_order_no).padStart(4, '0')}`;
    const targetStatus = completingRow.isPartial ? "Partially Completed" : "Completed";
    const defaultReason = completingRow.isPartial ? "Partially Completed" : "Completed";

    setCompletingLoading(true);
    try {
      await completeWorkOrder(completingRow.work_order_id, {
        completion_reason: completionRemark.trim() || defaultReason,
        status: targetStatus
      });
      toast.success(`Work Order ${woNumber} marked as ${targetStatus}.`);
      setCompletingRow(null);
      setCompletionRemark("");
      await loadData();
    } catch (err) {
      console.error("Failed to complete work order:", err);
      toast.error(err?.response?.data?.message || "Failed to complete work order");
    } finally {
      setCompletingLoading(false);
    }
  };

  const handleResumeWorkOrder = async (row) => {
    const woNumber = `WO-${String(row.work_order_no).padStart(4, '0')}`;
    if (!window.confirm(`Are you sure you want to RESUME Work Order ${woNumber}?\n\nThis will take the work order off hold and re-enable workshop entries and floor production.`)) {
      return;
    }
    setResumingId(row.work_order_id);
    try {
      await resumeWorkOrder(row.work_order_id);
      toast.success(`Work Order ${woNumber} resumed successfully! It is active again in Workshop Entry.`);
      await loadData();
    } catch (err) {
      console.error("Failed to resume work order:", err);
      toast.error(err?.response?.data?.message || "Failed to resume work order");
    } finally {
      setResumingId(null);
    }
  };

  const handleReopenWorkOrder = async (row) => {
    const woNumber = `WO-${String(row.work_order_no).padStart(4, '0')}`;
    if (!window.confirm(`Are you sure you want to REOPEN Work Order ${woNumber}?\n\nIt will return to Started status, re-enabling workshop entries and dispatches.`)) {
      return;
    }
    setReopeningId(row.work_order_id);
    try {
      await reopenWorkOrder(row.work_order_id);
      toast.success(`Work Order ${woNumber} reopened successfully! It is active again.`);
      await loadData();
    } catch (err) {
      console.error("Failed to reopen work order:", err);
      toast.error(err?.response?.data?.message || "Failed to reopen work order");
    } finally {
      setReopeningId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this work order?")) return;
    try {
      await deleteWorkOrder(id);
      toast.success("Work order deleted successfully");
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete work order");
    }
  };

  // Only display Finished Goods / Products in the main table
  // Raw materials from BOM are viewed inside the View Details modal (Eye icon)
  const displayItems = useMemo(() => {
    const fg = items.filter(it => Number(it.production_quantity) > 0);
    return fg.length > 0 ? fg : items;
  }, [items]);

  // Tab 1: Ongoing Work Orders (Draft, Started)
  const ongoingItems = useMemo(() => {
    return displayItems.filter(it => {
      const s = it.work_order_status || "Draft";
      return s !== "Completed" && s !== "Stopped" && s !== "Partially Completed" && s !== "Partial Complete" && s !== "On Hold";
    });
  }, [displayItems]);

  // Tab 2: On Hold Work Orders
  const onHoldItems = useMemo(() => {
    return displayItems.filter(it => {
      const s = it.work_order_status || "Draft";
      return s === "On Hold";
    });
  }, [displayItems]);

  // Tab 3: Completed or Partially Completed Work Orders
  const completedItems = useMemo(() => {
    return displayItems.filter(it => {
      const s = it.work_order_status || "Draft";
      return s === "Completed" || s === "Stopped" || s === "Partially Completed" || s === "Partial Complete";
    });
  }, [displayItems]);

  // Active tab items for DataTable
  const filteredItems = useMemo(() => {
    if (activeTab === "ongoing") return ongoingItems;
    if (activeTab === "onHold") return onHoldItems;
    if (activeTab === "completed") return completedItems;
    return displayItems;
  }, [activeTab, ongoingItems, onHoldItems, completedItems, displayItems]);

  const columns = useMemo(() => {
    const cols = [
      {
        key: "work_order_no",
        label: "Work Order No.",
        minWidth: "150px",
        render: row => (
          <span className="font-semibold text-slate-800">
            WO-{String(row.work_order_no).padStart(4, '0')}
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
          return formatDate(row.work_order_date);
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
        key: "wo_quantity",
        label: "Quantity",
        minWidth: "120px",
        render: row => <span className="font-semibold text-slate-700">{row.wo_quantity}</span>
      },
      {
        key: "production_quantity",
        label: "Prod Qty",
        minWidth: "120px",
        render: row => (
          <span className="font-semibold text-indigo-700">{row.production_quantity}</span>
        )
      },
      {
        key: "produced_quantity",
        label: "Produced Qty",
        minWidth: "130px",
        render: row => {
          const produced = Number(row.produced_quantity) || 0;
          const target = Number(row.production_quantity) || 0;
          const isDone = target > 0 && produced >= target;
          return (
            <span className={`font-semibold ${isDone ? "text-emerald-700" : produced > 0 ? "text-amber-700" : "text-slate-500"}`}>
              {produced} <span className="text-xs font-normal text-slate-400">/ {target}</span>
            </span>
          );
        }
      },
      {
        key: "work_order_status",
        label: "Status",
        minWidth: "120px",
        render: row => {
          const status = row.work_order_status || "Draft";
          if (status === "Started") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Started
              </span>
            );
          }
          if (status === "On Hold") {
            return (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 cursor-help"
                title={row.hold_reason ? `Hold Reason: ${row.hold_reason}` : "Work Order is On Hold (Production paused; dispatch allowed)"}
              >
                <i className="fa-solid fa-pause text-[10px] text-amber-600"></i>
                On Hold
              </span>
            );
          }
          if (status === "Completed" || status === "Stopped") {
            return (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-help"
                title={row.stop_reason ? `Remark: ${row.stop_reason}` : "Work Order is Completed"}
              >
                <i className="fa-solid fa-circle-check text-[11px] text-emerald-600"></i>
                Completed
              </span>
            );
          }
          if (status === "Partially Completed" || status === "Partial Complete") {
            return (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 cursor-help"
                title={row.stop_reason ? `Remark: ${row.stop_reason}` : "Work Order is Partially Completed"}
              >
                <i className="fa-solid fa-hourglass-half text-[10px] text-amber-600"></i>
                Partially Completed
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <i className="fa-regular fa-clock text-[10px]"></i>
              Draft
            </span>
          );
        }
      }
    ];

    const canDelete = hasPermission("work_order", "delete");
    const canUpdate = hasPermission("work_order", "update");

    cols.push({
      key: "actions",
      label: "Actions",
      sortable: false,
      minWidth: "210px",
      render: (row) => {
        const targetQty = Number(row.production_quantity) || 0;
        const producedQty = Number(row.produced_quantity) || 0;
        const isProductionCompleted = targetQty > 0 && producedQty >= targetQty;
        const remainingQty = Math.max(0, targetQty - producedQty);

        return (
          <div className="flex items-center gap-2">
            {/* Start Work Order Button (for Draft / unstarted work orders) */}
            {canUpdate && (row.work_order_status === "Draft" || !row.work_order_status) && (
              <button
                type="button"
                onClick={() => handleStartWorkOrder(row)}
                disabled={startingId === row.work_order_id}
                className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                title="Start Work Order (Releases to Workshop Entry)"
              >
                {startingId === row.work_order_id ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <i className="fa-solid fa-play text-[10px]"></i>
                )}
                <span>Start</span>
              </button>
            )}

            {/* Complete / Partial Complete Work Order Button (for Started work orders) */}
            {canUpdate && row.work_order_status === "Started" && (
              isProductionCompleted ? (
                /* Full Complete (Green button) when production quantity specified is completed */
                <button
                  type="button"
                  onClick={() => {
                    setCompletingRow({ ...row, isPartial: false, targetQty, producedQty, remainingQty: 0 });
                    setCompletionRemark("");
                  }}
                  className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer font-bold text-xs transition-all shadow-2xs active:scale-95"
                  title={`Complete Work Order (Specified production quantity of ${targetQty} completed)`}
                >
                  <i className="fa-solid fa-circle-check text-[10px]"></i>
                  <span>Complete</span>
                </button>
              ) : (
                /* Partial Complete (Yellow button) when production quantity is still remaining */
                <button
                  type="button"
                  onClick={() => {
                    setCompletingRow({ ...row, isPartial: true, targetQty, producedQty, remainingQty });
                    setCompletionRemark("");
                  }}
                  className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400 cursor-pointer font-bold text-xs transition-all shadow-2xs active:scale-95"
                  title={`Partial Complete (Production quantity remaining: ${remainingQty} Nos)`}
                >
                  <i className="fa-solid fa-hourglass-half text-[10px] text-amber-600"></i>
                  <span>Partial Complete</span>
                </button>
              )
            )}

            {/* Put on Hold Button (for Started work orders) */}
            {canUpdate && row.work_order_status === "Started" && (
              <button
                type="button"
                onClick={() => setHoldingRow(row)}
                className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400 cursor-pointer font-bold text-xs transition-all shadow-2xs active:scale-95"
                title="Put Work Order on Hold (Pauses floor production; dispatches remain enabled)"
              >
                <i className="fa-solid fa-pause text-[10px] text-amber-600"></i>
                <span>Hold</span>
              </button>
            )}

            {/* Resume Work Order Button (for On Hold work orders) */}
            {canUpdate && row.work_order_status === "On Hold" && (
              <button
                type="button"
                onClick={() => handleResumeWorkOrder(row)}
                disabled={resumingId === row.work_order_id}
                className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                title="Resume Work Order (Re-enables workshop entries and floor production)"
              >
                {resumingId === row.work_order_id ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <i className="fa-solid fa-play text-[10px]"></i>
                )}
                <span>Resume</span>
              </button>
            )}

            {/* Reopen Work Order Button (for Completed, Stopped, or Partially Completed work orders) */}
            {canUpdate && (
              row.work_order_status === "Completed" || 
              row.work_order_status === "Stopped" || 
              row.work_order_status === "Partially Completed" || 
              row.work_order_status === "Partial Complete"
            ) && (
              <button
                type="button"
                onClick={() => handleReopenWorkOrder(row)}
                disabled={reopeningId === row.work_order_id}
                className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-400 cursor-pointer font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                title="Reopen Work Order (Resume floor production and dispatch)"
              >
                {reopeningId === row.work_order_id ? (
                  <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <i className="fa-solid fa-rotate-right text-[10px]"></i>
                )}
                <span>Reopen</span>
              </button>
            )}

          {/* View Work Order Details */}
          <button
            type="button"
            onClick={() => setViewWorkOrderId(row.work_order_id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 cursor-pointer"
            title="View Work Order Details & Workshop Entry"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Edit Work Order */}
          {canUpdate && (
            <button
              type="button"
              onClick={() => navigate(`/sales/work-orders/edit/${row.work_order_id}`)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer"
              title="Edit Work Order"
            >
              <i className="fa-solid fa-pencil text-xs"></i>
            </button>
          )}

          {/* Delete Work Order */}
          {canDelete && (
            <button
              type="button"
              onClick={() => handleDelete(row.work_order_id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
              title="Delete Work Order"
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
        );
      }
    });

    return cols;
  }, [hasPermission, navigate, startingId, reopeningId, resumingId]);

  const canWrite = hasPermission("work_order", "write");

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
      <Navbar title="ERP Admin" />
      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg mb-6 font-medium text-sm">
            {error}
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-2xs">
          {/* Tab 1: Ongoing Work Orders */}
          <button
            type="button"
            onClick={() => setActiveTab("ongoing")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "ongoing"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <i className={`fa-solid fa-play ${activeTab === "ongoing" ? "text-[#369ACF]" : "text-slate-400"}`}></i>
            <span>Ongoing Work Orders</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === "ongoing" ? "bg-[#369ACF] text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {ongoingItems.length}
            </span>
          </button>

          {/* Tab 2: On Hold Work Orders */}
          <button
            type="button"
            onClick={() => setActiveTab("onHold")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "onHold"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <i className={`fa-solid fa-pause ${activeTab === "onHold" ? "text-amber-600" : "text-slate-400"}`}></i>
            <span>On Hold</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === "onHold" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {onHoldItems.length}
            </span>
          </button>

          {/* Tab 3: Completed / Partially Completed Work Orders */}
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "completed"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <i className={`fa-solid fa-circle-check ${activeTab === "completed" ? "text-emerald-600" : "text-slate-400"}`}></i>
            <span>Completed / Partially Completed</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === "completed" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {completedItems.length}
            </span>
          </button>

          {/* Tab 3: All Work Orders */}
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <i className={`fa-solid fa-list ${activeTab === "all" ? "text-indigo-600" : "text-slate-400"}`}></i>
            <span>All Work Orders</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === "all" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {displayItems.length}
            </span>
          </button>
        </div>

        <DataTable
          tableId="work_order_master"
          title={
            activeTab === "ongoing"
              ? "Ongoing Work Orders"
              : activeTab === "onHold"
              ? "On Hold Work Orders"
              : activeTab === "completed"
              ? "Completed / Partially Completed Work Orders"
              : "All Work Orders"
          }
          data={filteredItems}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search materials, customers or work order number..."
          actionButton={
            canWrite && (
              <button
                onClick={() => navigate("/sales/work-orders/create")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white transition-all hover:bg-[#2583b4] shadow-sm hover:shadow cursor-pointer"
                title="Create Work Order"
              >
                <i className="fa-solid fa-plus text-sm"></i>
              </button>
            )
          }
        />
      </main>

      {/* View Work Order Modal */}
      {viewWorkOrderId && (
        <WorkOrderViewModal
          workOrderId={viewWorkOrderId}
          onClose={() => setViewWorkOrderId(null)}
        />
      )}

      {/* Put Work Order on Hold Modal */}
      <HoldWorkOrderModal
        row={holdingRow}
        isOpen={Boolean(holdingRow)}
        onClose={() => setHoldingRow(null)}
        onSuccess={loadData}
      />

      {/* Complete / Partial Complete Work Order Modal */}
      {completingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3.5 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  completingRow.isPartial 
                    ? "bg-amber-50 border border-amber-200 text-amber-600" 
                    : "bg-emerald-50 border border-emerald-200 text-emerald-600"
                }`}>
                  <i className={`text-lg ${completingRow.isPartial ? "fa-solid fa-hourglass-half" : "fa-solid fa-circle-check"}`}></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {completingRow.isPartial ? "Partial Complete" : "Complete"} Work Order WO-{String(completingRow.work_order_no).padStart(4, '0')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {completingRow.isPartial 
                      ? "Production quantity is still remaining. Mark this work order as Partially Completed." 
                      : "Mark this work order as completed. Floor production entries and material issuing will be closed."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleConfirmComplete}>
                {completingRow.isPartial && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 mb-4">
                    <i className="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5 shrink-0 text-sm"></i>
                    <div className="space-y-1">
                      <div className="font-semibold text-amber-950">
                        Production Target Not Reached:
                      </div>
                      <div className="text-amber-800">
                        Target: <span className="font-bold text-slate-900">{completingRow.targetQty}</span> Nos &bull; 
                        Produced: <span className="font-bold text-emerald-700">{completingRow.producedQty}</span> Nos &bull; 
                        Remaining: <span className="font-bold text-rose-600">{completingRow.remainingQty}</span> Nos
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {completingRow.isPartial ? "Reason for Partial Completion" : "Completion Remarks / Notes"} <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={completionRemark}
                    onChange={(e) => setCompletionRemark(e.target.value)}
                    placeholder={completingRow.isPartial 
                      ? "Enter reason (e.g. Short closed by customer request, balance order cancelled, material shortage)..."
                      : "Enter notes (e.g. Production completed successfully)..."}
                    className={`w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all resize-none ${
                      completingRow.isPartial
                        ? "focus:ring-amber-500/20 focus:border-amber-500"
                        : "focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                    autoFocus
                  />
                </div>

                <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 mb-5 ${
                  completingRow.isPartial 
                    ? "bg-slate-50 border border-slate-200 text-slate-700" 
                    : "bg-emerald-50 border border-emerald-200 text-emerald-900"
                }`}>
                  <i className={`mt-0.5 shrink-0 ${completingRow.isPartial ? "fa-solid fa-circle-info text-amber-600" : "fa-solid fa-circle-info text-emerald-600"}`}></i>
                  <span>
                    This order will be marked as <strong>{completingRow.isPartial ? "Partially Completed" : "Completed"}</strong>. You can <strong>Reopen</strong> it at any time to resume production if required.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setCompletingRow(null);
                      setCompletionRemark("");
                    }}
                    disabled={completingLoading}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={completingLoading}
                    className={`px-4 py-2 text-xs font-bold rounded-xl text-white cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ${
                      completingRow.isPartial
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {completingLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </>
                    ) : completingRow.isPartial ? (
                      <>
                        <i className="fa-solid fa-hourglass-half text-xs"></i>
                        <span>Confirm Partial Complete</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-circle-check text-xs"></i>
                        <span>Confirm Complete</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
