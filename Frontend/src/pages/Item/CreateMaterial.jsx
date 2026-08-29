import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { createMaterial, updateMaterial, getMaterialById } from "../../api/materialApi";
import { getMaterialGroups } from "../../api/materialGroupApi";
import { getMaterialTypes } from "../../api/materialTypeApi";
import { getUnits } from "../../api/unitApi";
import toast from "react-hot-toast";


const emptyForm = {
  materialCode: "",
  code: "",
  materialName: "",
  unitId: "",
  hsnCode: "",
  materialGroupId: "",
  materialType: "",
  gstPercent: "",
  selfVal: "",
  purchaseVal: "",
  unitWeight: "",
  details: "",
  remarks: "",
};

export default function CreateMaterial() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = Boolean(editId);

  const [form, setForm] = useState(emptyForm);
  const [groups, setGroups] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load dropdowns + existing material (edit mode) ─────────────
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Fetch dropdowns
        const [groupRes, unitRes, typeRes] = await Promise.all([
          getMaterialGroups(),
          getUnits(),
          getMaterialTypes(),
        ]);
        setGroups(groupRes.data?.data || []);
        setUnits(unitRes.data?.data || []);
        setMaterialTypes(typeRes.data?.data || []);

        // Fetch material details if in edit mode
        if (isEditMode) {
          const res = await getMaterialById(editId);
          const mat = res.data.data;
          if (mat) {
            setForm({
              materialCode: mat.material_code || "",
              code: mat.code || "",
              materialName: mat.material_name || "",
              unitId: mat.unit_id ? String(mat.unit_id) : "",
              hsnCode: mat.hsn_code || "",
              materialGroupId: mat.material_group_id ? String(mat.material_group_id) : "",
              materialType: mat.material_type || "",
              gstPercent: mat.gst_percent || "",
              selfVal: mat.self_val !== null && mat.self_val !== undefined ? String(mat.self_val) : "",
              purchaseVal: mat.purchase_val !== null && mat.purchase_val !== undefined ? String(mat.purchase_val) : "",
              unitWeight: mat.unit_weight !== null && mat.unit_weight !== undefined ? String(mat.unit_weight) : "",
              details: mat.details || "",
              remarks: mat.remarks || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to load page data", err);
        toast.error("Unable to load page data.");
        if (isEditMode) {
          navigate("/admin/materials");
        }
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [editId, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.materialCode.trim()) {
      toast.error("Material code is required.");
      return;
    }
    if (!form.materialName.trim()) {
      toast.error("Material name is required.");
      return;
    }

    if (!form.code || !form.code.trim()) {
      toast.error("3-digit Code is required.");
      return;
    }
    if (!/^\d{3}$/.test(form.code.trim())) {
      toast.error("Code must be exactly 3 numeric digits.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        materialCode: form.materialCode.trim(),
        code: form.code ? form.code.trim() : null,
        materialName: form.materialName.trim(),
        unitId: form.unitId ? Number(form.unitId) : null,
        hsnCode: form.hsnCode.trim() || null,
        materialGroupId: form.materialGroupId ? Number(form.materialGroupId) : null,
        materialType: form.materialType || null,
        gstPercent: form.gstPercent.trim() || null,
        selfVal: form.selfVal !== "" ? Number(form.selfVal) : null,
        purchaseVal: form.purchaseVal !== "" ? Number(form.purchaseVal) : null,
        unitWeight: form.unitWeight !== "" ? Number(form.unitWeight) : null,
        details: form.details.trim() || null,
        remarks: form.remarks.trim() || null,
      };

      if (isEditMode) {
        await updateMaterial(editId, payload);
        toast.success("Material updated successfully");
      } else {
        await createMaterial(payload);
        toast.success(`Material '${payload.materialCode}' created successfully`);
      }

      setTimeout(() => navigate("/admin/materials"), 800);
    } catch (err) {
      console.error("Failed to save material", err);
      toast.error(err?.response?.data?.message || "Unable to save material. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors text-slate-800 bg-white";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1";

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 font-sans text-slate-900">
        <Navbar title="ERP Admin" />
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          Loading page data...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 font-sans text-slate-900">
      <Navbar title="ERP Admin" />

      <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8 ">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditMode ? "Edit Material" : "Create Material"}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              {isEditMode
                ? "Update the material details below."
                : "Fill in the details to add a new material master entry."}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/materials")}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Material List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Material Code */}
              <div>
                <label className={labelCls}>
                  Material Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="materialCode"
                  value={form.materialCode}
                  onChange={handleChange}
                  placeholder="e.g. MAT-001"
                  className={inputCls}
                  autoFocus
                />
              </div>

              {/* 3-Digit Code */}
              <div>
                <label className={labelCls}>
                  Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. 042"
                  maxLength={3}
                  pattern="\d{3}"
                  className={inputCls}
                  required
                />
              </div>

              {/* Material Name */}
              <div>
                <label className={labelCls}>
                  Material Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="materialName"
                  value={form.materialName}
                  onChange={handleChange}
                  placeholder="Enter material name"
                  className={inputCls}
                />
              </div>

              {/* Unit */}
              <div>
                <label className={labelCls}>Unit</label>
                <select
                  name="unitId"
                  value={form.unitId}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">— Select Unit —</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* HSN Code */}
              <div>
                <label className={labelCls}>HSN Code</label>
                <input
                  type="text"
                  name="hsnCode"
                  value={form.hsnCode}
                  onChange={handleChange}
                  placeholder="Enter HSN code"
                  className={inputCls}
                />
              </div>

              {/* Material Group */}
              <div>
                <label className={labelCls}>Material Group</label>
                <select
                  name="materialGroupId"
                  value={form.materialGroupId}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">— Select Material Group —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.material_group_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material Type */}
              <div>
                <label className={labelCls}>Material Type</label>
                <select
                  name="materialType"
                  value={form.materialType}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">— Select Material Type —</option>
                  {materialTypes.map((t) => (
                    <option key={t.id} value={t.material_type_name}>
                      {t.material_type_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Moulds Selection (Conditional) */}


              {/* GST % */}
              <div>
                <label className={labelCls}>GST %</label>
                <input
                  type="number"
                  step="0.01"
                  name="gstPercent"
                  value={form.gstPercent}
                  onChange={handleChange}
                  placeholder="e.g. 18"
                  className={inputCls}
                />
              </div>

              {/* Self Val */}
              <div>
                <label className={labelCls}>Self Val</label>
                <input
                  type="number"
                  step="0.01"
                  name="selfVal"
                  value={form.selfVal}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              {/* Purchase Val */}
              <div>
                <label className={labelCls}>Purchase Val</label>
                <input
                  type="number"
                  step="0.01"
                  name="purchaseVal"
                  value={form.purchaseVal}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              {/* Unit Weight */}
              <div>
                <label className={labelCls}>Unit Weight</label>
                <input
                  type="number"
                  step="0.0001"
                  name="unitWeight"
                  value={form.unitWeight}
                  onChange={handleChange}
                  placeholder="0.0000"
                  className={inputCls}
                />
              </div>

              {/* Details — full width */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Details</label>
                <textarea
                  name="details"
                  value={form.details}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter details..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Remarks — full width */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Remarks</label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter remarks..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate("/admin/materials")}
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
              >
                {saving ? "Saving..." : isEditMode ? "Update Material" : "Create Material"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
