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

  const columns = useMemo(() => {
    return [
      {
        key: "p_memo_no",
        label: "P.Memo No.",
        minWidth: "150px",
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
            <i className="fa-solid fa-file-invoice text-[11px]"></i>
            PM-{String(row.p_memo_no).padStart(4, "0")}
          </span>
        ),
      },
      {
        key: "work_order_no",
        label: "Work Order No.",
        minWidth: "150px",
        render: (row) => (
          <span className="font-bold font-mono text-slate-800 text-sm">
            WO-{String(row.work_order_no).padStart(4, "0")}
          </span>
        ),
      },
      {
        key: "material_name",
        label: "Material",
        minWidth: "250px",
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
        key: "actions",
        label: "Actions",
        sortable: false,
        minWidth: "120px",
        render: (row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/production/workshop-entry/${row.pmemo_id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-sm bg-[#369ACF] hover:bg-[#2583b4] text-white cursor-pointer transition-all active:scale-95"
              title="Open Workshop Entry Details"
            >
              <i className="fa-solid fa-circle-info text-xs"></i>
              Details
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
          data={items}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search P-Memo, Work Order, Material, Machine..."
        />
      </main>
    </div>
  );
}
