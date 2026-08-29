import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import {
  createOperator,
  updateOperator,
  getOperatorById,
} from "../../api/operatorApi";
import { getOperatorTypes } from "../../api/operatorTypeApi";
import toast from "react-hot-toast";
import DateInput from "../../components/DateInput";

const emptyForm = {
  operatorCode: "",
  operatorName: "",
  dateOfJoining: "",
  operatorTypeId: "",
  information: "",
};

export default function CreateOperator() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // ── Load dropdowns + operator details if in edit mode ─────────────
  useEffect(() => {
    const fetchOperatorTypes = async () => {
      try {
        const res = await getOperatorTypes();
        setTypes(res.data.data || []);
      } catch (err) {
        console.error("Failed to load operator types dropdown data", err);
        toast.error("Unable to load operator types.");
      }
    };

    const fetchOperator = async () => {
      try {
        const res = await getOperatorById(id);
        const op = res.data.data;
        if (op) {
          let formattedDate = "";
          if (op.date_of_joining) {
            formattedDate = new Date(op.date_of_joining).toISOString().split("T")[0];
          }

          setForm({
            operatorCode: op.operator_code || "",
            operatorName: op.operator_name || "",
            dateOfJoining: formattedDate,
            operatorTypeId: op.operator_type_id ? String(op.operator_type_id) : "",
            information: op.information || "",
          });
        }
      } catch (err) {
        console.error("Failed to load operator details", err);
        toast.error("Unable to load operator details.");
        navigate("/admin/operators");
      } finally {
        setLoading(false);
      }
    };

    fetchOperatorTypes();
    if (isEditMode) fetchOperator();
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.operatorCode.trim()) {
      toast.error("Operator code is required.");
      return;
    }
    if (!form.operatorName.trim()) {
      toast.error("Operator name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        operatorCode: form.operatorCode.trim(),
        operatorName: form.operatorName.trim(),
        dateOfJoining: form.dateOfJoining || null,
        operatorTypeId: form.operatorTypeId ? Number(form.operatorTypeId) : null,
        information: form.information.trim() || null,
      };

      if (isEditMode) {
        await updateOperator(id, payload);
        toast.success("Operator updated successfully");
      } else {
        await createOperator(payload);
        toast.success(`Operator '${payload.operatorCode}' created successfully`);
      }
      navigate("/admin/operators");
    } catch (err) {
      console.error("Failed to save operator", err);
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || "Unable to save operator. Please try again.");
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
              {isEditMode ? "Edit Operator" : "Create Operator"}
            </h1>
            <p className="text-slate-500 mt-1">
              {isEditMode ? "Update configuration for this operator." : "Add a new operator to the system."}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/operators")}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-1 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Operator List
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
                <h2 className="text-lg font-semibold text-slate-800">Operator Details</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Code */}
                  <div className="space-y-1">
                    <label className={labelCls}>
                      Operator Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="operatorCode"
                      value={form.operatorCode}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="e.g. OP001"
                      required
                      autoFocus={!isEditMode}
                    />
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <label className={labelCls}>
                      Operator Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="operatorName"
                      value={form.operatorName}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date of Joining */}
                  <div className="space-y-1">
                    <label className={labelCls}>Date of Joining</label>
                    <DateInput
                      name="dateJoining"
                      value={form.dateOfJoining}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, dateOfJoining: e.target.value }))
                      }
                    />
                  </div>

                  {/* Operator Type */}
                  <div className="space-y-1">
                    <label className={labelCls}>Operator Type</label>
                    <select
                      name="operatorTypeId"
                      value={form.operatorTypeId}
                      onChange={handleChange}
                      className={inputCls}
                    >
                      <option value="">— Select Type —</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.operator_type_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Information */}
                <div className="space-y-1">
                  <label className={labelCls}>Information</label>
                  <textarea
                    name="information"
                    value={form.information}
                    onChange={handleChange}
                    rows={4}
                    className={`${inputCls} resize-none`}
                    placeholder="Enter additional remarks or details..."
                  />
                </div>

                {/* Form Actions */}
                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/operators")}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#369ACF] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-[#2583b4] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-400 shadow-sm cursor-pointer"
                  >
                    {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Operator"}
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
