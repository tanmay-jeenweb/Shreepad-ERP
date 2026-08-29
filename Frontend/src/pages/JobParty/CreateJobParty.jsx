import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import {
  createJobParty,
  updateJobParty,
  getJobPartyById,
} from "../../api/jobPartyApi";
import { getJobPartyTypes } from "../../api/jobPartyTypeApi";
import toast from "react-hot-toast";

const emptyForm = {
  partyName: "",
  jobPartyTypeId: "",
  remark: "",
};

export default function CreateJobParty() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // ── Load dropdowns + job party details if in edit mode ────────
  useEffect(() => {
    const fetchJobPartyTypes = async () => {
      try {
        const res = await getJobPartyTypes();
        setTypes(res.data.data || []);
      } catch (err) {
        console.error("Failed to load job party types dropdown data", err);
        toast.error("Unable to load job party types dropdown.");
      }
    };

    const fetchJobParty = async () => {
      try {
        const res = await getJobPartyById(id);
        const jp = res.data.data;
        if (jp) {
          setForm({
            partyName: jp.party_name || "",
            jobPartyTypeId: jp.job_party_type_id ? String(jp.job_party_type_id) : "",
            remark: jp.remark || "",
          });
        }
      } catch (err) {
        console.error("Failed to load job party details", err);
        toast.error("Unable to load job party details.");
        navigate("/admin/job-parties");
      } finally {
        setLoading(false);
      }
    };

    fetchJobPartyTypes();
    if (isEditMode) fetchJobParty();
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.partyName.trim()) {
      toast.error("Party Name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        partyName: form.partyName.trim(),
        jobPartyTypeId: form.jobPartyTypeId ? Number(form.jobPartyTypeId) : null,
        remark: form.remark.trim() || null,
      };

      if (isEditMode) {
        await updateJobParty(id, payload);
        toast.success("Job party updated successfully");
      } else {
        await createJobParty(payload);
        toast.success(`Job party '${payload.partyName}' created successfully`);
      }
      navigate("/admin/job-parties");
    } catch (err) {
      console.error("Failed to save job party", err);
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || "Unable to save job party. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-sm bg-slate-50 transition-colors font-semibold";
  const labelCls = "block text-sm font-semibold text-slate-700 mb-2";

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 h-screen overflow-hidden">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditMode ? "Edit Job Party" : "Create Job Party"}
            </h1>
            <p className="text-slate-500 mt-1">
              {isEditMode ? "Update configuration for this job party." : "Add a new job party to the system."}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/job-parties")}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Job Party List
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#369ACF]" />
          </div>
        ) : (
          <div className="w-full pb-20">
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800">Job Party Details</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Party Name */}
                  <div className="space-y-1">
                    <label className={labelCls}>
                      Party Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="partyName"
                      value={form.partyName}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="Enter party name"
                      required
                      autoFocus={!isEditMode}
                    />
                  </div>

                  {/* Job Party Type Dropdown */}
                  <div className="space-y-1">
                    <label className={labelCls}>Job Party Type</label>
                    <select
                      name="jobPartyTypeId"
                      value={form.jobPartyTypeId}
                      onChange={handleChange}
                      className={inputCls}
                    >
                      <option value="">— Select Type —</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.job_party_type_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remark */}
                <div className="space-y-1">
                  <label className={labelCls}>Remark</label>
                  <textarea
                    name="remark"
                    value={form.remark}
                    onChange={handleChange}
                    rows={4}
                    className={`${inputCls} resize-none`}
                    placeholder="Enter additional remarks..."
                  />
                </div>

                {/* Form Actions */}
                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/job-parties")}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
                  >
                    {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Job Party"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
