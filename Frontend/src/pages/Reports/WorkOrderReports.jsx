import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { getWorkOrderReports } from "../../api/workOrderApi";
import TermsSelectModal from "./TermsSelectModal";
import toast from "react-hot-toast";

export default function WorkOrderReports() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWOForDownload, setSelectedWOForDownload] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("excel");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await getWorkOrderReports();
      if (res.data?.success) {
        setWorkOrders(res.data.data || []);
      } else {
        toast.error(res.data?.message || "Failed to fetch work order reports");
      }
    } catch (err) {
      console.error("Error fetching work order reports:", err);
      toast.error("Failed to load work order reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Format date helper
  const formatDate = (dateVal) => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "—";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return "—";
    }
  };



  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Started":
      case "In Production":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "On Hold":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Stopped":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Flatten work orders and their manufactured items into a single unified list
  const flattenedData = useMemo(() => {
    const rows = [];
    workOrders.forEach((wo) => {
      const items = wo.items || [];
      const woNum = wo.work_order_no
        ? `WO-${String(wo.work_order_no).padStart(4, "0")}`
        : `ID #${wo.id}`;

      if (items.length === 0) {
        rows.push({
          id: `wo_${wo.id}`,
          work_order_id: wo.id,
          work_order_no: wo.work_order_no,
          formatted_wo_no: woNum,
          revision_number: wo.revision_number,
          work_order_date: wo.work_order_date,
          customer_name: wo.customer_name || "—",
          purchase_order_number: wo.purchase_order_number || "—",
          purchase_order_date: wo.purchase_order_date,
          project_name: wo.project_name || "—",
          major_capex: wo.major_capex || "—",
          inspection_name: wo.inspection_name || "—",
          status: wo.status || "Draft",
          material_code: "—",
          item_description: "—",
          item_type: "—",
          item_size: "—",
          item_class: "—",
          material_name: "—",
          quantity: 0,
          id_no: "—",
          has_finished_batch: false,
          batch_list: [],
          workOrderRef: wo,
        });
      } else {
        items.forEach((it, idx) => {
          rows.push({
            id: `woi_${it.work_order_item_id || `${wo.id}_${idx}`}`,
            work_order_id: wo.id,
            work_order_no: wo.work_order_no,
            formatted_wo_no: woNum,
            revision_number: wo.revision_number,
            work_order_date: wo.work_order_date,
            customer_name: wo.customer_name || "—",
            purchase_order_number: wo.purchase_order_number || "—",
            purchase_order_date: wo.purchase_order_date,
            project_name: wo.project_name || "—",
            major_capex: wo.major_capex || "—",
            inspection_name: wo.inspection_name || "—",
            status: wo.status || "Draft",
            material_code: it.material_code || "—",
            item_description: it.item_description || "—",
            item_type: it.item_type || "—",
            item_size: it.item_size || "—",
            item_class: it.item_class || "—",
            material_name: it.material_name || "—",
            quantity: Number(it.quantity) || 0,
            id_no: it.id_no || "—",
            has_finished_batch: it.has_finished_batch,
            batch_list: it.batch_list || [],
            workOrderRef: wo,
          });
        });
      }
    });
    return rows;
  }, [workOrders]);

  // DataTable column definitions
  const columns = useMemo(
    () => [
      {
        key: "formatted_wo_no",
        label: "W.O. No.",
        render: (row) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-900 tracking-tight text-xs">
              {row.formatted_wo_no}
            </span>
            {row.revision_number !== null && row.revision_number !== undefined && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                R{row.revision_number}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "work_order_date",
        label: "W.O. Date",
        render: (row) => (
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
            {formatDate(row.work_order_date)}
          </span>
        ),
      },
      {
        key: "customer_name",
        label: "Client",
        render: (row) => (
          <span className="text-xs font-semibold text-slate-800 line-clamp-2" title={row.customer_name}>
            {row.customer_name}
          </span>
        ),
      },
      {
        key: "purchase_order_number",
        label: "Client P.O.",
        render: (row) => (
          <span className="text-xs text-slate-700 font-medium">
            {row.purchase_order_number}
          </span>
        ),
      },
      {
        key: "material_code",
        label: "Mat Code",
        render: (row) => (
          <span className="font-mono text-xs text-slate-700 font-semibold">
            {row.material_code}
          </span>
        ),
      },
      {
        key: "item_description",
        label: "Item Description",
        render: (row) => (
          <span className="text-xs font-medium text-slate-800 line-clamp-2" title={row.item_description}>
            {row.item_description}
          </span>
        ),
      },
      {
        key: "item_type",
        label: "Item",
        render: (row) => (
          <span className="text-xs text-slate-600 font-semibold">
            {row.item_type}
          </span>
        ),
      },
      {
        key: "item_size",
        label: "Size",
        render: (row) => (
          <span className="text-xs text-slate-600 font-semibold">
            {row.item_size}
          </span>
        ),
      },
      {
        key: "item_class",
        label: "Class",
        render: (row) => (
          <span className="text-xs text-slate-600 font-semibold">
            {row.item_class}
          </span>
        ),
      },
      {
        key: "material_name",
        label: "Material",
        render: (row) => (
          <span className="text-xs font-semibold text-slate-700">
            {row.material_name}
          </span>
        ),
      },
      {
        key: "quantity",
        label: "Qty",
        render: (row) => (
          <span className="text-xs font-bold text-slate-800">
            {row.quantity}
          </span>
        ),
      },
      {
        key: "id_no",
        label: "ID No. (Batch No)",
        render: (row) => (
          <div>
            {row.has_finished_batch ? (
              row.batch_list && row.batch_list.length > 1 ? (
                <div className="flex flex-col gap-1 items-start py-0.5">
                  {row.batch_list.map((b, bIdx) => (
                    <span
                      key={bIdx}
                      className="inline-block px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded shadow-2xs whitespace-nowrap"
                    >
                      {b.batch_no} - {b.qty} Nos.
                    </span>
                  ))}
                </div>
              ) : (
                <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded shadow-2xs">
                  {row.id_no}
                </span>
              )
            ) : (
              <span className="text-slate-400 font-mono text-xs">—</span>
            )}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(row.status)}`}>
            {row.status}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Export",
        sortable: false,
        render: (row) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => {
                setSelectedWOForDownload(row.workOrderRef);
                setExportFormat("excel");
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title={`Export Excel for ${row.formatted_wo_no}`}
            >
              <i className="fa-solid fa-file-excel"></i>
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedWOForDownload(row.workOrderRef);
                setExportFormat("pdf");
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title={`Export PDF for ${row.formatted_wo_no}`}
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>PDF</span>
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
      <Navbar title="Work Order Reports" />

      <main className="flex-1 flex flex-col w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <DataTable
          tableId="work_order_reports"
          title="Work Order Reports"
          data={flattenedData}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search by WO #, Client, Mat Code, Description, Batch #..."
          actionButton={
            <button
              onClick={fetchReports}
              disabled={loading}
              className="h-10 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh Reports"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? "fa-spin" : ""}`}></i>
              <span>Refresh</span>
            </button>
          }
        />
      </main>

      {/* Terms & Conditions Selection Modal */}
      <TermsSelectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedWOForDownload(null);
        }}
        workOrder={selectedWOForDownload}
        initialFormat={exportFormat}
      />
    </div>
  );
}
