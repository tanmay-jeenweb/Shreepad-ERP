import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { createMaterial, updateMaterial, getMaterialById } from "../../api/materialApi";
import { getMaterialGroups } from "../../api/materialGroupApi";
import { getMaterialTypes } from "../../api/materialTypeApi";
import { getItems } from "../../api/itemApi";
import { getClasses } from "../../api/classApi";
import { getSizes } from "../../api/sizeApi";
import { getUnits } from "../../api/unitApi";
import toast from "react-hot-toast";


const DEFAULT_PREFIXES = {
  "Finished Goods": "FG",
  "Semi Finished Goods": "SFG",
  "Raw Materials": "RM",
  "Store Consumed": "SC",
  "Packaging Material": "PM",
  "Waste and scrap": "WS",
  "Capital Equipment": "CE",
  "Assembly Item": "AI",
  "Uniform and other Item": "UI",
  "Service": "SRV",
  "Other": "OTH",
};

const emptyForm = {
  materialCode: "",
  materialName: "",
  unitId: "",
  ptsCode: "",
  materialGroup: "",
  materialType: "",
  item: "",
  className: "",
  size: "",
  prefix: "",
  details: "",
  remarks: "",
};

export default function CreateMaterial() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = Boolean(editId);

  const [form, setForm] = useState(emptyForm);
  const [materialGroups, setMaterialGroups] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [units, setUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load dropdowns + existing material (edit mode) ─────────────
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Fetch all dropdowns
        const [unitRes, groupRes, typeRes, itemRes, classRes, sizeRes] = await Promise.all([
          getUnits(),
          getMaterialGroups(),
          getMaterialTypes(),
          getItems(),
          getClasses(),
          getSizes(),
        ]);
        setUnits(unitRes.data?.data || []);
        setMaterialGroups(groupRes.data?.data || []);
        setMaterialTypes(typeRes.data?.data || []);
        setItems(itemRes.data?.data || []);
        setClasses(classRes.data?.data || []);
        setSizes(sizeRes.data?.data || []);

        // Fetch material details if in edit mode
        if (isEditMode) {
          const res = await getMaterialById(editId);
          const mat = res.data.data;
          if (mat) {
            const currentGroup = mat.material_group || "";
            const currentType = mat.material_type || "";
            const currentItem = mat.item || "";
            const currentClass = mat.class || mat.class_name || "";
            const currentSize = mat.size || "";
            setForm({
              materialCode: mat.material_code || "",
              materialName: mat.material_name || "",
              unitId: mat.unit_id ? String(mat.unit_id) : "",
              ptsCode: mat.pts_code || mat.pst_code || mat.hsn_code || "",
              materialGroup: currentGroup,
              materialType: currentType,
              item: currentItem,
              className: currentClass,
              size: currentSize,
              prefix: mat.prefix || (currentGroup ? DEFAULT_PREFIXES[currentGroup] || "" : ""),
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
    if (name === "materialGroup") {
      setForm((prev) => {
        const prevDefault = DEFAULT_PREFIXES[prev.materialGroup] || "";
        const shouldAutoSetPrefix = !prev.prefix || prev.prefix === prevDefault;
        const newPrefix = shouldAutoSetPrefix
          ? (DEFAULT_PREFIXES[value] || "")
          : prev.prefix;
        return {
          ...prev,
          materialGroup: value,
          prefix: newPrefix,
        };
      });
    } else if (name === "prefix") {
      setForm((prev) => ({ ...prev, prefix: value.toUpperCase() }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
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

    if (form.materialGroup && !form.prefix.trim()) {
      toast.error(`${form.materialGroup} Prefix is required.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        materialCode: form.materialCode.trim(),
        prefix: form.prefix ? form.prefix.trim().toUpperCase() : null,
        materialName: form.materialName.trim(),
        unitId: form.unitId ? Number(form.unitId) : null,
        ptsCode: form.ptsCode.trim() || null,
        pstCode: form.ptsCode.trim() || null,
        hsnCode: form.ptsCode.trim() || null,
        materialGroup: form.materialGroup || null,
        materialType: form.materialType || null,
        item: form.item || null,
        className: form.className || null,
        class: form.className || null,
        size: form.size || null,
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

              {/* PTS Code */}
              <div>
                <label className={labelCls}>PTS Code</label>
                <input
                  type="text"
                  name="ptsCode"
                  value={form.ptsCode}
                  onChange={handleChange}
                  placeholder="Enter PTS code"
                  className={inputCls}
                />
              </div>

              {/* Material Group */}
              <div>
                <label className={labelCls}>Material Group</label>
                <select
                  name="materialGroup"
                  value={form.materialGroup}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">— Select Material Group —</option>
                  {materialGroups.map((g) => (
                    <option key={g.id} value={g.material_group_name || g.material_type_name}>
                      {g.material_group_name || g.material_type_name}
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

              {/* Item */}
              <div>
                <label className={labelCls}>Item</label>
                <select
                  name="item"
                  value={form.item}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">— Select Item —</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.item_name}>
                      {i.item_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className={labelCls}>Class</label>
                <select
                  name="className"
                  value={form.className}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">— Select Class —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.class_name}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size */}
              <div>
                <label className={labelCls}>Size</label>
                <select
                  name="size"
                  value={form.size}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">— Select Size —</option>
                  {sizes.map((s) => (
                    <option key={s.id} value={s.size_name}>
                      {s.size_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prefix (Appears when Material Group is selected) */}
              {form.materialGroup && (
                <div>
                  <label className={labelCls}>
                    {form.materialGroup} Prefix <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="prefix"
                    value={form.prefix}
                    onChange={handleChange}
                    placeholder={`e.g. ${DEFAULT_PREFIXES[form.materialGroup] || "FG"}`}
                    maxLength={10}
                    className={`${inputCls} font-mono uppercase`}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Prefix used for internal batch numbers for this material.
                  </p>
                </div>
              )}

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
