import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getJobParties, deleteJobParty } from "../../api/jobPartyApi";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionContext";

export default function JobPartyMaster() {
  const navigate = useNavigate();
  const [jobParties, setJobParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { hasPermission } = usePermission();

  // ── Data loaders ───────────────────────────────────────────────
  const loadJobParties = async () => {
    setLoading(true);
    try {
      const res = await getJobParties();
      setJobParties(res.data.data || []);
    } catch (err) {
      console.error("Failed to load job parties", err);
      toast.error("Unable to load job parties. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobParties();
  }, []);

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job party?")) return;

    setSaving(true);
    try {
      await deleteJobParty(id);
      toast.success("Job party deleted successfully");
      await loadJobParties();
    } catch (err) {
      console.error("Failed to delete job party", err);
      toast.error(err?.response?.data?.message || "Unable to delete job party.");
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ───────────────────────────────────────────────────
  const columns = useMemo(() => {
    const canUpdate = hasPermission("job_party", "update");
    const canDelete = hasPermission("job_party", "delete");

    const cols = [
      {
        key: "id",
        label: "ID",
        minWidth: "60px",
      },
      {
        key: "party_name",
        label: "Party Name",
        minWidth: "200px",
        render: (row) => (
          <span className="font-semibold text-blue-900">{row.party_name}</span>
        ),
      },
      {
        key: "job_party_type_name",
        label: "Job Party Type",
        minWidth: "180px",
        render: (row) =>
          row.job_party_type_name ? (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#369ACF] border border-[#bcccdc]">
              {row.job_party_type_name}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
      {
        key: "remark",
        label: "Remark",
        minWidth: "250px",
        render: (row) =>
          row.remark ? (
            <span className="text-slate-600 text-sm" title={row.remark}>
              {row.remark.length > 60 ? row.remark.slice(0, 60) + "…" : row.remark}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">—</span>
          ),
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        key: "actions",
        label: "Actions",
        sortable: false,
        minWidth: "120px",
        render: (row) => (
          <div className="flex items-center gap-2">
            {canUpdate && (
              <button
                onClick={() => navigate(`/admin/job-parties/edit/${row.id}`)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bcccdc] bg-[#f0f4f8] text-[#369ACF] hover:bg-[#e6ebf0] cursor-pointer"
                title="Edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(row.id)}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                </svg>
              </button>
            )}
          </div>
        ),
      });
    }

    return cols;
  }, [hasPermission, saving, navigate]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <DataTable
          tableId="job_party_master"
          title="Job of Party Master"
          data={jobParties}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search job parties..."
          actionButton={
            hasPermission("job_party", "write") ? (
              <button
                onClick={() => navigate("/admin/job-parties/create")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#369ACF] text-white hover:bg-[#2583b4] transition-colors cursor-pointer shadow-sm hover:shadow"
                title="Add Job Party"
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
            ) : null
          }
        />
      </main>
    </div>
  );
}
