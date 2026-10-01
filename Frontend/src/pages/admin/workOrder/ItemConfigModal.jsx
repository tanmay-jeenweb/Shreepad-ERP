import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import DateInput from "../../../components/DateInput";

export default function ItemConfigModal({
  isOpen,
  onClose,
  itemIndex,
  item,
  onSave,
  disabled = false
}) {
  const [formData, setFormData] = useState(null);

  const [newBatchInput, setNewBatchInput] = useState("");

  useEffect(() => {
    if (isOpen && item) {
      const cloned = JSON.parse(JSON.stringify(item));
      const prodQty = Number(cloned.production_quantity) || Number(cloned.quantity) || 1;
      cloned.production_quantity = prodQty;
      if (!Array.isArray(cloned.batches)) {
        cloned.batches = cloned.batch_no ? String(cloned.batch_no).split(',').map(s => s.trim()).filter(Boolean) : [];
      }
      if (cloned.rawMaterials) {
        cloned.rawMaterials = cloned.rawMaterials.map(rm => {
          const req = Number((Number(rm.bomQty) * prodQty).toFixed(3));
          const avail = Number(rm.availableStock) || 0;
          const calcMin = Math.max(0, Number((req - avail).toFixed(3)));
          return {
            ...rm,
            productionAmount: req,
            calculatedMinSupply: calcMin,
            minSupplyNeeded: (rm.minSupplyNeeded !== undefined && rm.minSupplyNeeded !== "" && !isNaN(Number(rm.minSupplyNeeded)))
              ? rm.minSupplyNeeded
              : calcMin
          };
        });
      }
      setFormData(cloned);
      setNewBatchInput("");
    }
  }, [isOpen, item]);

  if (!isOpen || !formData) return null;

  const handleAddBatch = () => {
    const val = newBatchInput.trim();
    if (!val) return;
    const currentBatches = formData?.batches || [];
    if (currentBatches.includes(val)) {
      toast.error(`Batch "${val}" is already added.`);
      return;
    }
    const maxAllowed = Number(formData?.production_quantity || formData?.quantity) || 1;
    if (currentBatches.length >= maxAllowed) {
      toast.error(`Maximum batch count reached (${maxAllowed} for this item's quantity).`);
      return;
    }
    const updatedBatches = [...currentBatches, val];
    setFormData(prev => ({
      ...prev,
      batches: updatedBatches,
      batch_no: updatedBatches.join(', ')
    }));
    setNewBatchInput("");
  };

  const handleRemoveBatch = (index) => {
    const updatedBatches = (formData?.batches || []).filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      batches: updatedBatches,
      batch_no: updatedBatches.join(', ')
    }));
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      if (!prev) return prev;
      const next = { ...prev, [field]: value };

      if (field === "quantity" || field === "production_quantity") {
        if (field === "quantity" && (!next.production_quantity || Number(next.production_quantity) === Number(prev.quantity))) {
          next.production_quantity = value;
        }
        const currentProdQty = Number(next.production_quantity) || 0;
        if (next.rawMaterials) {
          next.rawMaterials = next.rawMaterials.map(rm => {
            const req = Number((Number(rm.bomQty) * currentProdQty).toFixed(3));
            const avail = Number(rm.availableStock) || 0;
            const calcMin = Math.max(0, Number((req - avail).toFixed(3)));
            return {
              ...rm,
              productionAmount: req,
              calculatedMinSupply: calcMin,
              minSupplyNeeded: (rm.minSupplyNeeded !== undefined && rm.minSupplyNeeded !== "" && !isNaN(Number(rm.minSupplyNeeded)))
                ? rm.minSupplyNeeded
                : calcMin
            };
          });
        }
      }
      return next;
    });
  };

  const handleRMSupplyChange = (rmIdx, val) => {
    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;
    setFormData(prev => {
      if (!prev) return prev;
      const nextRMs = [...(prev.rawMaterials || [])];
      nextRMs[rmIdx] = {
        ...nextRMs[rmIdx],
        minSupplyNeeded: val
      };
      return { ...prev, rawMaterials: nextRMs };
    });
  };

  const handleRMSupplyBlur = (rmIdx, calculatedMinSupply) => {
    const minVal = Number(calculatedMinSupply) || 0;
    setFormData(prev => {
      if (!prev) return prev;
      const nextRMs = [...(prev.rawMaterials || [])];
      const rawVal = nextRMs[rmIdx]?.minSupplyNeeded;
      const currentVal = Number(rawVal);
      if (rawVal === "" || isNaN(currentVal) || currentVal < 0) {
        nextRMs[rmIdx] = {
          ...nextRMs[rmIdx],
          minSupplyNeeded: 0
        };
      } else {
        nextRMs[rmIdx] = {
          ...nextRMs[rmIdx],
          minSupplyNeeded: currentVal
        };
        if (currentVal < minVal) {
          toast(
            `Notice: Entered supply is less than available quantity shortfall (${minVal}).`,
            { icon: "⚠️" }
          );
        }
      }
      return { ...prev, rawMaterials: nextRMs };
    });
  };

  const handleSave = () => {
    if (!formData) return;
    if (Number(formData.quantity) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (Number(formData.production_quantity) <= 0) {
      toast.error("Production Quantity must be greater than 0");
      return;
    }
    const maxAllowed = Number(formData.production_quantity || formData.quantity) || 1;
    if ((formData.batches?.length || 0) > maxAllowed) {
      toast.error(`Maximum batch count reached (${maxAllowed} for this item).`);
      return;
    }
    onSave(formData);
  };

  const hasShortfall = formData.rawMaterials?.some(
    rm => (Number(rm.minSupplyNeeded) || 0) < rm.calculatedMinSupply || rm.availableStock < rm.productionAmount
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-200 text-[#369ACF] flex items-center justify-center shadow-xs">
              <i className="fa-solid fa-gear text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                  Item #{itemIndex + 1}
                </span>
                <h3 className="text-base font-bold text-slate-800">
                  {formData.material_name || "Material Configuration"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formData.material_code ? `Code: ${formData.material_code}` : "Configure item details and review raw materials allocation"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer transition-colors p-1"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Production Details */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-sliders text-[#369ACF]"></i>
              Production Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Order Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.quantity}
                  onChange={(e) => handleFieldChange("quantity", e.target.value)}
                  disabled={disabled}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Production Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.production_quantity}
                  onChange={(e) => handleFieldChange("production_quantity", e.target.value)}
                  disabled={disabled}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm font-semibold text-indigo-600 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Exp. Delivery Date
                </label>
                <DateInput
                  value={formData.exp_delivery_date}
                  onChange={(e) => handleFieldChange("exp_delivery_date", e.target.value)}
                  disabled={disabled}
                />
              </div>


              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Remarks
                </label>
                <input
                  type="text"
                  placeholder="Enter remarks"
                  value={formData.remarks || ""}
                  onChange={(e) => handleFieldChange("remarks", e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Item Batch Numbers Section */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-tags text-[#369ACF]"></i>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Batch Numbers for this Item
                </h4>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                (formData.batches?.length || 0) > (Number(formData.production_quantity || formData.quantity) || 1)
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : (formData.batches?.length || 0) === (Number(formData.production_quantity || formData.quantity) || 1)
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                {formData.batches?.length || 0} / {Number(formData.production_quantity || formData.quantity) || 1} Max Batches
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Assign batch numbers specific to this item. In production, only these batch numbers will be prompted when moving to Finished Goods.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter batch number and click Add or press Enter (e.g. BATCH-001)"
                value={newBatchInput}
                onChange={(e) => setNewBatchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddBatch();
                  }
                }}
                disabled={disabled || (formData.batches?.length || 0) >= (Number(formData.production_quantity || formData.quantity) || 1)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                type="button"
                onClick={handleAddBatch}
                disabled={disabled || !newBatchInput.trim() || (formData.batches?.length || 0) >= (Number(formData.production_quantity || formData.quantity) || 1)}
                className="px-4 py-2 bg-[#369ACF] hover:bg-[#2b82b0] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                <i className="fa-solid fa-plus text-[10px]"></i>
                <span>Add Batch</span>
              </button>
            </div>

            {formData.batches && formData.batches.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50/70 border border-slate-200 rounded-xl">
                {formData.batches.map((batch, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 shadow-2xs group"
                  >
                    <i className="fa-solid fa-tag text-[9px] text-[#369ACF]"></i>
                    <span>{batch}</span>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBatch(idx)}
                        className="text-slate-400 hover:text-rose-500 transition cursor-pointer ml-0.5"
                        title="Remove batch"
                      >
                        <i className="fa-solid fa-xmark text-[11px]"></i>
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                No batch numbers added yet for this item. You can add up to {Number(formData.production_quantity || formData.quantity) || 1} batch number(s).
              </p>
            )}
          </div>

          {/* Raw Materials Allocation Section for this item */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-[#369ACF]"></i>
                  Raw Materials Allocation Check
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stock availability and minimum supply needed for {formData.material_name}.
                </p>
              </div>
            </div>

            {hasShortfall && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-800 text-xs">
                <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 text-sm shrink-0"></i>
                <div>
                  <span className="font-semibold">Notice:</span> Available quantity in system is less than the required production quantity. You can adjust the minimum supply needed to be made.
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs bg-white">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Raw Material Name</th>
                    <th className="px-4 py-3 text-right">Available Stock</th>
                    <th className="px-4 py-3 text-right">RM req. for 1 Unit</th>
                    <th className="px-4 py-3 text-right">RM req. for Prod Qty</th>
                    <th className="px-4 py-3 text-right">Min Supply Needed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {formData.rawMaterials && formData.rawMaterials.length > 0 ? (
                    formData.rawMaterials.map((rm, rmIdx) => {
                      const prodQty = Number(formData.production_quantity) || 0;
                      const bomQty = Number(rm.bomQty) || 0;
                      const requiredProdQty = Number((bomQty * prodQty).toFixed(3));
                      const availableStock = Number(rm.availableStock) || 0;
                      const calculatedMinSupply = Math.max(0, Number((requiredProdQty - availableStock).toFixed(3)));
                      const isShortfall = (Number(rm.minSupplyNeeded) || 0) < calculatedMinSupply;

                      return (
                        <tr key={rmIdx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{rm.materialName}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {rm.materialCode || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
                            {availableStock.toFixed(3)} {rm.unitName || "kg"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
                            {bomQty.toFixed(4)} {rm.unitName || "kg"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-700 text-xs">
                            {requiredProdQty.toFixed(3)} {rm.unitName || "kg"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="text"
                                  value={rm.minSupplyNeeded !== undefined ? rm.minSupplyNeeded : calculatedMinSupply}
                                  onChange={(e) => handleRMSupplyChange(rmIdx, e.target.value)}
                                  onBlur={() => handleRMSupplyBlur(rmIdx, calculatedMinSupply)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleRMSupplyBlur(rmIdx, calculatedMinSupply);
                                    }
                                  }}
                                  placeholder={String(calculatedMinSupply)}
                                  className={`w-28 px-2.5 py-1 text-right text-xs font-mono font-semibold border rounded-lg focus:outline-none transition-colors bg-white ${
                                    isShortfall
                                      ? "border-amber-400 text-amber-900 focus:border-amber-500"
                                      : "border-slate-200 text-slate-800 focus:border-indigo-500"
                                  }`}
                                />
                                <span className="text-[11px] text-slate-400 font-mono w-6 text-left shrink-0">
                                  {rm.unitName || "kg"}
                                </span>
                              </div>
                              {isShortfall && (
                                <span className="text-[10px] text-amber-600 font-medium">
                                  Shortfall: {calculatedMinSupply} {rm.unitName || "kg"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-400 italic">
                        No raw materials configured in BOM for this item.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-check text-xs"></i>
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
