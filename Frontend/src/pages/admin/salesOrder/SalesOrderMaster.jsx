import { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { getAllSalesOrders, deleteSalesOrder } from "../../../api/salesOrderApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../../context/PermissionContext";
import SalesOrderViewModal from "./SalesOrderViewModal";

export default function SalesOrderMaster() {
  const [loading, setLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState([]);
  const [error, setError] = useState("");
  const [viewingId, setViewingId] = useState(null);
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllSalesOrders();
      setSalesOrders(res.data.data || []);
    } catch (err) {
      console.error("Failed to load sales orders", err);
      setError("Unable to load sales orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sales order?")) return;
    try {
      await deleteSalesOrder(id);
      toast.success("Sales order deleted");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete sales order");
    }
  };

  const columns = useMemo(() => {
    const cols = [
      {
        key: "sales_order_id",
        label: "Sales Order ID",
        minWidth: "150px",
        render: row => {
          const hasSuffix = row.sales_order_id && /-\d{3}$/.test(row.sales_order_id);
          const baseSo = hasSuffix ? row.sales_order_id.substring(0, row.sales_order_id.lastIndexOf('-')) : null;
          return (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-slate-800">{row.sales_order_id}</span>
              {baseSo && (
                <span className="text-[10px] text-slate-500 font-medium">
                  from <strong className="font-mono">{baseSo}</strong>
                </span>
              )}
            </div>
          );
        }
      },
      { key: "customer_name", label: "Customer Name", minWidth: "200px" },
      {
        key: "customer_order_no",
        label: "Customer Order No.",
        minWidth: "150px",
        render: row => row.customer_order_no || <span className="text-slate-400 font-normal italic">N/A</span>
      },
      {
        key: "created_at",
        label: "Created On",
        minWidth: "100px",
        render: (row) => {
          if (!row.created_at) return "—";
          const date = new Date(row.created_at);
          if (isNaN(date.getTime())) return "—";
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
      },
      {
        key: "total_amount",
        label: "Total Amount",
        minWidth: "120px",
        render: (row) => <span className="font-semibold text-slate-800 tabular-nums">₹{Number(row.total_amount).toFixed(2)}</span>
      },
      {
        key: "revision_no",
        label: "Rev.",
        minWidth: "60px",
        render: (row) => (
          <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
            {row.revision_no ?? 0}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        minWidth: "120px",
        render: (row) => {
          const statuses = {
            pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "fa-clock", label: "Pending" },
            approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "fa-check", label: "Approved" },
            rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: "fa-xmark", label: "Rejected" },
          };
          const s = statuses[row.status] || statuses.pending;
          return (
            <div className="flex flex-col gap-1">
              <span className={`inline-flex w-fit items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded border ${s.bg} ${s.text} ${s.border}`}>
                <i className={`fa-solid ${s.icon}`}></i>
                {s.label}
              </span>
              {row.status === "rejected" && row.rejection_reason && (
                <span className="text-[10px] text-rose-600 truncate max-w-[120px]" title={row.rejection_reason}>
                  {row.rejection_reason}
                </span>
              )}
            </div>
          );
        },
      }
    ];

    const canDelete = hasPermission("sales_order", "delete");
    const canUpdate = hasPermission("sales_order", "update");

    cols.push({
      key: "actions",
      label: "Actions",
      sortable: false,
      minWidth: "160px",
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* View */}
          <button
            onClick={() => setViewingId(row.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 cursor-pointer"
            title="View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {/* Revise (for approved/rejected) */}
          {canUpdate && (row.status === "approved" || row.status === "rejected") && (
            <button
              onClick={() => navigate(`/sales/sales-orders/edit/${row.id}?mode=revise`)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer"
              title="Revise"
            >
              <i className="fa-solid fa-pen-to-square text-sm"></i>
            </button>
          )}

          {/* Edit (only for pending) */}
          {canUpdate && row.status === "pending" && (
            <button
              onClick={() => navigate(`/sales/sales-orders/edit/${row.id}`)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
              title="Edit"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </button>
          )}

          {/* Delete */}
          {canDelete && row.status !== "approved" && (
            <button
              onClick={() => handleDelete(row.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
              title="Delete"
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
  }, [hasPermission, navigate]);

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
          tableId="sales_order_master"
          title="Sales Order Master"
          data={salesOrders}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search sales orders..."
          actionButton={
            hasPermission("sales_order", "write") && (
              <button
                onClick={() => navigate("/sales/sales-orders/create")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white transition-all hover:bg-[#2583b4] shadow-sm hover:shadow"
                title="Create Sales Order"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </button>
            )
          }
        />

        {viewingId && (
            <SalesOrderViewModal soId={viewingId} onClose={() => setViewingId(null)} />
        )}
      </main>
    </div>
  );
}
