import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/Navbar";
import {
  createSubSdReason,
  updateSubSdReason,
  getSubSdReasonById,
} from "../../../api/subSdReasonApi";
import { getAllReasons } from "../../../api/reasonApi";
import { getAllMoulds } from "../../../api/mouldApi";
import toast from "react-hot-toast";

const emptyForm = {
  sub_sd_name: "",
  reason_id: "",
  code: "",
  mould_id: "",
};

export default function CreateSubSdReason() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [reasons, setReasons] = useState([]);
  const [moulds, setMoulds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // ── Load dropdowns + details if in edit mode ────────
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [reasonRes, mouldRes] = await Promise.all([
          getAllReasons(false),
          getAllMoulds(false)
        ]);
        setReasons(reasonRes.data.data || []);
        
        const mouldsList = Array.isArray(mouldRes.data) ? mouldRes.data : mouldRes.data.data || [];
        setMoulds(mouldsList);
      } catch (err) {
        console.error("Failed to load dropdowns", err);
        toast.error("Unable to load dropdown data.");
      }
    };

    const fetchSubSdReason = async () => {
      try {
        const res = await getSubSdReasonById(id);
        const data = res.data.data;
        if (data) {
          setForm({
            sub_sd_name: data.sub_sd_name || "",
            reason_id: data.reason_id ? String(data.reason_id) : "",
            code: data.code || "",
            mould_id: data.mould_id ? String(data.mould_id) : "",
          });
        }
      } catch (err) {
        console.error("Failed to load details", err);
        toast.error("Unable to load sub sd reason details.");
        navigate("/admin/sub-sd-reasons");
      } finally {
        setLoading(false);
      }
    };

    fetchDropdowns();
    if (isEditMode) fetchSubSdReason();
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sub_sd_name.trim() || !form.reason_id || !form.code.trim() || !form.mould_id) {
      toast.error("All fields are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sub_sd_name: form.sub_sd_name.trim(),
        reason_id: Number(form.reason_id),
        code: form.code.trim(),
        mould_id: Number(form.mould_id),
      };

      if (isEditMode) {
        await updateSubSdReason(id, payload);
        toast.success("Sub SD Reason updated successfully");
      } else {
        await createSubSdReason(payload);
        toast.success(`Sub SD Reason created successfully`);
      }
      navigate("/admin/sub-sd-reasons");
    } catch (err) {
      console.error("Failed to save", err);
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || "Unable to save Sub SD Reason. Please try again.");
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
              {isEditMode ? "Edit Sub SD Reason" : "Create Sub SD Reason"}
            </h1>
            <p className="text-slate-500 mt-1">
              {isEditMode ? "Update configuration for this reason." : "Add a new sub sd reason to the system."}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/sub-sd-reasons")}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to List
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
                <h2 className="text-lg font-semibold text-slate-800">Reason Details</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className={labelCls}>
                      Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="sub_sd_name"
                      value={form.sub_sd_name}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="Enter Sub SD reason name"
                      required
                      autoFocus={!isEditMode}
                    />
                  </div>

                  {/* Code */}
                  <div className="space-y-1">
                    <label className={labelCls}>
                      Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="Enter reason code"
                      required
                    />
                  </div>

                  {/* Reason Type Dropdown */}
                  <div className="space-y-1">
                    <label className={labelCls}>
                      Reason Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="reason_id"
                      value={form.reason_id}
                      onChange={handleChange}
                      className={inputCls}
                      required
                    >
                      <option value="">— Select a Reason Type —</option>
                      {reasons.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.reason_type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mould Type Dropdown */}
                  <div className="space-y-1">
                    <label className={labelCls}>
                      Mould Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="mould_id"
                      value={form.mould_id}
                      onChange={handleChange}
                      className={inputCls}
                      required
                    >
                      <option value="">— Select a Mould —</option>
                      {moulds.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.mould_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/sub-sd-reasons")}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
                  >
                    {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Reason"}
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
