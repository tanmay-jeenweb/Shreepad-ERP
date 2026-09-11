import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { getAllWorkshopEntries } from "../../api/workshopEntryApi";

export default function WorkshopEntryMaster() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllWorkshopEntries();
      setItems(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load workshop entries", err);
      setError("Unable to load workshop entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayItems = useMemo(() => {
    return items.filter((it) => Number(it.production_quantity) > 0);
  }, [items]);

  const columns = useMemo(() => {
    return [
      {
        key: "work_order_no",
        label: "Work Order No.",
        minWidth: "150px",
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
            <i className="fa-solid fa-file-lines text-[11px]"></i>
            WO-{String(row.work_order_no).padStart(4, "0")}
          </span>
        ),
      },
      {
        key: "work_order_date",
        label: "Date",
        minWidth: "110px",
        render: (row) => {
          if (!row.work_order_date) return "—";
          const date = new Date(row.work_order_date);
          if (isNaN(date.getTime())) return "—";
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        },
      },
      {
        key: "material_name",
        label: "Product / Material",
        minWidth: "240px",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-sm">
              {row.material_name || "—"}
            </span>
            <span className="text-xs text-slate-500 font-mono mt-0.5">
              {row.material_code || "—"}
            </span>
          </div>
        ),
      },
      {
        key: "customer_name",
        label: "Customer",
        minWidth: "180px",
        render: (row) => (
          <span className="font-semibold text-slate-700 text-sm">
            {row.customer_name || "—"}
          </span>
        ),
      },
      {
        key: "batch_no",
        label: "Batch No.",
        minWidth: "120px",
        render: (row) => (
          <span className="font-mono text-xs text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {row.batch_no || "—"}
          </span>
        ),
      },
      {
        key: "production_quantity",
        label: "Prod Qty",
        minWidth: "110px",
        render: (row) => (
          <span className="font-bold text-indigo-700 text-sm">
            {Number(row.production_quantity || row.quantity || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        minWidth: "140px",
        render: (row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/production/workshop-entry/${row.work_order_item_id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all active:scale-95"
              title="Open Workshop Entry Details"
            >
              <i className="fa-solid fa-screwdriver-wrench text-xs"></i>
              Workshop Entry
            </button>
          </div>
        ),
      },
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
          tableId="workshop_entry_master"
          title="Workshop Entry"
          data={displayItems}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search Work Order, Material, Customer, Batch..."
        />
      </main>
    </div>
  );
}
