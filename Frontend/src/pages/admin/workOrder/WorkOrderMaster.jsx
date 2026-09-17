import { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { getAllWorkOrders, deleteWorkOrder, startWorkOrder } from "../../../api/workOrderApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../../context/PermissionContext";
import WorkOrderViewModal from "./WorkOrderViewModal";
import { useNavigate } from "react-router-dom";

export default function WorkOrderMaster() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState(null);
  
  // View modal state
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
          if (status === "Completed") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <i className="fa-solid fa-check text-[10px]"></i>
                Completed
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
      minWidth: "180px",
      render: (row) => (
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
      )
    });

    return cols;
  }, [hasPermission, navigate, startingId]);

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

        <DataTable
          tableId="work_order_master"
          title="Work Orders"
          data={displayItems}
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
    </div>
  );
}
