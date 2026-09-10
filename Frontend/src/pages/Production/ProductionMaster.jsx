import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { getAllWorkOrders } from "../../api/workOrderApi";
import DataTable from "../../components/DataTable";
import WorkOrderViewModal from "../admin/workOrder/WorkOrderViewModal";
import { useNavigate } from "react-router-dom";

export default function ProductionMaster() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [viewWorkOrderId, setViewWorkOrderId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllWorkOrders();
      setItems(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load production work orders", err);
      setError("Unable to load production work orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Display items intended for production
  const displayItems = useMemo(() => {
    const fg = items.filter(it => Number(it.production_quantity) > 0);
    return fg.length > 0 ? fg : items;
  }, [items]);

  const columns = useMemo(() => {
    return [
      {
        key: "work_order_no",
        label: "Work Order No.",
        minWidth: "140px",
        render: row => (
          <span className="font-bold font-mono text-slate-800">
            WO-{String(row.work_order_no).padStart(4, '0')}
          </span>
        )
      },
      {
        key: "work_order_date",
        label: "Date",
        minWidth: "110px",
        render: row => {
          if (!row.work_order_date) return "—";
          const date = new Date(row.work_order_date);
          if (isNaN(date.getTime())) return "—";
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
      },
      {
        key: "material_name",
        label: "Product / Material",
        minWidth: "220px",
        render: row => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{row.material_name || "—"}</span>
            <span className="text-xs text-slate-500 font-mono mt-0.5">{row.material_code || "—"}</span>
          </div>
        )
      },
      {
        key: "customer_name",
        label: "Customer",
        minWidth: "200px",
        render: row => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-700">{row.customer_name || "—"}</span>
            <span className="text-xs text-slate-400 font-mono mt-0.5">{row.customer_code || "—"}</span>
          </div>
        )
      },
      {
        key: "batch_no",
        label: "Batch No.",
        minWidth: "120px",
        render: row => (
          <span className="font-mono text-xs text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded">
            {row.batch_no || "—"}
          </span>
        )
      },
      {
        key: "machine_name",
        label: "Machine",
        minWidth: "130px",
        render: row => row.machine_name ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
            {row.machine_name}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">Not Set</span>
        )
      },
      {
        key: "production_quantity",
        label: "Prod Qty",
        minWidth: "110px",
        render: row => (
          <span className="font-bold text-indigo-700 text-sm">
            {Number(row.production_quantity).toLocaleString()}
          </span>
        )
      },
      {
        key: "p_memo_no",
        label: "P-Memo Status",
        minWidth: "150px",
        render: row => row.p_memo_no ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <i className="fa-solid fa-circle-check text-[10px]"></i>
            PM-{String(row.p_memo_no).padStart(4, '0')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <i className="fa-regular fa-clock text-[10px]"></i>
            Pending
          </span>
        )
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        minWidth: "180px",
        render: (row) => (
          <div className="flex items-center gap-2">
            {/* Direct P-Memo button */}
            <button
              type="button"
              onClick={() => navigate(`/production/p-memo/${row.work_order_item_id}`)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer ${
                row.p_memo_no
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-[#369ACF] hover:bg-[#2583b4] text-white"
              }`}
              title={row.p_memo_no ? "View / Edit Production Memo" : "Create Production Memo"}
            >
              <i className="fa-solid fa-file-invoice text-xs"></i>
              {row.p_memo_no ? "P Memo" : "Create P Memo"}
            </button>

            {/* View Work Order details modal */}
            <button
              type="button"
              onClick={() => setViewWorkOrderId(row.work_order_id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 cursor-pointer transition-colors"
              title="View Work Order Full Details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        )
      }
    ];
  }, [navigate]);

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
          tableId="production_master"
          title="Production Orders"
          data={displayItems}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search materials, customers, work order or P-memo..."
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
