import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import {
  createRawMaterial,
  updateRawMaterial,
  getRawMaterialById,
} from "../../api/rawMaterialApi";
import { getMaterials } from "../../api/materialApi";
import toast from "react-hot-toast";

const emptyForm = {
  materialId: "",
  grade: "",
  minimumBalance: "",
  remark: "",
};

export default function CreateRawMaterial() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [materials, setMaterials] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // ── Load dropdowns + raw material details if in edit mode ────────
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await getMaterials();
        // Filter only materials with type "Raw Materials"
        const rawMats = (res.data.data || []).filter(
          (m) => m.material_type === "Raw Materials"
        );
        setMaterials(rawMats);
      } catch (err) {
        console.error("Failed to load materials dropdown data", err);
        toast.error("Unable to load materials.");
      }
    };

    const fetchRawMaterial = async () => {
      try {
        const res = await getRawMaterialById(id);
        const rm = res.data.data;
        if (rm) {
          setForm({
            materialId: rm.material_id ? String(rm.material_id) : "",
            grade: rm.grade || "",
            minimumBalance: rm.minimum_balance !== null && rm.minimum_balance !== undefined ? String(rm.minimum_balance) : "",
            remark: rm.remark || "",
          });
        }
      } catch (err) {
        console.error("Failed to load raw material details", err);
        toast.error("Unable to load raw material details.");
        navigate("/admin/raw-materials");
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
    if (isEditMode) fetchRawMaterial();
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.grade.trim()) {
      toast.error("Grade is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        materialId: form.materialId ? Number(form.materialId) : null,
        grade: form.grade.trim(),
        minimumBalance: form.minimumBalance !== "" ? Number(form.minimumBalance) : 0.00,
        remark: form.remark.trim() || null,
      };

      if (isEditMode) {
        await updateRawMaterial(id, payload);
        toast.success("Raw material updated successfully");
      } else {
        await createRawMaterial(payload);
        toast.success(`Raw material with grade '${payload.grade}' created successfully`);
      }
      navigate("/admin/raw-materials");
    } catch (err) {
      console.error("Failed to save raw material", err);
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || "Unable to save raw material. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#369ACF]/30 focus:border-[#369ACF] text-sm bg-slate-50 transition-colors";
  const labelCls = "block text-sm font-semibold text-slate-700 mb-2";

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 h-screen overflow-hidden">
      <Navbar title="ERP Admin" />

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditMode ? "Edit Raw Material" : "Create Raw Material"}
            </h1>
            <p className="text-slate-500 mt-1">
              {isEditMode ? "Update configuration for this raw material." : "Add a new raw material to the system."}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/raw-materials")}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Raw Material List
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
                <h2 className="text-lg font-semibold text-slate-800">Raw Material Details</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Material */}
                  <div className="space-y-1">
                    <label className={labelCls}>Material (Raw Material)</label>
                    <select
                      name="materialId"
                      value={form.materialId}
                      onChange={handleChange}
                      className={inputCls}
                    >
                      <option value="">— Select Material —</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.material_name} ({m.material_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Grade */}
                  <div className="space-y-1">
                    <label className={labelCls}>
                      Grade <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="grade"
                      value={form.grade}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="e.g. 304"
                      required
                      autoFocus={!isEditMode}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Minimum Balance */}
                  <div className="space-y-1">
                    <label className={labelCls}>Minimum Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      name="minimumBalance"
                      value={form.minimumBalance}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="0.00"
                    />
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
                    onClick={() => navigate("/admin/raw-materials")}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
                  >
                    {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Raw Material"}
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
