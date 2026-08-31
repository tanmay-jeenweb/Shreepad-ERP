import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar";
import { getSettings, saveSettings } from "../../../api/settingMasterApi";
import toast from "react-hot-toast";
import { usePermission } from "../../../context/PermissionContext";

const MATERIAL_TYPES = [
  { key: "prefix_finished_goods", label: "Finished Goods" },
  { key: "prefix_semi_finished_goods", label: "Semi Finished Goods" },
  { key: "prefix_raw_materials", label: "Raw Materials" },
];

export default function SettingMaster() {
  const { hasPermission } = usePermission();
  const canWrite = hasPermission("setting_master", "write");

  const [form, setForm] = useState({
    batch_year: "",
    prefix_finished_goods: "FG",
    prefix_semi_finished_goods: "SFG",
    prefix_raw_materials: "RM",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await getSettings();
        const data = res.data.data;
        if (data) {
          setForm({
            batch_year: data.batch_year || "",
            prefix_finished_goods: data.prefix_finished_goods || "FG",
            prefix_semi_finished_goods: data.prefix_semi_finished_goods || "SFG",
            prefix_raw_materials: data.prefix_raw_materials || "RM",
          });
        }
      } catch (err) {
        console.error("Failed to load settings", err);
        toast.error("Unable to load settings.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setForm((prev) => ({ ...prev, [name]: value }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    try {
      const payload = { ...form };
      const res = await saveSettings(payload);
      toast.success(res.data.message || "Settings saved successfully!");

      if (res.data.data) {
        const data = res.data.data;
        setForm({
          batch_year: data.batch_year || "",
          prefix_finished_goods: data.prefix_finished_goods || "FG",
          prefix_semi_finished_goods: data.prefix_semi_finished_goods || "SFG",
          prefix_raw_materials: data.prefix_raw_materials || "RM",
        });
      }
    } catch (err) {
      console.error("Failed to save settings", err);
      toast.error(err?.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#369ACF] focus:border-[#369ACF] transition-colors text-slate-800 bg-white text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed font-mono uppercase";
  const labelCls = "block text-sm font-semibold text-slate-700 mb-1.5";

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 font-sans text-slate-900">
        <Navbar title="ERP Admin" />
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-semibold">
          Loading settings...
        </div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear().toString().slice(-2);
  const displayYear = form.batch_year || currentYear;

  return (
    <div className="flex-1 bg-slate-50 font-sans text-slate-900 min-h-screen pb-12">
      <Navbar title="ERP Admin" />

      <main className="mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Setting Master</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Configure system-wide settings like internal batch number prefixes.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-full">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Section: Batch Number Year */}
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                Internal Batch Number Settings
              </h2>

              <div className="max-w-xs mb-6">
                <label className={labelCls}>Batch Year Override</label>
                <input
                  type="text"
                  name="batch_year"
                  value={form.batch_year}
                  onChange={handleChange}
                  maxLength={2}
                  disabled={!canWrite}
                  placeholder={`e.g. ${currentYear}`}
                  className={inputCls}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Leave blank to auto-use current year (<span className="font-mono">{currentYear}</span>).
                </p>
              </div>

              {/* Grid of Prefixes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {MATERIAL_TYPES.map((type) => (
                  <div key={type.key}>
                    <label className={labelCls}>{type.label} Prefix</label>
                    <input
                      type="text"
                      name={type.key}
                      value={form[type.key]}
                      onChange={handleChange}
                      maxLength={5}
                      disabled={!canWrite}
                      className={inputCls}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>



            {/* Save button */}
            {canWrite && (
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
