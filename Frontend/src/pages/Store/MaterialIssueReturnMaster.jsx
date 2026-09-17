import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { getAllWorkshopEntries } from "../../api/workshopEntryApi";
import toast from "react-hot-toast";

export default function MaterialIssueReturnMaster() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getAllWorkshopEntries();
      setItems(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load work orders for issue and return:", err);
      toast.error("Failed to load work orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayItems = useMemo(() => {
    return items.filter((it) => Number(it.production_quantity || it.quantity || 0) > 0);
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
          return `${String(date.getDate()).padStart(2, "0")}/${String(
            date.getMonth() + 1
          ).padStart(2, "0")}/${date.getFullYear()}`;
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
          <span className="font-semibold text-slate-700 text-xs">
            {row.customer_name || "Internal Stock"}
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
        label: "Target Qty",
        minWidth: "110px",
        render: (row) => (
          <span className="font-bold text-slate-800 text-xs">
            {Number(row.production_quantity || row.quantity || 0).toLocaleString()}{" "}
            <span className="text-[10px] font-normal text-slate-500">Nos</span>
          </span>
        ),
      },
      {
        key: "issued_rm_count",
        label: "Issued Chits",
        minWidth: "120px",
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <i className="fa-solid fa-receipt text-[10px]"></i>
            {row.issued_rm_count || 0} issues
          </span>
        ),
      },
      {
        key: "actions",
        label: "Action",
        sortable: false,
        minWidth: "150px",
        render: (row) => (
          <button
            type="button"
            onClick={() => navigate(`/store/material-issue-return/${row.work_order_item_id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-xs bg-[#369ACF] hover:bg-[#2583b4] text-white cursor-pointer transition-all active:scale-95"
          >
            <i className="fa-solid fa-right-left text-[11px]"></i>
            Issue & Return
          </button>
        ),
      },
    ];
  }, [navigate]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen pb-16">
      <Navbar title="Material Issue & Return" />

      <main className="flex-1 flex flex-col w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Normal Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <i className="fa-solid fa-right-left text-[#369ACF] text-xl"></i>
              Material Issue & Return
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">
              Select an active Started work order to issue raw materials, generate & print Chit labels, or record returns.
            </p>
          </div>
        </div>

        {/* Master Work Orders DataTable */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <DataTable
            tableId="store_material_issue_master_table"
            title="Active Work Orders for Material Issue & Return"
            data={displayItems}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search Work Order #, Material Name, Customer, Batch..."
          />
        </div>
      </main>
    </div>
  );
}
